import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import type { UserRole } from '@/types'

interface RoleRouteProps {
  requiredRole: UserRole
}

export function RoleRoute({ requiredRole }: RoleRouteProps) {
  const { profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!profile || profile.role !== requiredRole) {
    const dashboardPath =
      profile?.role === 'owner' ? '/owner'
      : profile?.role === 'admin' ? '/admin'
      : '/seeker'
    return <Navigate to={dashboardPath} replace />
  }

  return <Outlet />
}
