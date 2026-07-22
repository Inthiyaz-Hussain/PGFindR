import * as React from 'react'
import { NavLink } from 'react-router-dom'
import { Home, Search, MessageSquare, User } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface BottomNavItem {
  to: string
  label: string
  icon: React.ElementType
  badge?: number
}

const DEFAULT_ITEMS: BottomNavItem[] = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/my-inquiries', label: 'Inquiries', icon: MessageSquare },
  { to: '/seeker/profile', label: 'Profile', icon: User },
]

export interface DSBottomNavProps {
  items?: BottomNavItem[]
  className?: string
}

export function BottomNav({ items = DEFAULT_ITEMS, className }: DSBottomNavProps) {
  return (
    <nav
      aria-label="Main navigation"
      className={cn(
        'fixed bottom-0 inset-x-0 z-40 md:hidden',
        'border-t border-border bg-background/95 backdrop-blur-md',
        'safe-area-pb',
        className
      )}
    >
      <ul className="flex h-16 items-stretch" role="list">
        {items.map(({ to, label, icon: Icon, badge }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex h-full flex-col items-center justify-center gap-1 text-xs font-medium transition-colors',
                  isActive
                    ? 'text-primary dark:text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )
              }
              aria-label={label}
            >
              {({ isActive }) => (
                <>
                  <span className="relative">
                    <Icon
                      className={cn('size-5', isActive && 'fill-primary/20')}
                      aria-hidden="true"
                    />
                    {badge != null && badge > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white px-0.5">
                        {badge > 99 ? '99+' : badge}
                      </span>
                    )}
                  </span>
                  <span className="truncate">{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
