'use strict'

const { app, BrowserWindow, shell, dialog, session, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')
const http = require('http')
const net = require('net')
const Database = require('better-sqlite3')

// 패키징되지 않은 상태(개발/테스트) = true
const isDev = !app.isPackaged
let PORT = 3000

// DB 초기화
const dbPath = path.join(app.getPath('userData'), 'bizpos.db')
const db = new Database(dbPath)
db.exec(`
  CREATE TABLE IF NOT EXISTS pending_payments (
    merchantOrderID TEXT PRIMARY KEY,
    totalAmount INTEGER,
    productName TEXT,
    savedAt TEXT,
    synced INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS transactions_local (
    id TEXT PRIMARY KEY,
    merchantOrderID TEXT,
    amount INTEGER,
    status TEXT,
    approvedAt TEXT,
    createdAt TEXT
  );
`)

// IPC 핸들러 (DB CRUD)
ipcMain.handle('db:savePendingPayment', (event, record) => {
  const stmt = db.prepare('INSERT INTO pending_payments (merchantOrderID, totalAmount, productName, savedAt) VALUES (?, ?, ?, ?)')
  stmt.run(record.merchantOrderID, record.totalAmount, record.productName, record.savedAt)
  return { success: true }
})

ipcMain.handle('db:getPendingPayments', () => {
  return db.prepare('SELECT * FROM pending_payments WHERE synced = 0').all()
})

ipcMain.handle('db:markPaymentSynced', (event, merchantOrderID) => {
  db.prepare('UPDATE pending_payments SET synced = 1 WHERE merchantOrderID = ?').run(merchantOrderID)
  return { success: true }
})

ipcMain.handle('db:saveTransaction', (event, tx) => {
  const stmt = db.prepare('INSERT INTO transactions_local (id, merchantOrderID, amount, status, approvedAt, createdAt) VALUES (?, ?, ?, ?, ?, ?)')
  stmt.run(tx.id, tx.merchantOrderID, tx.amount, tx.status, tx.approvedAt, tx.createdAt)
  return { success: true }
})

ipcMain.handle('db:getMenus', () => {
  return db.prepare('SELECT * FROM menus').all()
})

ipcMain.handle('db:saveMenu', (event, menu) => {
  const stmt = db.prepare('INSERT OR REPLACE INTO menus (id, name, mealType, displayAmount, paymentAmount, startTime, endTime, soundFile, isActive, count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
  stmt.run(menu.id, menu.name, menu.mealType, menu.displayAmount, menu.paymentAmount, menu.startTime, menu.endTime, menu.soundFile, menu.isActive ? 1 : 0, menu.count)
  return { success: true }
})

ipcMain.handle('db:deleteMenu', (event, id) => {
  db.prepare('DELETE FROM menus WHERE id = ?').run(id)
  return { success: true }
})

// 동적 포트 할당
async function getAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

// Electron은 항상 로컬 standalone 서버를 실행 (오프라인 시작 보장)
// 온라인 API 호출(Supabase, BizplayPay)은 앱 레이어에서 네트워크 상태에 따라 처리

// --kiosk 플래그로 키오스크 모드 토글
const isKiosk = process.argv.includes('--kiosk')

let mainWindow = null
let nextServerProcess = null

// ---------------------------------------------------------------------------
// 파일 로깅 (패키징된 앱의 콘솔 출력을 파일로 보존)
// 위치: Windows = %APPDATA%/BIZPOS/logs/main-YYYY-MM-DD.log
// ---------------------------------------------------------------------------
let logStream = null
function initLogging() {
  try {
    const logDir = path.join(app.getPath('userData'), 'logs')
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true })
    const today = new Date().toISOString().slice(0, 10)
    const logFile = path.join(logDir, `main-${today}.log`)
    logStream = fs.createWriteStream(logFile, { flags: 'a' })
    const origLog = console.log.bind(console)
    const origErr = console.error.bind(console)
    const origWarn = console.warn.bind(console)
    const fmt = (level, args) =>
      `[${new Date().toISOString()}] [${level}] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')}\n`
    console.log = (...a) => { try { logStream.write(fmt('INFO', a)) } catch {} ; origLog(...a) }
    console.error = (...a) => { try { logStream.write(fmt('ERROR', a)) } catch {} ; origErr(...a) }
    console.warn = (...a) => { try { logStream.write(fmt('WARN', a)) } catch {} ; origWarn(...a) }
    console.log('--- BIZPOS 로그 시작 ---', { version: app.getVersion(), logFile })
  } catch (err) {
    // 로깅 초기화 실패는 앱 실행을 막지 않음
  }
}

// ---------------------------------------------------------------------------
// Next.js 서버 대기 (최대 60초)
// ---------------------------------------------------------------------------
function waitForServer(url, maxRetries = 60) {
  return new Promise((resolve, reject) => {
    let retries = 0
    const check = () => {
      http.get(url, () => resolve())
        .on('error', () => {
          if (++retries >= maxRetries) {
            reject(new Error(`서버 시작 실패: ${url}`))
          } else {
            setTimeout(check, 1000)
          }
        })
    }
    check()
  })
}

