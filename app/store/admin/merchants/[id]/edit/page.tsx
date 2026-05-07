import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Merchant } from '@/lib/context/MerchantStoreContext'
import MerchantEditClient from './MerchantEditClient'

export default async function MerchantEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: merchant } = await supabase
    .from('merchants')
    .select('*')
    .eq('id', id)
    .single()

  if (!merchant) return notFound()

  return <MerchantEditClient merchant={merchant as Merchant} />
}
