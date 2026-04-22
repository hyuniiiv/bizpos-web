/**
 * 외부 장치 브릿지 추상화
 * 플랫폼(웹/Electron/Android)별 명령 전달 처리
 *
 * - Electron: window.BizPOSBridge (preload IPC)
 * - Android: window.AndroidBridge (JSBridge postMessage)
 * - Web: Web Serial API (serial.ts)
 */
import { createSignalLight, type SignalLight } from './serial'

export type DeviceCommand =
  | { type: 'SIGNAL_LIGHT'; color: 'green' | 'red' | 'off' }
  | { type: 'DISPLAY_TEXT'; text: string }

export interface DeviceBridge {
  connect(portName?: string): Promise<void>
  disconnect(): Promise<void>
  sendCommand(cmd: DeviceCommand): Promise<void>
  getPlatform(): 'web' | 'electron' | 'android'
}

declare global {
  interface Window {
    BizPOSBridge?: { sendCommand(cmd: DeviceCommand): void }
    AndroidBridge?: { postMessage(json: string): void }
  }
}

function detectPlatform(): 'electron' | 'android' | 'web' {
  if (typeof window === 'undefined') return 'web'
  if (window.BizPOSBridge) return 'electron'
  if (window.AndroidBridge) return 'android'
  return 'web'
}

class DeviceBridgeImpl implements DeviceBridge {
  private platform: 'web' | 'electron' | 'android'
  private signalLight: SignalLight

  constructor() {
    this.platform = detectPlatform()
    this.signalLight = createSignalLight()
  }

  async connect(portName?: string): Promise<void> {
    // Electron / Android: 연결은 네이티브 앱이 관리
    if (this.platform === 'web') {
      await this.signalLight.connect(portName)
    }
  }

  async disconnect(): Promise<void> {
    if (this.platform === 'web') {
      await this.signalLight.disconnect()
    }
  }

  async sendCommand(cmd: DeviceCommand): Promise<void> {
    try {
      if (this.platform === 'electron') {
        window.BizPOSBridge!.sendCommand(cmd)
        return
      }
      if (this.platform === 'android') {
        window.AndroidBridge!.postMessage(JSON.stringify(cmd))
        return
      }
      // Web Serial
      if (cmd.type === 'SIGNAL_LIGHT') {
        if (cmd.color === 'green') await this.signalLight.setGreen()
        else if (cmd.color === 'red') await this.signalLight.setRed()
        else await this.signalLight.setOff()
      }
    } catch (err) {
      console.warn('[DeviceBridge] sendCommand failed:', err)
    }
  }

  getPlatform(): 'web' | 'electron' | 'android' {
    return this.platform
  }
}

/**
 * 플랫폼에 맞는 DeviceBridge 인스턴스 생성
 * 모든 오류는 내부에서 catch되어 POS 화면에 영향 없음
 */
export function createDeviceBridge(): DeviceBridge {
  return new DeviceBridgeImpl()
}
