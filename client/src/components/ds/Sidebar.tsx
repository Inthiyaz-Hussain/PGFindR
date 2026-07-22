import * as React from 'react'
import { NavLink } from 'react-router-dom'
import { Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────────────────────────
export interface SidebarItem {
  to: string
  label: string
  icon: React.ElementType
  end?: boolean
  badge?: number
}

export interface SidebarGroup {
  label?: string
  items: SidebarItem[]
}

export interface DSSidebarProps {
  groups: SidebarGroup[]
  brandLabel?: string
  brandTo?: string
  roleBadge?: string
  footer?: React.ReactNode
  collapsed?: boolean
  className?: string
}

// ── NavItem ────────────────────────────────────────────────────────────────
function SidebarNavItem({ item, collapsed }: { item: SidebarItem; collapsed?: boolean }) {
  const Icon = item.icon
  return (
    <li>
      <NavLink
        to={item.to}
        end={item.end}
        aria-label={item.label}
        className={({ isActive }) =>
          cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
            isActive
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground',
            collapsed && 'justify-center px-2'
          )
        }
      >
        <Icon className="size-4 shrink-0" aria-hidden="true" />
        {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
        {!collapsed && item.badge != null && item.badge > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary/20 text-secondary text-xs font-bold px-1">
            {item.badge}
          </span>
        )}
      </NavLink>
    </li>
  )
}

// ── Sidebar ────────────────────────────────────────────────────────────────
export function Sidebar({
  groups,
  brandLabel = 'PGFindR',
  brandTo = '/',
  roleBadge,
  footer,
  collapsed = false,
  className,
}: DSSidebarProps) {
  return (
    <aside
      aria-label="Sidebar navigation"
      className={cn(
        'hidden md:flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground',
        'transition-[width] duration-200',
        collapsed ? 'w-16' : 'w-64',
        className
      )}
    >
      {/* Brand */}
      <div className="flex h-16 items-center gap-2 px-4 border-b border-sidebar-border shrink-0">
        <NavLink to={brandTo} className="flex items-center gap-2 font-bold text-sidebar-foreground">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Building2 className="size-4" aria-hidden="true" />
          </div>
          {!collapsed && <span className="truncate">{brandLabel}</span>}
        </NavLink>
        {!collapsed && roleBadge && (
          <span className="ml-auto rounded bg-secondary/20 text-secondary text-xs font-semibold px-1.5 py-0.5">
            {roleBadge}
          </span>
        )}
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-5" aria-label="Navigation sections">
        {groups.map((group, gi) => (
          <section key={gi} aria-labelledby={group.label ? `nav-group-${gi}` : undefined}>
            {group.label && !collapsed && (
              <p
                id={`nav-group-${gi}`}
                className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40"
              >
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5" role="list">
              {group.items.map((item) => (
                <SidebarNavItem key={item.to} item={item} collapsed={collapsed} />
              ))}
            </ul>
          </section>
        ))}
      </nav>

      {/* Footer slot */}
      {footer && (
        <div className="border-t border-sidebar-border p-3 shrink-0">{footer}</div>
      )}
    </aside>
  )
}
