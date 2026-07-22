import * as React from 'react'
import { cn } from '@/lib/utils'

export interface DSSkeletonProps extends React.ComponentProps<'div'> {
  variant?: 'rect' | 'circle' | 'text'
  width?: string
  height?: string
}

export function Skeleton({ variant = 'rect', width, height, className, style, ...props }: DSSkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'animate-pulse bg-muted',
        variant === 'circle' ? 'rounded-full' : 'rounded-lg',
        variant === 'text' && 'h-4 rounded',
        className
      )}
      style={{ width, height, ...style }}
      {...props}
    />
  )
}

// Composed card-shaped skeleton
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-2xl border border-border bg-card p-5 space-y-3', className)} aria-busy="true" aria-label="Loading…">
      <Skeleton variant="rect" className="h-40 w-full" />
      <Skeleton variant="text" className="w-3/4" />
      <Skeleton variant="text" className="w-1/2" />
      <div className="flex gap-2">
        <Skeleton variant="rect" className="h-8 w-20" />
        <Skeleton variant="rect" className="h-8 w-20" />
      </div>
    </div>
  )
}

// Row list skeleton
export function SkeletonList({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-3', className)} aria-busy="true" aria-label="Loading…">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton variant="circle" className="size-10 shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" className="w-1/2" />
            <Skeleton variant="text" className="w-3/4" />
          </div>
        </div>
      ))}
    </div>
  )
}
