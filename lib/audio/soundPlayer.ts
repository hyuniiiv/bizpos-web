'use client'

/**
 * 사운드 재생 유틸리티
 * - HTML5 Audio API 기반
 * - Electron file:// 및 Vercel https:// 양쪽 호환
 * - 메뉴별 사운드 + 전역 fallback
 * - 재생 실패는 silent fail (결제 플로우에 영향 없음)
 */

export type SoundType = 'success' | 'error'

const DEFAULT_SOUNDS: Record<SoundType, string> = {
  success: '/sounds/success.mp3',
  error: '/sounds/error.mp3',
}

// 재생 중인 오디오 추적 (빠른 연속 스캔 대비 중복 재생 방지)
let currentAudio: HTMLAudioElement | null = null

/**
 * 사운드 재생
 * @param src 재생할 사운드 경로 (메뉴별 soundFile 또는 DEFAULT_SOUNDS)
 * @param volume 0.0 ~ 1.0 (기본 1.0)
 */
export async function playSound(src: string, volume = 1.0): Promise<void> {
  if (typeof window === 'undefined') return
  try {
    // 이전 오디오 중단 (빠른 연속 스캔 대응)
    if (currentAudio) {
      currentAudio.pause()
      currentAudio.currentTime = 0
    }

    const audio = new Audio(src)
    audio.volume = Math.max(0, Math.min(1, volume))
    currentAudio = audio

    // 재생 실패해도 결제 플로우에 영향 없도록 silent fail
    await audio.play().catch((err) => {
      console.warn('[soundPlayer] play failed:', src, err)
    })
  } catch (err) {
    console.warn('[soundPlayer] error:', err)
  }
}

/**
 * 전역 사운드 재생 (성공/실패)
 */
export function playGlobalSound(type: SoundType, volume = 1.0): Promise<void> {
  return playSound(DEFAULT_SOUNDS[type], volume)
}

/**
 * 메뉴별 사운드 재생, 없으면 전역 fallback
 * @param menuSoundFile 메뉴의 soundFile 필드 (undefined or '')
 * @param fallbackType 폴백 전역 사운드 타입
 */
export async function playMenuSound(
  menuSoundFile: string | undefined | null,
  fallbackType: SoundType,
  volume = 1.0,
): Promise<void> {
  const trimmed = menuSoundFile?.trim()
  if (trimmed) {
    // 절대 경로 또는 URL이 아니면 '/sounds/' prefix 적용
    const src = /^(https?:|\/)/i.test(trimmed) ? trimmed : `/sounds/${trimmed}`
    await playSound(src, volume)
    return
  }
  await playGlobalSound(fallbackType, volume)
}

/**
 * 재생 중인 사운드 즉시 중단
 */
export function stopSound(): void {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.currentTime = 0
    currentAudio = null
  }
}
