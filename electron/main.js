'use strict'

const { app, BrowserWindow, shell, dialog, session, ipcMain } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const http = require('http')

// 패키징되지 않은 상태(개발/테스트) = true
const isDev = !app.isPackaged
const PORT = process.env.PORT || 3000

// Electron은 항상 로컬 standalone 서버를 실행 (오프라인 시작 보장)
// 온라인 API 호출(Supabase, BizplayPay)은 앱 레이어에서 네트워크 상태에 따라 처리

// --kiosk 플래그로 키오스크 모드 토글
const isKiosk = process.argv.includes('--kiosk')

let mainWindow = null
let nextServerProcess = null

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
  const serverScript = path.join(
    process.resourcesPath,
    'nextjs',
    'server.js'
  )

  // ELECTRON_RUN_AS_NODE=1 로 Electron 내장 Node.js 런타임을 사용
  // 시스템에 Node.js가 설치되지 않아도 서버 기동 가능
  nextServerProcess = spawn(process.execPath, [serverScript], {
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
    setupPermissions()
    await startNextServer()
    createWindow()
    setupAutoUpdater()
  } catch (err) {
    dialog.showErrorBox('BIZPOS 시작 오류', String(err))
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
