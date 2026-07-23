import { NavLink, Outlet } from 'react-router-dom'
import { Building2, LayoutDashboard, MessageSquare, LogOut, Plus, IndianRupee, FileCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'

import { useAuth } from '@/hooks/useAuth'
import { useFirebasePush } from '@/hooks/useFirebase'
import { cn } from '@/lib/utils'
import { NotificationBell } from '@/components/shared/NotificationBell'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'

const NAV_ITEMS = [
  { to: '/owner', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/owner/pgs', label: 'My PGs', icon: Building2, end: true },
  { to: '/owner/inquiries', label: 'Inquiries', icon: MessageSquare, end: true },
  { to: '/owner/earnings', label: 'Earnings', icon: IndianRupee, end: true },
  { to: '/owner/kyc', label: 'KYC', icon: FileCheck, end: true },
]

export function OwnerLayout() {
  const { profile, signOut } = useAuth()
  useFirebasePush()
  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'OW'

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex w-64 flex-col border-r bg-sidebar text-sidebar-foreground pt-4">
          <div className="flex-1 p-3 space-y-1">
            {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                )}
              >
                <Icon className="size-4 shrink-0" />
                {label}
              </NavLink>
            ))}

            <Separator className="my-2 bg-sidebar-border" />

            <NavLink
              to="/owner/pgs/new"
              className={({ isActive }) => cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              )}
            >
              <Plus className="size-4 shrink-0" />
              Add New PG
            </NavLink>
          </div>

          <div className="p-3 border-t border-sidebar-border">
            <div className="flex items-center gap-3 rounded-lg p-2 hover:bg-sidebar-accent/50 transition-colors">
              <Avatar className="size-9">
                <AvatarFallback className="text-xs bg-sidebar-accent text-sidebar-accent-foreground">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{profile?.full_name || 'Owner'}</div>
                <div className="text-xs text-sidebar-foreground/60">PG Owner</div>
              </div>
              <NotificationBell />
              <Button variant="ghost" size="icon-sm" onClick={signOut} title="Sign out" className="text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent">
                <LogOut className="size-4" />
              </Button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 bg-background">
          <Outlet />
        </main>
      </div>
      <Footer />
    </div>
  )
}
