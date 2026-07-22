import * as React from 'react'
import { cn } from '@/lib/utils'

export interface DSCardProps extends React.ComponentProps<'div'> {
  hoverable?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export function Card({ hoverable = false, padding = 'md', className, ...props }: DSCardProps) {
  return (
    <div
      data-slot="ds-card"
      className={cn(
        'rounded-2xl border border-border bg-card text-card-foreground shadow-md',
        hoverable && 'transition-shadow duration-200 hover:shadow-lg cursor-pointer',
        padding === 'none' && 'p-0',
        padding === 'sm' && 'p-4',
        padding === 'md' && 'p-5',
        padding === 'lg' && 'p-7',
        className
      )}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('mb-4 flex flex-col gap-1', className)} {...props} />
}

export function CardTitle({ className, ...props }: React.ComponentProps<'h3'>) {
  return <h3 className={cn('text-lg font-semibold leading-tight text-foreground', className)} {...props} />
}

export function CardDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />
}

export function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('', className)} {...props} />
}

export function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('mt-4 flex items-center gap-3', className)} {...props} />
}
