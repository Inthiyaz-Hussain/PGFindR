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
    return <Navigate to="/auth/login" state={{ from: location.pathname }} replace />
  }

  if (requiredRole && profile.role !== requiredRole) {
    return <Navigate to="/auth/login" state={{ from: location.pathname }} replace />
  }

  return <Outlet />
}
