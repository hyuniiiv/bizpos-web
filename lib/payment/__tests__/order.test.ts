import { describe, it, expect, vi } from 'vitest'
import { generateOrderId } from '../order'

describe('generateOrderId', () => {
  it('[H-3] 연속 호출 시 고유한 ID를 생성한다', () => {
    const ids = Array.from({ length: 20 }, () => generateOrderId('01').merchantOrderID)
    const unique = new Set(ids)
    expect(unique.size).toBe(20)
  })

  it('[H-3] merchantOrderID 길이가 16자 초과여야 한다 (밀리초/랜덤 포함)', () => {
    const { merchantOrderID } = generateOrderId('01')
    expect(merchantOrderID.length).toBeGreaterThan(16)
  })

  it('merchantOrderDt는 YYYYMMDD 8자리여야 한다', () => {
    const { merchantOrderDt } = generateOrderId('01')
    expect(merchantOrderDt).toMatch(/^\d{8}$/)
  })

  it('termId 2자리가 ID에 포함된다', () => {
    const { merchantOrderID } = generateOrderId('05')
    expect(merchantOrderID).toContain('05')
  })
})
