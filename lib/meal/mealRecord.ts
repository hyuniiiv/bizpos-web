// lib/meal/mealRecord.ts
import type { MealType } from '@/types/menu'

export type MealRecordResult =
  | { status: 'ok'; employeeName: string; department?: string; mealType: MealType }
  | { status: 'warn'; employeeName: string; department?: string; mealType: MealType }
  | { status: 'error'; code: 'EMPLOYEE_NOT_FOUND' | 'DUPLICATE_BLOCKED' | 'SERVER_ERROR' }

export async function recordMealUsage(
  rawInput: string,
  deviceToken: string,
): Promise<MealRecordResult> {
  try {
    const res = await fetch('/api/meal/record', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${deviceToken}`,
      },
      body: JSON.stringify({ rawInput }),
    })

    const data = await res.json()

    if (!res.ok) {
      const code = data.error ?? 'SERVER_ERROR'
      return { status: 'error', code: code as 'EMPLOYEE_NOT_FOUND' | 'DUPLICATE_BLOCKED' | 'SERVER_ERROR' }
    }

    if (data.warn === 'DUPLICATE_WARN') {
      return {
        status: 'warn',
        employeeName: data.employee.name,
        department: data.employee.department,
        mealType: data.meal_type,
      }
    }

    return {
      status: 'ok',
      employeeName: data.employee.name,
      department: data.employee.department,
      mealType: data.meal_type,
    }
  } catch {
    return { status: 'error', code: 'SERVER_ERROR' }
  }
}
