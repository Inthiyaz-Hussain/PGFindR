import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { Building2, LayoutDashboard, Users, UserCheck, CreditCard, Percent, LogOut, ChevronDown, ChevronRight, Building } from 'lucide-react'
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
    ],
  },
  {
    label: 'Management',
    items: [
      { to: '/admin/pgs', label: 'PG Listings', icon: Building, end: false },
      { to: '/admin/owners', label: 'Owners', icon: UserCheck, end: false },
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

  // Flatten all nav items for mobile
  const allNavItems = NAV_GROUPS.flatMap(g => g.items)

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="flex flex-1">
        <aside className="hidden md:flex w-60 flex-col border-r bg-sidebar text-sidebar-foreground">
          <div className="flex h-16 items-center gap-2 px-5 border-b border-sidebar-border">
            <Link to="/" className="flex items-center gap-2 font-bold">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                <Building2 className="size-3.5" />
              </div>
              PGFindR
            </Link>
            <span className="ml-auto text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 rounded px-1.5 py-0.5 font-medium">Admin</span>
          </div>

          <div className="flex-1 p-3 space-y-4">
            {NAV_GROUPS.map((group) => (
              <NavGroup key={group.label} label={group.label} items={group.items} />
            ))}
          </div>

          <div className="p-3 border-t border-sidebar-border">
            <div className="flex items-center gap-3 rounded-md p-2">
              <Avatar size="sm">
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{profile?.full_name}</div>
                <div className="text-xs text-sidebar-foreground/60">Administrator</div>
              </div>
              <NotificationBell />
              <Button variant="ghost" size="icon-sm" onClick={signOut}>
                <LogOut className="size-3.5" />
              </Button>
            </div>
          </div>
        </aside>

        <main className="flex-1 min-w-0 bg-background flex flex-col justify-between">
          <div className="flex-1">
            <Outlet />
          </div>
          <Footer />
        </main>
      </div>
    </div>
  )
}
