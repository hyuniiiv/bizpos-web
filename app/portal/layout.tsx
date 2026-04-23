import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>
}
