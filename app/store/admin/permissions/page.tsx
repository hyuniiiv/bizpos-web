import { createAdminClient } from '@/lib/supabase/admin'
import PermissionsClient from './PermissionsClient'

export default async function PermissionsPage() {
  const adminDb = createAdminClient()
  const { data: permissions } = await adminDb.from('role_permissions').select('*').order('role')

  return <PermissionsClient initialPermissions={permissions ?? []} />
}
