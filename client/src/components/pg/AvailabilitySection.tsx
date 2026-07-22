import { useEffect, useState, useRef } from 'react'
import { BedSingle, BedDouble, Users, Warehouse, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type { SharingTypeItem } from '@/types'

const SHARING_CONFIG: Record<number, { label: string; icon: React.ElementType }> = {
  1: { label: 'Single Sharing', icon: BedSingle },
  2: { label: 'Double Sharing', icon: BedDouble },
  3: { label: 'Triple Sharing', icon: Users },
  4: { label: 'Dormitory', icon: Warehouse },
}

interface AvailabilitySectionProps {
  pgId: string
  initialSharingTypes: SharingTypeItem[]
  onSelect: (sharing: SharingTypeItem) => void
  selectedId?: string
}

export function AvailabilitySection({
  pgId,
  initialSharingTypes,
  onSelect,
  selectedId,
}: AvailabilitySectionProps) {
  const [sharingTypes, setSharingTypes] = useState<SharingTypeItem[]>(initialSharingTypes)
  const prevOccupiedRef = useRef<Record<string, number>>({})
  const toastThrottleRef = useRef(false)

  // Sync when initial data changes (e.g. React Query refetch)
  useEffect(() => {
    setSharingTypes(initialSharingTypes)
    const snapshot: Record<string, number> = {}
    for (const s of initialSharingTypes) {
      snapshot[s.id] = s.occupied_beds
    }
    prevOccupiedRef.current = snapshot
  }, [initialSharingTypes])

  // Subscribe to Supabase Realtime for this PG's sharing_types
  useEffect(() => {
    const channel = supabase
      .channel(`sharing_types:pg:${pgId}:${Math.random().toString(36).substring(7)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sharing_types',
          filter: `pg_id=eq.${pgId}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const newRow = payload.new as SharingTypeItem
            const prevOccupied = prevOccupiedRef.current[newRow.id] ?? newRow.occupied_beds
            const occupiedChanged = prevOccupied !== newRow.occupied_beds

            setSharingTypes((prev) =>
              prev.map((s) => (s.id === newRow.id ? newRow : s))
            )

            if (occupiedChanged) {
              prevOccupiedRef.current[newRow.id] = newRow.occupied_beds
              if (!toastThrottleRef.current) {
                toastThrottleRef.current = true
                toast.success('Bed availability just updated', {
                  description: 'The bed grid has been refreshed in real time.',
                })
                setTimeout(() => { toastThrottleRef.current = false }, 3000)
              }
            }
          } else if (payload.eventType === 'INSERT') {
            setSharingTypes((prev) => [...prev, payload.new as SharingTypeItem])
          } else if (payload.eventType === 'DELETE') {
            const oldRow = payload.old as SharingTypeItem
            setSharingTypes((prev) => prev.filter((s) => s.id !== oldRow.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [pgId])

  if (sharingTypes.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No sharing options available for this PG.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {sharingTypes.map((sharing) => {
        const config = SHARING_CONFIG[sharing.type] || { label: `${sharing.type}-Sharing`, icon: BedSingle }
        const Icon = config.icon
        const available = sharing.total_beds - sharing.occupied_beds
        const isFull = available <= 0

        return (
          <Card
            key={sharing.id}
            className={cn(
              'transition-all border-2',
              selectedId === sharing.id
                ? 'border-primary bg-primary/5'
                : 'border-transparent hover:border-border'
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="size-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm">{config.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {sharing.total_beds} beds total
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-lg font-bold">₹{sharing.price_monthly.toLocaleString('en-IN')}</div>
                  <div className="text-xs text-muted-foreground">per month</div>
                  {sharing.price_daily && (
                    <div className="text-xs text-muted-foreground">
                      ₹{sharing.price_daily.toLocaleString('en-IN')}/day
                    </div>
                  )}
                </div>
              </div>

              {/* Bed grid with flip animation on occupancy change */}
              <div className="mt-4">
                <div className="flex flex-wrap gap-1.5">
                  {Array.from({ length: sharing.total_beds }).map((_, i) => {
                    const isOccupied = i < sharing.occupied_beds
                    const wasOccupied = i < (prevOccupiedRef.current[sharing.id] ?? sharing.occupied_beds)
                    const justChanged = isOccupied !== wasOccupied

                    return (
                      <div
                        key={i}
                        className={cn(
                          'bed-cell h-6 w-8 rounded-md flex items-center justify-center text-[10px] font-medium',
                          'transition-all duration-500',
                          justChanged && 'bed-flip-animate',
                          isOccupied
                            ? 'bg-muted text-muted-foreground'
                            : 'bg-teal-500 text-white'
                        )}
                        title={isOccupied ? 'Occupied' : 'Available'}
                      >
                        {isOccupied ? '×' : '✓'}
                      </div>
                    )
                  })}
                </div>
                <div className="mt-2 flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-sm bg-teal-500" />
                    {available} available
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-sm bg-muted" />
                    {sharing.occupied_beds} occupied
                  </span>
                </div>
              </div>

              <div className="mt-3">
                <Button
                  size="sm"
                  className="w-full"
                  disabled={isFull}
                  variant={selectedId === sharing.id ? 'default' : 'outline'}
                  onClick={() => onSelect(sharing)}
                >
                  {selectedId === sharing.id ? (
                    <>
                      <CheckCircle2 className="size-4 mr-1" />
                      Selected
                    </>
                  ) : isFull ? (
                    'Fully Occupied'
                  ) : (
                    'Select'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
