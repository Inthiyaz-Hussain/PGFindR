import { NavLink, Outlet } from 'react-router-dom'
import { Building2, Search, MessageSquare, BedDouble, User, LogOut } from 'lucide-react'
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
  { to: '/seeker', label: 'Dashboard', icon: Building2, end: true },
  { to: '/seeker/inquiries', label: 'My Inquiries', icon: MessageSquare, end: false },
  { to: '/seeker/bookings', label: 'My Bookings', icon: BedDouble, end: false },
  { to: '/seeker/profile', label: 'Profile', icon: User, end: false },
]

export function SeekerLayout() {
  const { user, profile, signOut } = useAuth()
  useFirebasePush()

  const seekerName = profile?.full_name || localStorage.getItem('seeker_fullName') || 'Guest Seeker'
  const initials = seekerName
    ? seekerName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'GS'

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="hidden md:flex w-60 flex-col border-r bg-sidebar text-sidebar-foreground pt-4">
          <div className="flex-1 p-3 space-y-1">
            {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
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
                {label}
              </NavLink>
            ))}

            <Separator className="my-2 bg-sidebar-border" />

            <NavLink
              to="/search"
              className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
            >
              <Search className="size-4 shrink-0" />
              Find PGs
            </NavLink>
          </div>

          <div className="p-3 border-t border-sidebar-border">
            <div className="flex items-center gap-3 rounded-md p-2">
              <Avatar size="sm">
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{seekerName}</div>
                <div className="text-xs text-sidebar-foreground/60">Seeker</div>
              </div>
              {user && (
                <>
                  <NotificationBell />
                  <Button variant="ghost" size="icon-sm" onClick={signOut} title="Sign out">
                    <LogOut className="size-3.5" />
                  </Button>
                </>
              )}
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
