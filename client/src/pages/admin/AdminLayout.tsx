import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, Users, UserCheck, CreditCard, Percent, LogOut, ChevronDown, ChevronRight, Building, User, Settings, History, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { NotificationBell } from '@/components/shared/NotificationBell'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/admin/profile', label: 'Profile Settings', icon: User, end: true },
    ],
  },
  {
    label: 'Management',
    items: [
      { to: '/admin/pgs', label: 'PG Listings', icon: Building, end: false },
      { to: '/admin/owners', label: 'Owners', icon: UserCheck, end: false },
      { to: '/admin/kyc', label: 'KYC Review', icon: ShieldCheck, end: false },
      { to: '/admin/users', label: 'Seekers', icon: Users, end: false },
    ],
  },
  {
    label: 'Financials',
    items: [
      { to: '/admin/transactions', label: 'Transactions', icon: CreditCard, end: false },
      { to: '/admin/commission', label: 'Commission', icon: Percent, end: false },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/admin/platform-settings', label: 'Platform Settings', icon: Settings, end: false },
      { to: '/admin/audit-logs', label: 'Audit Logs', icon: History, end: false },
    ],
  },
]

function NavGroup({ label, items }: { label: string; items: { to: string; label: string; icon: React.ComponentType<{ className?: string }>; end: boolean }[] }) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="space-y-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 w-full px-3 py-1.5 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider hover:text-sidebar-foreground/70"
      >
        {expanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
        {label}
      </button>
      {expanded && (
        <div className="space-y-0.5">
          {items.map(({ to, label: itemLabel, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => cn(
                'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              )}
            >
              <Icon className="size-4 shrink-0" />
              {itemLabel}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

export function AdminLayout() {
  const { profile, signOut } = useAuth()
  const initials = profile?.full_name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'A'



  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="flex flex-1">
        <aside className="hidden md:flex w-60 flex-col border-r bg-sidebar text-sidebar-foreground pt-4">
          <div className="flex-1 p-3 space-y-4">
            {NAV_GROUPS.map((group) => (
              <NavGroup key={group.label} label={group.label} items={group.items} />
            ))}
          </div>

          <div className="p-3 border-t border-sidebar-border">
            <div className="flex items-center gap-3 rounded-md p-2">
              <NavLink to="/admin/profile" className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity">
                <Avatar size="sm">
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{profile?.full_name}</div>
                  <div className="text-xs text-sidebar-foreground/60">Administrator</div>
                </div>
              </NavLink>
              <NotificationBell />
              <Button variant="ghost" size="icon-sm" onClick={signOut}>
                <LogOut className="size-3.5" />
              </Button>
            </div>
          </div>
        </aside>

        <main className="flex-1 min-w-0 bg-background pb-20 md:pb-0">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-16 backdrop-blur-md bg-white/90 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex items-center justify-around px-2 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] select-none">
        {[
          { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
          { to: '/admin/pgs', label: 'PGs', icon: Building, end: false },
          { to: '/admin/owners', label: 'Owners', icon: UserCheck, end: false },
          { to: '/admin/users', label: 'Seekers', icon: Users, end: false },
          { to: '/admin/transactions', label: 'Financials', icon: CreditCard, end: false },
        ].map(({ to, label, icon: Icon, end }) => {
          return (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => cn(
                'flex flex-col items-center justify-center flex-1 h-full py-1 text-[11px] transition-colors',
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="size-5 mb-1" />
              <span>{label}</span>
            </NavLink>
          )
        })}
      </nav>

      <div className="pb-20 md:pb-0">
        <Footer />
      </div>
    </div>
  )
}
