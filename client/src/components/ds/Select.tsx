import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface DSSelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface DSSelectProps extends Omit<React.ComponentProps<'select'>, 'children'> {
  label?: string
  options: DSSelectOption[]
  placeholder?: string
  error?: string
  helper?: string
}

export function Select({
  label,
  options,
  placeholder,
  error,
  helper,
  className,
  id,
  ...props
}: DSSelectProps) {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          aria-invalid={!!error}
          className={cn(
            'h-10 w-full appearance-none rounded-lg border border-input bg-background pl-3 pr-9 text-sm shadow-xs',
            'transition-[color,box-shadow] outline-none',
            'focus-visible:border-secondary focus-visible:ring-2 focus-visible:ring-secondary/30',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'dark:bg-input/30',
            error && 'border-danger focus-visible:border-danger focus-visible:ring-danger/20',
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
          aria-hidden="true"
        />
      </div>
      {error && <p className="text-xs text-danger" role="alert">{error}</p>}
      {!error && helper && <p className="text-xs text-muted-foreground">{helper}</p>}
    </div>
  )
}
