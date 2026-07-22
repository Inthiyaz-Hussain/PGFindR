import { Wifi, Wind, UtensilsCrossed, Car, WashingMachine, Video, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

const AMENITY_MAP: Record<string, { label: string; icon: React.ElementType }> = {
  wifi: { label: 'WiFi', icon: Wifi },
  ac: { label: 'AC', icon: Wind },
  food_veg: { label: 'Food (Veg)', icon: UtensilsCrossed },
  food_nonveg: { label: 'Food (Non-Veg)', icon: UtensilsCrossed },
  laundry: { label: 'Laundry', icon: WashingMachine },
  parking: { label: 'Parking', icon: Car },
  cctv: { label: 'CCTV', icon: Video },
  generator: { label: 'Generator', icon: Zap },
}

interface AmenityItem {
  key: string
  is_available: boolean
}

interface AmenitiesGridProps {
  amenities: AmenityItem[]
}

export function AmenitiesGrid({ amenities }: AmenitiesGridProps) {
  const available = amenities.filter((a) => a.is_available)

  if (available.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No amenities listed yet.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {available.map((item) => {
        const config = AMENITY_MAP[item.key] || { label: item.key, icon: Zap }
        const Icon = config.icon
        return (
          <div
            key={item.key}
            className={cn(
              'flex items-center gap-3 rounded-xl border p-4 transition-colors',
              'border-border bg-card hover:bg-accent/50'
            )}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="size-4 text-primary" />
            </div>
            <span className="text-sm font-medium">{config.label}</span>
          </div>
        )
      })}
    </div>
  )
}
