import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

interface ProtectedRouteProps {
  requiredRole?: 'seeker' | 'owner' | 'admin'
}

export function ProtectedRoute({ requiredRole }: ProtectedRouteProps) {
  const { user, profile, loading, profileLoading } = useAuth()
  const location = useLocation()

  if (loading || profileLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!user || !profile) {
    const roleParam = location.pathname.startsWith('/owner') ? 'owner' : location.pathname.startsWith('/admin') ? 'admin' : 'seeker'
    const redirectUrl = `/auth/login?role=${roleParam}&from=${encodeURIComponent(location.pathname)}`
    return <Navigate to={redirectUrl} replace />
  }

  if (requiredRole && profile.role !== requiredRole) {
    const roleParam = location.pathname.startsWith('/owner') ? 'owner' : location.pathname.startsWith('/admin') ? 'admin' : 'seeker'
    const redirectUrl = `/auth/login?role=${roleParam}&from=${encodeURIComponent(location.pathname)}`
    return <Navigate to={redirectUrl} replace />
  }

  return <Outlet />
}
