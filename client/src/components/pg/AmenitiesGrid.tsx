import { Wifi, Wind, UtensilsCrossed, Car, WashingMachine, Video, Zap, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

const AMENITY_MAP: Record<string, { label: string; icon: React.ElementType; image?: string }> = {
  wifi: { label: 'Wi-Fi', icon: Wifi, image: '/images/icon-wifi.png' },
  ac: { label: 'AC', icon: Wind, image: '/images/icon-ac.png' },
  food_veg: { label: 'Food', icon: UtensilsCrossed, image: '/images/icon-food.png' },
  food_nonveg: { label: 'Food', icon: UtensilsCrossed, image: '/images/icon-food.png' },
  laundry: { label: 'Laundry', icon: WashingMachine, image: '/images/icon-washing.png' },
  parking: { label: 'Parking', icon: Car, image: '/images/icon-parking.png' },
  cctv: { label: 'CCTV', icon: Video, image: '/images/icon-cctv.png' },
  generator: { label: 'Power Backup', icon: Zap, image: '/images/icon-power.png' },
  housekeeping: { label: 'Housekeeping', icon: Sparkles, image: '/images/icon-housekeeping.png' }
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
              'flex flex-col items-center justify-center gap-2 rounded-xl border p-4 transition-colors text-center',
              'border-border bg-card hover:bg-accent/50'
            )}
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center">
              {config.image ? (
                <img src={config.image} alt={config.label} className="w-10 h-10 object-contain drop-shadow-sm hover:scale-110 transition-transform" />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="size-5 text-primary" />
                </div>
              )}
            </div>
            <span className="text-sm font-medium">{config.label}</span>
          </div>
        )
      })}
    </div>
  )
}
