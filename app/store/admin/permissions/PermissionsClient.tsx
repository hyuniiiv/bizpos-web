'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Permission {
  id: string
  role: string
  resource: string
  can_create: boolean
  can_read: boolean
  can_update: boolean
  can_delete: boolean
}

export default function PermissionsClient({ initialPermissions }: { initialPermissions: Permission[] }) {
  const router = useRouter()
  const [permissions, setPermissions] = useState<Permission[]>(initialPermissions)
  const [saving, setSaving] = useState(false)

  async function togglePermission(id: string, field: keyof Permission, value: boolean) {
    setSaving(true)
    const current = permissions.find(p => p.id === id)!
    const updated = { ...current, [field]: value }

    try {
      const res = await fetch('/api/admin/permissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      })
      if (!res.ok) throw new Error('업데이트 실패')
      setPermissions(prev => prev.map(p => p.id === id ? updated : p))
      router.refresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : '오류')
    } finally {
      setSaving(false)
    }
  }

  const resources = ['merchants', 'stores', 'clients', 'terminals', 'users']
  const roles = [
    'platform_admin', 'platform_manager',
    'merchant_admin', 'merchant_manager',
    'store_admin', 'store_manager',
    'terminal_admin',
    'client_admin', 'client_manager'
  ]

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-white mb-6">권한 관리 매트릭스</h1>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-white">
          <thead className="bg-white/5">
            <tr>
              <th className="p-3 text-left">Role</th>
              <th className="p-3 text-left">Resource</th>
              <th className="p-3 text-center">Create</th>
              <th className="p-3 text-center">Read</th>
              <th className="p-3 text-center">Update</th>
              <th className="p-3 text-center">Delete</th>
            </tr>
          </thead>
          <tbody>
            {permissions.map((p) => (
              <tr key={p.id} className="border-b border-white/10">
                <td className="p-3">{p.role}</td>
                <td className="p-3">{p.resource}</td>
                <td className="p-3 text-center"><input type="checkbox" checked={p.can_create} onChange={(e) => togglePermission(p.id, 'can_create', e.target.checked)} /></td>
                <td className="p-3 text-center"><input type="checkbox" checked={p.can_read} onChange={(e) => togglePermission(p.id, 'can_read', e.target.checked)} /></td>
                <td className="p-3 text-center"><input type="checkbox" checked={p.can_update} onChange={(e) => togglePermission(p.id, 'can_update', e.target.checked)} /></td>
                <td className="p-3 text-center"><input type="checkbox" checked={p.can_delete} onChange={(e) => togglePermission(p.id, 'can_delete', e.target.checked)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