// ---------------------------------------------------------------------------
// 프로덕션: Next.js standalone 서버 실행
// ---------------------------------------------------------------------------
async function startNextServer() {
  if (isDev) return // 개발 모드는 next dev가 별도 실행됨

  // electron-builder extraResources 로 복사된 경로
  // Next.js 16 standalone은 package 이름(bizpos-web) 하위에 server.js를 만듦
  // electron-builder.yml에서 평탄화했지만 만일을 위해 양쪽 경로 모두 탐색
  const candidates = [
    path.join(process.resourcesPath, 'nextjs', 'server.js'),
    path.join(process.resourcesPath, 'nextjs', 'bizpos-web', 'server.js'),
  ]
  const serverScript = candidates.find(p => fs.existsSync(p))
  if (!serverScript) {
    throw new Error(`server.js 없음. 탐색 경로:\n${candidates.join('\n')}`)
  }
  console.log('[next] serverScript:', serverScript)

  // ELECTRON_RUN_AS_NODE=1 로 Electron 내장 Node.js 런타임을 사용
  // 시스템에 Node.js가 설치되지 않아도 서버 기동 가능
  // cwd는 server.js와 동일 위치로 — Next.js가 .next/를 상대 경로로 찾음
  nextServerProcess = spawn(process.execPath, [serverScript], {
    cwd: path.dirname(serverScript),
    env: {
      ...process.env,
      PORT: String(PORT),
      NODE_ENV: 'production',
      HOSTNAME: '127.0.0.1',
      ELECTRON_RUN_AS_NODE: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  nextServerProcess.stdout?.on('data', (d) => console.log('[next]', d.toString().trim()))
  nextServerProcess.stderr?.on('data', (d) => console.error('[next]', d.toString().trim()))

  await waitForServer(`http://127.0.0.1:${PORT}`)
}

// ---------------------------------------------------------------------------
// 권한 핸들러 등록 (카메라, 시리얼 포트, USB, HID)
// ---------------------------------------------------------------------------
function setupPermissions() {
  // Vercel 서버(NEXT_PUBLIC_SERVER_URL)로의 cross-origin 결제 API 호출 허용
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const origin = details.responseHeaders?.['access-control-allow-origin']
    if (!origin) {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Access-Control-Allow-Origin': ['*'],
          'Access-Control-Allow-Headers': ['Content-Type, Authorization'],
          'Access-Control-Allow-Methods': ['GET, POST, OPTIONS'],
        },
      })
    } else {
      callback({ responseHeaders: details.responseHeaders })
    }
  })

  session.defaultSession.setPermissionRequestHandler(
    (_webContents, permission, callback) => {
      const allowed = ['media', 'serial', 'usb', 'hid']
      callback(allowed.includes(permission))
    }
  )

  // Web Serial API: 포트 선택 자동 처리
  session.defaultSession.on('select-serial-port', (event, portList, _webContents, callback) => {
    event.preventDefault()
    if (portList.length > 0) {
      callback(portList[0].portId)
    } else {
      callback('')
    }
  })

  session.defaultSession.on('serial-port-added', (_event, _port) => {})
  session.defaultSession.setPermissionCheckHandler(
    (_webContents, permission) => {
      if (permission === 'serial') return true
      return null
    }
  )
}

// ---------------------------------------------------------------------------
// 자동 업데이트 초기화 (프로덕션 전용)
// ---------------------------------------------------------------------------
function setupAutoUpdater() {
  if (isDev) return

  try {
    const { autoUpdater } = require('electron-updater')

    autoUpdater.logger = { info: console.log, warn: console.warn, error: console.error }
    autoUpdater.autoDownload = false

    autoUpdater.on('update-available', (info) => {
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: '업데이트 알림',
        message: `새 버전 ${info.version}이 있습니다. 지금 다운로드하시겠습니까?`,
        detail: `현재 버전: ${app.getVersion()}`,
        buttons: ['다운로드', '나중에'],
      }).then(({ response }) => {
        if (response === 0) autoUpdater.downloadUpdate()
      })
    })

    autoUpdater.on('download-progress', (progress) => {
      const percent = Math.round(progress.percent)
      if (mainWindow) {
        mainWindow.setProgressBar(progress.percent / 100)
        mainWindow.setTitle(`BIZPOS — 업데이트 다운로드 중 ${percent}%`)
      }
    })

    autoUpdater.on('update-downloaded', () => {
      if (mainWindow) {
        mainWindow.setProgressBar(-1)
        mainWindow.setTitle('BIZPOS')
      }
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: '업데이트 준비 완료',
        message: '업데이트가 다운로드되었습니다. 지금 재시작하시겠습니까?',
        detail: '나중에를 선택하면 다음 앱 시작 시 자동 설치됩니다.',
        buttons: ['지금 재시작', '나중에'],
      }).then(({ response }) => {
        if (response === 0) autoUpdater.quitAndInstall()
      })
    })

    autoUpdater.on('update-not-available', () => {
      console.log('[updater] 최신 버전입니다.')
      const win = BrowserWindow.getAllWindows()[0]
      if (win) win.webContents.send('app:noUpdate')
    })

    autoUpdater.on('error', (err) => {
      console.error('[updater] 오류:', err.message)
    })

    // 앱 시작 시 즉시 확인 + 이후 4시간마다 주기적 확인
    autoUpdater.checkForUpdates()
    setInterval(() => autoUpdater.checkForUpdates(), 4 * 60 * 60 * 1000)
  } catch (err) {
    // electron-updater 미설치 환경에서는 무시
    console.warn('[updater] electron-updater를 찾을 수 없습니다:', err.message)
  }
}

