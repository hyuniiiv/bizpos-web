'use strict'

const { app, BrowserWindow, shell, dialog, session, ipcMain, protocol } = require('electron')
const path = require('path')
const fs = require('fs')
const Database = require('better-sqlite3')

// 패키징되지 않은 상태(개발/테스트) = true
const isDev = !app.isPackaged

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
  CREATE TABLE IF NOT EXISTS menus (
    id TEXT PRIMARY KEY,
    name TEXT,
    mealType TEXT,
    displayAmount INTEGER,
    paymentAmount INTEGER,
    startTime TEXT,
    endTime TEXT,
    soundFile TEXT,
    isActive INTEGER,
    count INTEGER,
    updated_at INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS pending_menu_changes (
    id TEXT PRIMARY KEY,
    operation TEXT NOT NULL,
    payload TEXT,
    updated_at INTEGER NOT NULL,
    queued_at INTEGER NOT NULL,
    attempts INTEGER DEFAULT 0
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

// ============================================================
// 메뉴 동기화 큐 (오프라인/서버 push 실패 시 재시도 대기열)
// ============================================================
ipcMain.handle('db:queueMenuChange', (event, change) => {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO pending_menu_changes
    (id, operation, payload, updated_at, queued_at, attempts)
    VALUES (?, ?, ?, ?, ?, COALESCE((SELECT attempts FROM pending_menu_changes WHERE id = ?), 0))
  `)
  stmt.run(
    change.id,
    change.operation,
    change.payload ? JSON.stringify(change.payload) : null,
    change.updated_at,
    Date.now(),
    change.id
  )
  return { success: true }
})

ipcMain.handle('db:getPendingMenuChanges', () => {
  const rows = db.prepare('SELECT * FROM pending_menu_changes ORDER BY queued_at ASC').all()
  return rows.map(r => ({
    id: r.id,
    operation: r.operation,
    payload: r.payload ? JSON.parse(r.payload) : null,
    updated_at: r.updated_at,
    queued_at: r.queued_at,
    attempts: r.attempts,
  }))
})

ipcMain.handle('db:clearPendingMenuChange', (event, id) => {
  db.prepare('DELETE FROM pending_menu_changes WHERE id = ?').run(id)
  return { success: true }
})

ipcMain.handle('db:incrementMenuChangeAttempts', (event, id) => {
  db.prepare('UPDATE pending_menu_changes SET attempts = attempts + 1 WHERE id = ?').run(id)
  return { success: true }
})

ipcMain.handle('db:getPendingMenuCount', () => {
  const row = db.prepare('SELECT COUNT(*) as count FROM pending_menu_changes').get()
  return row.count
})

// Electron은 정적 HTML(Next.js static export)을 file:// 프로토콜로 로드
// 온라인 API 호출(Supabase, BizplayPay)은 앱 레이어에서 네트워크 상태에 따라 처리

// --kiosk 플래그로 키오스크 모드 토글
const isKiosk = process.argv.includes('--kiosk')

let mainWindow = null

// ---------------------------------------------------------------------------
// 앱 진입 URL 결정
// - 개발: next dev (http://localhost:3000)
// - 프로덕션: electron-builder가 out/ → resources/nextjs/ 로 복사한 정적 HTML
// ---------------------------------------------------------------------------
function getStartURL() {
  if (isDev) {
    return `http://localhost:3000/pos`
  }
  // 단말기는 항상 /pos 화면으로 시작 (루트 redirect 우회)
  const posPath = path.join(process.resourcesPath, 'nextjs', 'pos', 'index.html')
  if (fs.existsSync(posPath)) {
    return `file://${posPath.replace(/\\/g, '/')}`
  }
  // fallback: root index.html
  const indexPath = path.join(process.resourcesPath, 'nextjs', 'index.html')
  if (!fs.existsSync(indexPath)) {
    throw new Error(`index.html 없음: ${indexPath}`)
  }
  return `file://${indexPath.replace(/\\/g, '/')}`
}

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
// 권한 핸들러 등록 (카메라, 시리얼 포트, USB, HID)
// ---------------------------------------------------------------------------
function setupPermissions() {
  // pos/index.html에서 _next/ 에셋 요청 시 pos/_next/로 해석됨을 _next/로 rewrite
  // 이유: assetPrefix: './' 설정이 서브 경로에서는 상위 _next/를 pos/_next/로 잘못 해석
  if (!isDev) {
    protocol.interceptFileProtocol('file', (request, callback) => {
      let filePath = decodeURIComponent(request.url.replace(/^file:\/\//, '').replace(/\?.*$/, ''))
      // Windows 드라이브 경로 보정 (/C:/... → C:/...)
      if (/^\/[A-Za-z]:\//.test(filePath)) filePath = filePath.slice(1)

      // Rule 1: C:/_next/... → resources/nextjs/_next/...
      const nextMatch = filePath.match(/^[A-Za-z]:\/_next\/(.+)/)
      if (nextMatch) {
        callback(path.join(process.resourcesPath, 'nextjs', '_next', nextMatch[1]))
        return
      }

      // Rule 2: C:/page-path (실제 파일 없음) → resources/nextjs/page-path/index.html
      const pageMatch = filePath.match(/^[A-Za-z]:\/([^.]+?)\/?$/)
      if (pageMatch && !fs.existsSync(filePath)) {
        const candidate = path.join(process.resourcesPath, 'nextjs', pageMatch[1], 'index.html')
        if (fs.existsSync(candidate)) {
          callback(path.normalize(candidate))
          return
        }
      }

      callback(path.normalize(filePath))
    })
  }

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
    autoUpdater.checkForUpdates().catch(err => console.error('[updater] checkForUpdates rejected:', err.message))
    setInterval(() => {
      autoUpdater.checkForUpdates().catch(err => console.error('[updater] checkForUpdates rejected:', err.message))
    }, 4 * 60 * 60 * 1000)
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

  // 개발: next dev URL / 프로덕션: 정적 HTML (file://)
  const appURL = getStartURL()
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
ipcMain.handle('app:relaunch', () => {
  app.relaunch();
  app.exit(0);
});

// 오늘 로그 파일 내용 반환 (base64)
ipcMain.handle('app:getLogContents', async () => {
  try {
    const logDir = path.join(app.getPath('userData'), 'logs')
    const today = new Date().toISOString().slice(0, 10)
    const logFile = path.join(logDir, `main-${today}.log`)
    if (!fs.existsSync(logFile)) return { success: false, error: 'LOG_NOT_FOUND' }
    const buf = fs.readFileSync(logFile)
    return { success: true, base64: buf.toString('base64'), filename: `main-${today}.log`, size: buf.length }
  } catch (err) {
    return { success: false, error: err.message }
  }
});

// 현재 창 스크린샷 (base64 PNG)
ipcMain.handle('app:captureScreenshot', async () => {
  try {
    const win = BrowserWindow.getAllWindows()[0]
    if (!win) return { success: false, error: 'NO_WINDOW' }
    const image = await win.capturePage()
    const buf = image.toPNG()
    return { success: true, base64: buf.toString('base64'), size: buf.length }
  } catch (err) {
    return { success: false, error: err.message }
  }
});

ipcMain.handle('app:quit', () => {
  app.quit()
})

ipcMain.handle('app:checkUpdate', () => {
  try {
    const { autoUpdater } = require('electron-updater')
    autoUpdater.checkForUpdates().catch(err => console.error('[updater] checkForUpdates rejected:', err.message))
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
