import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import { cn } from '@/lib/utils'

const dsButtonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-secondary/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:bg-primary/95',
        secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/90 active:bg-secondary/95',
        outline: 'border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50',
        ghost: 'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
        danger: 'bg-danger text-danger-foreground shadow-sm hover:bg-danger/90 focus-visible:ring-danger/30',
      },
      size: {
        sm: 'h-8 px-3 text-sm has-[>svg]:px-2.5',
        md: 'h-10 px-5 text-sm has-[>svg]:px-4',
        lg: 'h-12 px-7 text-base has-[>svg]:px-6',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
)

export interface DSButtonProps
  extends React.ComponentProps<'button'>,
    VariantProps<typeof dsButtonVariants> {
  loading?: boolean
  asChild?: boolean
}

export function Button({
  className,
  variant,
  size,
  loading = false,
  asChild = false,
  disabled,
  children,
  ...props
}: DSButtonProps) {
  const Comp = asChild ? Slot.Root : 'button'
  return (
    <Comp
      data-slot="ds-button"
      data-variant={variant}
      className={cn(dsButtonVariants({ variant, size, className }))}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
      ) : null}
      {children}
    </Comp>
  )
}

export { dsButtonVariants }
