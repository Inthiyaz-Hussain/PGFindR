import * as React from 'react'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────────────────────────
export type ToastVariant = 'success' | 'error' | 'info'

export interface ToastItem {
  id: string
  variant: ToastVariant
  title: string
  description?: string
  duration?: number
}

interface ToastContextValue {
  toast: (opts: Omit<ToastItem, 'id'>) => void
  dismiss: (id: string) => void
}

// ── Context ────────────────────────────────────────────────────────────────
const ToastContext = React.createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}

// ── Single toast UI ────────────────────────────────────────────────────────
const icons: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle2 className="size-5 text-success" />,
  error:   <XCircle className="size-5 text-danger" />,
  info:    <Info className="size-5 text-secondary" />,
}

const borders: Record<ToastVariant, string> = {
  success: 'border-l-success',
  error:   'border-l-danger',
  info:    'border-l-secondary',
}

function ToastUI({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'flex items-start gap-3 rounded-xl border border-border bg-background shadow-lg',
        'border-l-4 p-4 w-80 max-w-[calc(100vw-2rem)]',
        'animate-in slide-in-from-right-5 fade-in-0 duration-300',
        borders[item.variant]
      )}
    >
      {icons[item.variant]}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{item.title}</p>
        {item.description && (
          <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
        )}
      </div>
      <button
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="text-muted-foreground hover:text-foreground transition-colors rounded p-0.5"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}

// ── Provider ───────────────────────────────────────────────────────────────
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([])

  const dismiss = React.useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = React.useCallback((opts: Omit<ToastItem, 'id'>) => {
    const id = Math.random().toString(36).slice(2)
    const duration = opts.duration ?? 4000
    setItems((prev) => [...prev, { ...opts, id }])
    setTimeout(() => dismiss(id), duration)
  }, [dismiss])

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <div
        aria-label="Notifications"
        className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 items-end pointer-events-none"
      >
        {items.map((item) => (
          <div key={item.id} className="pointer-events-auto">
            <ToastUI item={item} onDismiss={() => dismiss(item.id)} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
