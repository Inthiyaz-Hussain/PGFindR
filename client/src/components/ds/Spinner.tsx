import { cn } from '@/lib/utils'

export interface DSSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  label?: string
}

const sizeMap = { sm: 'size-4 border-2', md: 'size-7 border-[3px]', lg: 'size-11 border-4' }

export function Spinner({ size = 'md', className, label = 'Loading…' }: DSSpinnerProps) {
  return (
    <span className={cn('inline-flex items-center justify-center', className)} role="status" aria-label={label}>
      <span
        className={cn(
          'animate-spin rounded-full border-secondary border-t-transparent',
          sizeMap[size]
        )}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </span>
  )
}
