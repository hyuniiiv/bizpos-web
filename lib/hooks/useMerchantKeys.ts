import { useState } from 'react'
import type { MerchantKey, MerchantKeyCreateInput, MerchantKeyUpdateInput } from '@/types/merchant-key'

/**
 * 가맹점 키 CRUD 훅
 * MerchantKeyClient에서 직접 fetch하던 코드를 캡슐화
 */
export function useMerchantKeys(initialKeys: MerchantKey[] = []) {
  const [keys, setKeys] = useState<MerchantKey[]>(initialKeys)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function fetchKeys(): Promise<MerchantKey[]> {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/merchant/keys')
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body?.error?.message ?? '목록 조회 실패')
      }
      const body = await res.json()
      const fetched: MerchantKey[] = body.keys ?? []
      setKeys(fetched)
      return fetched
    } catch (err) {
      const msg = err instanceof Error ? err.message : '오류가 발생했습니다'
      setError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }

  async function createKey(input: MerchantKeyCreateInput): Promise<MerchantKey> {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/merchant/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body?.error?.message ?? '키 등록 실패')
      }
      const created: MerchantKey = await res.json()
      setKeys(prev => [created, ...prev])
      return created
    } catch (err) {
      const msg = err instanceof Error ? err.message : '오류가 발생했습니다'
      setError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }

  async function updateKey(id: string, input: MerchantKeyUpdateInput): Promise<MerchantKey> {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/merchant/keys/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body?.error?.message ?? '키 수정 실패')
      }
      const updated: MerchantKey = await res.json()
      setKeys(prev => prev.map(k => k.id === id ? updated : k))
      return updated
    } catch (err) {
      const msg = err instanceof Error ? err.message : '오류가 발생했습니다'
      setError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }

  async function deleteKey(id: string): Promise<void> {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/merchant/keys/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body?.error?.message ?? '키 삭제 실패')
      }
      setKeys(prev => prev.filter(k => k.id !== id))
    } catch (err) {
      const msg = err instanceof Error ? err.message : '오류가 발생했습니다'
      setError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { keys, loading, error, fetchKeys, createKey, updateKey, deleteKey }
}
