// components/pos/screens/BadgeScreen.tsx
'use client'
import { useEffect } from 'react'
import type { MealType } from '@/types/menu'
import { playGlobalSound } from '@/lib/audio/soundPlayer'

const MEAL_LABEL: Record<MealType, string> = {
  breakfast: '조식',
  lunch: '중식',
  dinner: '석식',
}

interface Props {
  variant: 'success' | 'warn'
  employeeName: string
  department?: string
  mealType: MealType
  onDone: () => void
}

export default function BadgeScreen({ variant, employeeName, department, mealType, onDone }: Props) {
  useEffect(() => {
    void playGlobalSound(variant === 'success' ? 'success' : 'error')
    const timer = setTimeout(onDone, variant === 'warn' ? 5000 : 3000)
    return () => clearTimeout(timer)
  }, [variant, onDone])

  const isSuccess = variant === 'success'

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-950">
      <div className={`text-8xl mb-6 ${isSuccess ? 'text-green-400' : 'text-yellow-400'}`}>
        {isSuccess ? '✓' : '⚠'}
      </div>
      <p className="text-3xl font-bold text-white mb-2">{employeeName}</p>
      {department && <p className="text-lg text-gray-400 mb-4">{department}</p>}
      <p className={`text-xl font-semibold ${isSuccess ? 'text-green-300' : 'text-yellow-300'}`}>
        {MEAL_LABEL[mealType]} {isSuccess ? '이용 완료' : '중복 태깅 (자동 통과)'}
      </p>
      {!isSuccess && (
        <p className="text-sm text-gray-500 mt-4">5초 후 자동으로 넘어갑니다</p>
      )}
    </div>
  )
}
