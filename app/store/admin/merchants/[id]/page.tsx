import { notFound } from 'next/navigation'
import type { Merchant, Store } from '@/lib/context/MerchantStoreContext'

interface Admin {
  id: string
  email: string
}

interface Manager {
  id: string
  email: string
}

async function getMerchant(id: string): Promise<Merchant | null> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/merchant/merchants/${id}`,
      {
        next: { revalidate: 0 },
      }
    )
    if (!res.ok) return null
    const json = await res.json()
    return json.data || null
  } catch {
    return null
  }
}

async function getAdmins(): Promise<Admin[]> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/merchant/admins`,
      {
        next: { revalidate: 0 },
      }
    )
    if (!res.ok) return []
    const json = await res.json()
    return json.data || []
  } catch {
    return []
  }
}

async function getManagers(): Promise<Manager[]> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/merchant/managers`,
      {
        next: { revalidate: 0 },
      }
    )
    if (!res.ok) return []
    const json = await res.json()
    return json.data || []
  } catch {
    return []
  }
}

async function getStores(merchantId: string): Promise<Store[]> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/merchant/stores?merchant_id=${merchantId}`,
      {
        next: { revalidate: 0 },
      }
    )
    if (!res.ok) return []
    const json = await res.json()
    return json.data || []
  } catch {
    return []
  }
}

export default async function MerchantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [merchant, admins, managers, stores] = await Promise.all([
    getMerchant(id),
    getAdmins(),
    getManagers(),
    getStores(id),
  ])

  if (!merchant) {
    notFound()
  }

  const adminEmail = admins.find(a => a.id === merchant.admin_id)?.email || '미지정'
  const managerEmail = managers.find(m => m.id === merchant.manager_id)?.email || '-'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">{merchant.name}</h1>
        <p
          className="text-sm mt-1"
          style={{ color: 'var(--bp-text-3)' }}
        >
          가맹점 상세 정보
        </p>
      </div>

      <div
        className="rounded-xl p-6"
        style={{
          background: 'var(--bp-surface)',
          border: '1px solid var(--bp-border)',
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label
              className="block text-xs font-medium mb-2"
              style={{ color: 'var(--bp-text-3)' }}
            >
              가맹점명
            </label>
            <p className="text-white font-medium">{merchant.name}</p>
          </div>

          <div>
            <label
              className="block text-xs font-medium mb-2"
              style={{ color: 'var(--bp-text-3)' }}
            >
              사업자등록번호
            </label>
            <p className="text-white font-medium">
              {merchant.biz_no}
            </p>
          </div>

          <div>
            <label
              className="block text-xs font-medium mb-2"
              style={{ color: 'var(--bp-text-3)' }}
            >
              주소
            </label>
            <p className="text-white font-medium">{merchant.address}</p>
          </div>

          <div>
            <label
              className="block text-xs font-medium mb-2"
              style={{ color: 'var(--bp-text-3)' }}
            >
              관리자
            </label>
            <p className="text-white font-medium">{adminEmail}</p>
          </div>

          <div>
            <label
              className="block text-xs font-medium mb-2"
              style={{ color: 'var(--bp-text-3)' }}
            >
              매니저
            </label>
            <p className="text-white font-medium">{managerEmail}</p>
          </div>

          <div>
            <label
              className="block text-xs font-medium mb-2"
              style={{ color: 'var(--bp-text-3)' }}
            >
              등록일
            </label>
            <p className="text-white font-medium">
              {new Date(merchant.created_at).toLocaleDateString('ko-KR')}
            </p>
          </div>
        </div>

        {merchant.description && (
          <div className="mt-6 pt-6" style={{ borderTop: '1px solid var(--bp-border)' }}>
            <label
              className="block text-xs font-medium mb-2"
              style={{ color: 'var(--bp-text-3)' }}
            >
              설명
            </label>
            <p className="text-white whitespace-pre-wrap">
              {merchant.description}
            </p>
          </div>
        )}
      </div>

      {stores.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-white mb-4">매장 목록</h2>
          <div className="grid grid-cols-1 gap-4">
            {stores.map(store => (
              <div
                key={store.id}
                className="rounded-xl p-4"
                style={{
                  background: 'var(--bp-surface)',
                  border: '1px solid var(--bp-border)',
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-white">{store.store_name}</h3>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      store.is_active
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}
                  >
                    {store.is_active ? '운영중' : '비운영'}
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <span style={{ color: 'var(--bp-text-3)' }}>주소: </span>
                    <span className="text-white">{store.address}</span>
                  </div>
                  {store.description && (
                    <div>
                      <span style={{ color: 'var(--bp-text-3)' }}>설명: </span>
                      <span className="text-white">{store.description}</span>
                    </div>
                  )}
                  <div style={{ color: 'var(--bp-text-3)' }} className="text-xs">
                    등록일: {new Date(store.created_at).toLocaleDateString('ko-KR')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <a
          href="/store/admin/merchants"
          className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-80"
          style={{
            background: 'var(--bp-surface)',
            border: '1px solid var(--bp-border)',
            color: 'var(--bp-text-3)',
          }}
        >
          돌아가기
        </a>
      </div>
    </div>
  )
}
