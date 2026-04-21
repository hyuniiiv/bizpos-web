import type { PeriodConfig, MealType } from '@/types/menu'

export function detectMealType(periods: PeriodConfig[]): MealType {
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  for (const period of periods) {
    if (!period.startTime || !period.endTime) continue
    const [sh, sm] = period.startTime.split(':').map(Number)
    const [eh, em] = period.endTime.split(':').map(Number)
    const start = sh * 60 + sm
    const end = eh * 60 + em
    if (currentMinutes >= start && currentMinutes < end) {
      return period.mealType
    }
  }
  return 'lunch'
}
