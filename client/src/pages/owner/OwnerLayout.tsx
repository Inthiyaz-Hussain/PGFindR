import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  Building2,
  LayoutDashboard,
  MessageSquare,
  LogOut,
  IndianRupee,
  FileCheck,
  Info,
  User,
  Users,
  Lock,
  Star
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

import { useAuth } from '@/hooks/useAuth'
import { useFirebasePush } from '@/hooks/useFirebase'
import { cn } from '@/lib/utils'
import { NotificationBell } from '@/components/shared/NotificationBell'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'

const NAV_ITEMS = [
  { to: '/owner', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/owner/pgs', label: 'My PGs', icon: Building2, end: true },
  { to: '/owner/tenants', label: 'My Tenants', icon: Users, end: true, secure: true },
  { to: '/owner/inquiries', label: 'Inquiries', icon: MessageSquare, end: true, secure: true },
  { to: '/owner/reviews', label: 'Reviews', icon: Star, end: true, secure: true },
  { to: '/owner/earnings', label: 'Earnings', icon: IndianRupee, end: true, secure: true },
  { to: '/owner/kyc', label: 'KYC', icon: FileCheck, end: true },
  { to: '/owner/profile', label: 'Profile Settings', icon: User, end: true },
  { to: '/owner/about', label: 'About', icon: Info, end: true },
]

export function OwnerLayout() {
  const { profile, signOut, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showLockModal, setShowLockModal] = useState(false)
  useFirebasePush()

  const isKycApproved = profile?.kyc_status === 'approved'

  // Block direct URL entry to secured locked pages
  useEffect(() => {
    if (!loading && profile && profile.role === 'owner') {
      const isSecuredPath = ['/owner/tenants', '/owner/inquiries', '/owner/earnings'].includes(location.pathname)
      if (isSecuredPath && !isKycApproved) {
        navigate('/owner')
        setShowLockModal(true)
      }
    }
  }, [profile, loading, location.pathname, navigate, isKycApproved])

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'OW'

  // Handle clicking navigation items
  const handleNavClick = (e: React.MouseEvent, secure: boolean) => {
    if (secure && !isKycApproved) {
      e.preventDefault()
      setShowLockModal(true)
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex fixed left-0 top-16 bottom-0 z-40 w-16 hover:w-64 flex-col border-r bg-sidebar text-sidebar-foreground pt-4 shadow-xl transition-all duration-300 ease-in-out group overflow-hidden">
          <div className="flex-1 p-3 space-y-1">
            {NAV_ITEMS.map(({ to, label, icon: Icon, end, secure }) => {
              const isLocked = secure && !isKycApproved
              return (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={(e) => handleNavClick(e, !!secure)}
                  className={({ isActive }) => cn(
                    'flex items-center rounded-lg p-2.5 text-sm transition-colors overflow-hidden whitespace-nowrap relative',
                    isActive && !isLocked
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  )}
                >
                  <div className="flex items-center justify-center size-5 shrink-0 mr-4">
                    <Icon className="size-5" />
                  </div>
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-1 flex items-center justify-between">
                    <span>{label}</span>
                    {isLocked && <Lock className="size-3.5 text-amber-500 shrink-0 ml-2" />}
                  </span>
                </NavLink>
              )
            })}
          </div>

          <div className="p-3 border-t border-sidebar-border overflow-hidden">
            <div className="flex items-center rounded-lg p-1 whitespace-nowrap">
              <NavLink to="/owner/profile" className="flex items-center flex-1 min-w-0 hover:opacity-85 transition-opacity">
                <Avatar className="size-9 shrink-0">
                  <AvatarFallback className="text-xs bg-sidebar-accent text-sidebar-accent-foreground">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="text-sm font-medium truncate">{profile?.full_name || 'Owner'}</div>
                  <div className="text-xs text-sidebar-foreground/60">PG Owner</div>
                </div>
              </NavLink>
              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <NotificationBell />
                <Button variant="ghost" size="icon-sm" onClick={signOut} title="Sign out" className="text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent">
                  <LogOut className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 bg-background md:pl-16 pb-20 md:pb-0">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-16 backdrop-blur-md bg-white/90 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex items-center justify-around px-2 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] select-none">
        {NAV_ITEMS.filter(item => item.to !== '/owner/about' && item.to !== '/owner/profile').map(({ to, label, icon: Icon, end, secure }) => {
          const isLocked = secure && !isKycApproved
          return (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={(e) => handleNavClick(e, !!secure)}
              className={({ isActive }) => cn(
                'flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] transition-colors relative',
                isActive && !isLocked
                  ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="size-5 mb-1" />
              <span>{label}</span>
              {isLocked && <Lock className="size-3 text-amber-500 absolute top-1.5 right-1.5" />}
            </NavLink>
          )
        })}
      </nav>

      <div className="md:pl-16 pb-20 md:pb-0">
        <Footer />
      </div>

      {/* Locked Section Dialog */}
      <Dialog open={showLockModal} onOpenChange={setShowLockModal}>
        <DialogContent className="max-w-sm text-center p-6 space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-900/30">
            <Lock className="h-6 w-6 text-amber-600 dark:text-amber-400 animate-bounce" />
          </div>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-center">Feature Locked 🔒</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground pt-1.5 leading-relaxed">
              This section is locked behind KYC verification. It will automatically unlock once your KYC documents and bank details are approved by FindPGRoom admins.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={() => { setShowLockModal(false); navigate('/owner/kyc') }} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium">
              Complete KYC Verification
            </Button>
            <Button variant="ghost" onClick={() => setShowLockModal(false)} className="w-full text-slate-500">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
