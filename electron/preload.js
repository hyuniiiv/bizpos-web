'use strict'

const { contextBridge, ipcRenderer } = require('electron')

// ---------------------------------------------------------------------------
// 시리얼포트 IPC 채널 (main 프로세스에서 serialport 모듈 사용)
// 렌더러 → contextBridge → main 방향으로만 통신
// ---------------------------------------------------------------------------

// 허용된 IPC 채널 목록 (화이트리스트)
const SERIAL_CHANNELS = [
  'serial:open',
  'serial:write',
  'serial:close',
  'serial:data',
  'serial:error',
]

contextBridge.exposeInMainWorld('electronAPI', {
  // 환경 감지
  isElectron: true,
  platform: process.platform,

  // DB API
  db: {
    savePendingPayment: (record) => ipcRenderer.invoke('db:savePendingPayment', record),
    getPendingPayments: () => ipcRenderer.invoke('db:getPendingPayments'),
    markPaymentSynced: (orderId) => ipcRenderer.invoke('db:markPaymentSynced', orderId),
    saveTransaction: (tx) => ipcRenderer.invoke('db:saveTransaction', tx),
    getMenus: () => ipcRenderer.invoke('db:getMenus'),
    saveMenu: (menu) => ipcRenderer.invoke('db:saveMenu', menu),
    deleteMenu: (id) => ipcRenderer.invoke('db:deleteMenu', id),
    queueMenuChange: (change) => ipcRenderer.invoke('db:queueMenuChange', change),
    getPendingMenuChanges: () => ipcRenderer.invoke('db:getPendingMenuChanges'),
    clearPendingMenuChange: (id) => ipcRenderer.invoke('db:clearPendingMenuChange', id),
    incrementMenuChangeAttempts: (id) => ipcRenderer.invoke('db:incrementMenuChangeAttempts', id),
    getPendingMenuCount: () => ipcRenderer.invoke('db:getPendingMenuCount'),
  },

  // 메뉴 동기화 큐 (flat 노출: menu.repository.ts 계약용)
  queueMenuChange: (change) => ipcRenderer.invoke('db:queueMenuChange', change),
  getPendingMenuChanges: () => ipcRenderer.invoke('db:getPendingMenuChanges'),
  clearPendingMenuChange: (id) => ipcRenderer.invoke('db:clearPendingMenuChange', id),
  incrementMenuChangeAttempts: (id) => ipcRenderer.invoke('db:incrementMenuChangeAttempts', id),
  getPendingMenuCount: () => ipcRenderer.invoke('db:getPendingMenuCount'),

  // 앱 종료
  quitApp: () => ipcRenderer.invoke('app:quit'),

  // 앱 재시작 (원격 명령용)
  relaunchApp: () => ipcRenderer.invoke('app:relaunch'),

  // 원격 로그/스크린샷 지원
  getLogContents: () => ipcRenderer.invoke('app:getLogContents'),
  captureScreenshot: () => ipcRenderer.invoke('app:captureScreenshot'),

  // 앱 버전 조회
  getVersion: () => ipcRenderer.invoke('app:getVersion'),

  // 로그 폴더 열기
  openLogs: () => ipcRenderer.invoke('app:openLogs'),

  // 수동 업데이트 확인
  checkUpdate: () => ipcRenderer.invoke('app:checkUpdate'),

  // 최신 버전 알림 구독
  onNoUpdate: (callback) => {
    const handler = () => callback()
    ipcRenderer.on('app:noUpdate', handler)
    return () => ipcRenderer.removeListener('app:noUpdate', handler)
  },

  // ------------------------------------------------------------------
  // 시리얼포트 API
  // 사용 예)
  //   await window.electronAPI.openSerialPort('COM3', 9600)
  //   await window.electronAPI.writeSerial('HELLO\r\n')
  //   await window.electronAPI.closeSerial()
  // ------------------------------------------------------------------

  /**
   * 시리얼 포트를 열고 연결합니다.
   * @param {string} portName  - 포트 이름 (예: 'COM3', '/dev/ttyUSB0')
   * @param {number} baudRate  - 보드레이트 (예: 9600, 115200)
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  openSerialPort: (portName, baudRate) =>
    ipcRenderer.invoke('serial:open', portName, baudRate),

  /**
   * 열린 시리얼 포트로 데이터를 전송합니다.
   * @param {string|Buffer} data - 전송할 데이터
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  writeSerial: (data) =>
    ipcRenderer.invoke('serial:write', data),

  /**
   * 시리얼 포트 연결을 종료합니다.
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  closeSerial: () =>
    ipcRenderer.invoke('serial:close'),

  /**
   * 시리얼 포트로부터 데이터 수신 이벤트를 구독합니다.
   * @param {function(data: string): void} callback
   * @returns {function} - 구독 해제 함수
   */
  onSerialData: (callback) => {
    const handler = (_event, data) => callback(data)
    ipcRenderer.on('serial:data', handler)
    // 호출자가 반환된 함수를 실행하면 리스너 제거
    return () => ipcRenderer.removeListener('serial:data', handler)
  },

  /**
   * 시리얼 포트 오류 이벤트를 구독합니다.
   * @param {function(error: string): void} callback
   * @returns {function} - 구독 해제 함수
   */
  onSerialError: (callback) => {
    const handler = (_event, error) => callback(error)
    ipcRenderer.on('serial:error', handler)
    return () => ipcRenderer.removeListener('serial:error', handler)
  },
})
