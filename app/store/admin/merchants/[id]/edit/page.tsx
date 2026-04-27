import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Merchant } from '@/lib/context/MerchantStoreContext'
import MerchantEditClient from './MerchantEditClient'

interface Admin {
  id: string
  email: string
}

interface Manager {
  id: string
  email: string
}

async function getMerchant(supabase: any, id: string): Promise<Merchant | null> {
  try {
    const { data: merchant } = await supabase
      .from('merchants')
      .select('*')
      .eq('id', id)
      .single()
    return merchant || null
  } catch {
    return null
  }
}

async function getAdmins(supabase: any): Promise<Admin[]> {
  try {
    const { data: adminUsers } = await supabase
      .from('merchant_users')
      .select('user_id')
      .eq('role', 'admin')

    if (!adminUsers || adminUsers.length === 0) return []

    const userIds = adminUsers.map((a: any) => a.user_id)
    const { data: users, error } = await supabase.auth.admin.listUsers()

    if (error || !users) return []

    return users.users
      .filter((u: any) => userIds.includes(u.id))
      .map((u: any) => ({
        id: u.id,
        email: u.email || '',
      }))
  } catch {
    return []
  }
}

async function getManagers(supabase: any): Promise<Manager[]> {
  try {
    const { data: managerUsers } = await supabase
      .from('merchant_users')
      .select('user_id')
      .eq('role', 'manager')

    if (!managerUsers || managerUsers.length === 0) return []

    const userIds = managerUsers.map((m: any) => m.user_id)
    const { data: users, error } = await supabase.auth.admin.listUsers()

    if (error || !users) return []

    return users.users
      .filter((u: any) => userIds.includes(u.id))
      .map((u: any) => ({
        id: u.id,
        email: u.email || '',
      }))
  } catch {
    return []
  }
}

export default async function MerchantEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [merchant, admins, managers] = await Promise.all([
    getMerchant(supabase, id),
    getAdmins(supabase),
    getManagers(supabase),
  ])

  if (!merchant) {
    return notFound()
  }

  return (
    <MerchantEditClient merchant={merchant} admins={admins} managers={managers} />
  )
}
