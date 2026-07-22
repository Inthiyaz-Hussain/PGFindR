import * as React from 'react'
import { cn } from '@/lib/utils'

// Deterministic color from a string
function stringToColor(str: string): string {
  const palette = [
    'bg-primary/20 text-primary',
    'bg-secondary/20 text-secondary',
    'bg-warning/20 text-warning-foreground',
    'bg-success/20 text-success',
    'bg-danger/20 text-danger',
    'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  ]
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return palette[Math.abs(hash) % palette.length]
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('')
}

const sizeMap = {
  sm: 'size-7 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-14 text-base',
  xl: 'size-20 text-xl',
}

export interface DSAvatarProps {
  name?: string
  src?: string
  alt?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function Avatar({ name = 'User', src, alt, size = 'md', className }: DSAvatarProps) {
  const [imgError, setImgError] = React.useState(false)
  const colorClass = stringToColor(name)
  const text = initials(name)

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold select-none overflow-hidden',
        sizeMap[size],
        !src || imgError ? colorClass : '',
        className
      )}
      aria-label={alt ?? name}
      role="img"
    >
      {src && !imgError ? (
        <img
          src={src}
          alt={alt ?? name}
          className="size-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span aria-hidden="true">{text}</span>
      )}
    </span>
  )
}
