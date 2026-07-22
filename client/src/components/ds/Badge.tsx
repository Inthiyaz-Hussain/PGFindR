import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const dsBadgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border',
  {
    variants: {
      variant: {
        available:  'bg-success/10 text-success border-success/20 dark:bg-success/20',
        occupied:   'bg-danger/10 text-danger border-danger/20 dark:bg-danger/20',
        pending:    'bg-warning/10 text-warning-foreground border-warning/20 dark:bg-warning/20',
        active:     'bg-secondary/10 text-secondary border-secondary/20 dark:bg-secondary/20',
        suspended:  'bg-muted text-muted-foreground border-border',
        default:    'bg-primary/10 text-primary border-primary/20 dark:bg-primary/20',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface DSBadgeProps
  extends React.ComponentProps<'span'>,
    VariantProps<typeof dsBadgeVariants> {}

export function Badge({ className, variant, ...props }: DSBadgeProps) {
  return (
    <span
      data-slot="ds-badge"
      className={cn(dsBadgeVariants({ variant }), className)}
      {...props}
    />
  )
}
