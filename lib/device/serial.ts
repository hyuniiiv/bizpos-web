/**
 * 경광봉/디스플레이 시리얼 통신
 * Web Serial API (Chrome / Electron 지원)
 *
 * 설계 문서 Section 9.2 기반 구현
 * Green = 0x01, Red = 0x02, Off = 0x00
 * Baud rate: 9600
 */

// Web Serial API 타입 선언 (TypeScript 표준 lib에 미포함)
interface SerialPortInfo { usbVendorId?: number; usbProductId?: number }
interface SerialOptions { baudRate: number }
interface SerialPort {
  open(options: SerialOptions): Promise<void>
  close(): Promise<void>
  readonly readable: ReadableStream<Uint8Array> | null
  readonly writable: WritableStream<Uint8Array> | null
  getInfo(): SerialPortInfo
}
interface Serial {
  requestPort(options?: { filters?: SerialPortInfo[] }): Promise<SerialPort>
  getPorts(): Promise<SerialPort[]>
}
declare global {
  interface Navigator { readonly serial: Serial }
  interface SerialPort {
    open(options: SerialOptions): Promise<void>
    close(): Promise<void>
    readonly readable: ReadableStream<Uint8Array> | null
    readonly writable: WritableStream<Uint8Array> | null
    getInfo(): SerialPortInfo
  }
}

class SignalLightImpl {
  private port: SerialPort | null = null
  private connected = false

  async connect(_portName?: string): Promise<void> {
    if (!this.isSupported()) return
    try {
      this.port = await navigator.serial.requestPort()
      await this.port.open({ baudRate: 9600 })
      this.connected = true
    } catch (err) {
      console.warn('[SignalLight] connect failed:', err)
      this.connected = false
    }
  }

  async disconnect(): Promise<void> {
    if (!this.port) return
    try {
      await this.port.close()
    } catch {}
    this.port = null
    this.connected = false
  }

  async setGreen(): Promise<void> {
    await this.write(0x01)
  }

  async setRed(): Promise<void> {
    await this.write(0x02)
  }

  async setOff(): Promise<void> {
    await this.write(0x00)
  }

  isConnected(): boolean {
    return this.connected
  }

  private isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'serial' in navigator
  }

  private async write(byte: number): Promise<void> {
    if (!this.port?.writable) return
    const writer = this.port.writable.getWriter()
    try {
      await writer.write(new Uint8Array([byte]))
    } catch (err) {
      console.warn('[SignalLight] write failed:', err)
    } finally {
      writer.releaseLock()
    }
  }
}

/** Web Serial API 미지원 환경에서 사용하는 No-op 스텁 */
class SignalLightStub {
  async connect(_portName?: string): Promise<void> {}
  async disconnect(): Promise<void> {}
  async setGreen(): Promise<void> {}
  async setRed(): Promise<void> {}
  async setOff(): Promise<void> {}
  isConnected(): boolean { return false }
}

export type SignalLight = SignalLightImpl | SignalLightStub

/**
 * Web Serial API 지원 여부에 따라 실제 구현 또는 No-op 스텁 반환
 * POS 화면은 하드웨어 없이도 정상 동작해야 함
 */
export function createSignalLight(): SignalLight {
  if (typeof navigator !== 'undefined' && 'serial' in navigator) {
    return new SignalLightImpl()
  }
  return new SignalLightStub()
}
