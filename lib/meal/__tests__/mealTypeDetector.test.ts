import { detectMealType } from '../mealTypeDetector'
import type { PeriodConfig } from '@/types/menu'

const mockPeriods: PeriodConfig[] = [
  { mealType: 'breakfast', startTime: '07:00', endTime: '09:00', mode: 'single', label: '조식' },
  { mealType: 'lunch', startTime: '11:30', endTime: '13:30', mode: 'single', label: '중식' },
  { mealType: 'dinner', startTime: '17:30', endTime: '19:30', mode: 'single', label: '석식' },
]

describe('detectMealType', () => {
  it('08:00이면 breakfast 반환', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-21T08:00:00'))
    expect(detectMealType(mockPeriods)).toBe('breakfast')
    jest.useRealTimers()
  })

  it('시간대 없으면(15:00) lunch 반환', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-21T15:00:00'))
    expect(detectMealType(mockPeriods)).toBe('lunch')
    jest.useRealTimers()
  })

  it('빈 periods는 lunch 반환', () => {
    expect(detectMealType([])).toBe('lunch')
  })

  it('18:00이면 dinner 반환', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-21T18:00:00'))
    expect(detectMealType(mockPeriods)).toBe('dinner')
    jest.useRealTimers()
  })
})