// ---------------------------------------------------------------------------
// BrowserWindow 생성
// 7인치 세로형 키오스크 기본 사이즈: 600x1024
// ---------------------------------------------------------------------------
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 600,
    height: 1024,
    minWidth: 600,
    minHeight: 1024,
    fullscreen: true,
    fullscreenable: true,
    kiosk: isKiosk,
    title: 'BIZPOS',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      // nodeIntegration: 시리얼포트 접근을 preload contextBridge를 통해 처리
      // 렌더러에서 직접 require() 금지 (보안)
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
    },
  })

  // 외부 링크는 기본 브라우저에서 열기
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // F12 개발자 도구 토글 (개발 편의, 키오스크 모드에서도 접근 가능)
  mainWindow.webContents.on('before-input-event', (_event, input) => {
    if (input.key === 'F12') {
      if (mainWindow?.webContents.isDevToolsOpened()) {
        mainWindow.webContents.closeDevTools()
      } else {
        mainWindow?.webContents.openDevTools()
      }
    }
  })

  // 개발: next dev URL / 프로덕션: 항상 로컬 standalone 서버
  const appURL = isDev
    ? `http://localhost:${PORT}`
    : `http://127.0.0.1:${PORT}`

  mainWindow.loadURL(appURL)

  if (isDev && !isKiosk) {
    mainWindow.webContents.openDevTools()
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// ---------------------------------------------------------------------------
// 앱 초기화
// ---------------------------------------------------------------------------
app.whenReady().then(async () => {
  try {
    initLogging()
    setupPermissions()
    PORT = isDev ? (process.env.PORT || 3000) : await getAvailablePort()
    await startNextServer()
    createWindow()
    setupAutoUpdater()
  } catch (err) {
    console.error('앱 시작 실패:', err)
    const logDir = path.join(app.getPath('userData'), 'logs')
    dialog.showErrorBox(
      'BIZPOS 시작 오류',
      `${String(err)}\n\n로그 위치: ${logDir}`
    )
    app.quit()
  }
})

app.on('window-all-closed', () => {
  if (nextServerProcess) {
    nextServerProcess.kill()
    nextServerProcess = null
  }
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) createWindow()
})

// ============================================================
// App Control IPC Handlers
// ============================================================
ipcMain.handle('app:quit', () => {
  app.quit()
})

ipcMain.handle('app:checkUpdate', () => {
  try {
    const { autoUpdater } = require('electron-updater')
    autoUpdater.checkForUpdates()
  } catch (err) {
    console.warn('[updater] checkForUpdates 실패:', err.message)
  }
})

ipcMain.handle('app:getVersion', () => app.getVersion())

ipcMain.handle('app:openLogs', () => {
  const logDir = path.join(app.getPath('userData'), 'logs')
  shell.openPath(logDir)
})

// ============================================================
// Serial Port IPC Handlers (경광봉 / 외부 디스플레이 제어)
// ============================================================
let activePort = null;

ipcMain.handle('serial:open', async (event, portName, baudRate = 9600) => {
  try {
    // serialport 패키지가 없으면 graceful 실패
    const { SerialPort } = require('serialport');
    if (activePort && activePort.isOpen) {
      await activePort.close();
    }
    activePort = new SerialPort({ path: portName, baudRate, autoOpen: false });

    activePort.on('data', (data) => {
      const win = BrowserWindow.getAllWindows()[0];
      if (win) win.webContents.send('serial:data', data.toString());
    });

    activePort.on('error', (err) => {
      const win = BrowserWindow.getAllWindows()[0];
      if (win) win.webContents.send('serial:error', err.message);
    });

    await new Promise((resolve, reject) => {
      activePort.open((err) => err ? reject(err) : resolve());
    });
    return { success: true };
  } catch (err) {
    console.error('[Serial] open error:', err.message);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('serial:write', async (event, data) => {
  if (!activePort || !activePort.isOpen) {
    return { success: false, error: 'Port not open' };
  }
  return new Promise((resolve) => {
    activePort.write(data, (err) => {
      resolve(err ? { success: false, error: err.message } : { success: true });
    });
  });
});

ipcMain.handle('serial:close', async () => {
  if (!activePort || !activePort.isOpen) return { success: true };
  return new Promise((resolve) => {
    activePort.close((err) => {
      activePort = null;
      resolve(err ? { success: false, error: err.message } : { success: true });
    });
  });
});
