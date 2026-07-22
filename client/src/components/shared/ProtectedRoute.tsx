import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

interface ProtectedRouteProps {
  requiredRole?: 'seeker' | 'owner' | 'admin'
}

export function ProtectedRoute({ requiredRole }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />
  }

  if (requiredRole && profile?.role !== requiredRole) {
    const dashboardPath = profile?.role === 'owner' ? '/owner' : profile?.role === 'admin' ? '/admin' : '/seeker'
    return <Navigate to={dashboardPath} replace />
  }

  return <Outlet />
}
