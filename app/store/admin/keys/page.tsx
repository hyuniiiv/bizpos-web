import { createClient } from '@/lib/supabase/server'
import MerchantKeyClient from '@/components/dashboard/MerchantKeyClient'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import MerchantStoreFilter from '@/components/analytics/MerchantStoreFilter'

export const revalidate = 0

export default async function MerchantKeysPage({
  searchParams,
}: {
  searchParams: Promise<{ merchantId?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 사용자 merchant_users (role 포함)
  const { data: myMerchantUsers } = await supabase
    .from('merchant_users')
    .select('merchant_id, role, merchants(id, name)')
    .eq('user_id', user.id)

  const hasFullAccess = myMerchantUsers?.some(mu =>
    mu.role === 'platform_admin' || mu.role === 'terminal_admin'
  ) ?? false

  let merchants: { id: string; name: string }[] = []
  if (hasFullAccess) {
    const { data: all } = await supabase.from('merchants').select('id, name').order('name')
    merchants = (all ?? []).map(m => ({ id: m.id, name: m.name ?? '' }))
  } else {
    merchants = (myMerchantUsers ?? [])
      .map(mu => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw = (mu as any).merchants
        const m = Array.isArray(raw) ? raw[0] : raw
        return m ? { id: m.id as string, name: (m.name ?? '') as string } : null
      })
      .filter(Boolean) as { id: string; name: string }[]
  }

  const selectedMerchantId = (params.merchantId && merchants.some(m => m.id === params.merchantId))
    ? params.merchantId
    : merchants[0]?.id ?? ''

  const { data: keys } = await supabase
    .from('merchant_keys')
    .select('id, name, mid, enc_key, online_ak, description, is_active, env, store_id, created_at')
    .eq('merchant_id', selectedMerchantId)
    .order('created_at', { ascending: false })

  const selectedMerchant = merchants.find(m => m.id === selectedMerchantId)

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">키 관리</h1>
            {selectedMerchant && merchants.length > 1 && (
              <p className="text-sm text-white/40 mt-0.5">{selectedMerchant.name}</p>
            )}
          </div>
        </div>
        <Suspense fallback={null}>
          <MerchantStoreFilter
            merchants={merchants}
            stores={[]}
            selectedMerchantId={selectedMerchantId}
            selectedStoreId=""
            basePath="/store/admin/keys"
          />
        </Suspense>
      </div>

      <MerchantKeyClient
        initialKeys={keys ?? []}
        merchantId={selectedMerchantId}
      />
    </div>
  )
}
