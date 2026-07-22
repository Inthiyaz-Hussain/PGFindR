import * as React from 'react'
import { cn } from '@/lib/utils'

export interface DSInputProps extends React.ComponentProps<'input'> {
  label?: string
  error?: string
  helper?: string
}

export function Input({ label, error, helper, className, id, ...props }: DSInputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-foreground"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : helper ? `${inputId}-helper` : undefined}
        className={cn(
          'h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-xs',
          'placeholder:text-muted-foreground',
          'transition-[color,box-shadow] outline-none',
          'focus-visible:border-secondary focus-visible:ring-2 focus-visible:ring-secondary/30',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'dark:bg-input/30',
          error && 'border-danger focus-visible:border-danger focus-visible:ring-danger/20',
          className
        )}
        {...props}
      />
      {error && (
        <p id={`${inputId}-error`} className="text-xs text-danger" role="alert">
          {error}
        </p>
      )}
      {!error && helper && (
        <p id={`${inputId}-helper`} className="text-xs text-muted-foreground">
          {helper}
        </p>
      )}
    </div>
  )
}
