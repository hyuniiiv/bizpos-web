// ElectronDB: payment.repository.ts db 인터페이스
// Window.electronAPI는 menu.repository.ts에서 선언, 여기서는 확장하지 않음
interface ElectronDB {
  savePendingPayment: (record: unknown) => Promise<{ success: boolean }>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getPendingPayments: () => Promise<any[]>
  markPaymentSynced: (merchantOrderID: string) => Promise<{ success: boolean }>
  saveTransaction: (tx: unknown) => Promise<{ success: boolean }>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getMenus: () => Promise<any[]>
  saveMenu: (menu: unknown) => Promise<{ success: boolean }>
  deleteMenu: (id: string) => Promise<{ success: boolean }>
}
