import type { PGListing } from '@/types'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin, Wifi, Utensils, Wind, Car, Shield, BedDouble } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PGCardProps {
  pg: PGListing & { distance_meters?: number | null }
  liveAvailableBeds?: number | null
  className?: string
}

export function PGCard({ pg, liveAvailableBeds = null, className }: PGCardProps) {
  const primaryPhoto = pg.photos?.find((p) => p.is_primary) || pg.photos?.[0]
  const typeColor = { boys: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', girls: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200', 'co-ed': 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200' }

  function formatDistance(meters: number): string {
    if (meters < 1000) return `${Math.round(meters)}m`
    return `${(meters / 1000).toFixed(1)}km`
  }

  const available = liveAvailableBeds !== null ? liveAvailableBeds : pg.available_beds

  function getAvailabilityBadge() {
    if (available === 0) {
      return { label: 'Full', variant: 'secondary' as const, className: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200 border-red-200' }
    }
    if (available <= 2) {
      return { label: `${available} left`, variant: 'default' as const, className: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200 border-amber-200' }
    }
    return { label: `${available} beds`, variant: 'default' as const, className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200 border-emerald-200' }
  }

  const availabilityBadge = getAvailabilityBadge()

  const amenityIcons = [
    { show: pg.wifi_included, Icon: Wifi, label: 'WiFi' },
    { show: pg.food_included, Icon: Utensils, label: 'Food' },
    { show: pg.ac_rooms, Icon: Wind, label: 'AC' },
    { show: pg.parking, Icon: Car, label: 'Parking' },
    { show: pg.security_24x7, Icon: Shield, label: 'Security' },
  ].filter((a) => a.show)

  return (
    <Link to={`/pg/${pg.id}`}>
      <Card className={cn('group overflow-hidden transition-all hover:shadow-md py-0 gap-0', className)}>
        {/* Photo */}
        <div className="relative h-48 overflow-hidden bg-muted">
          {primaryPhoto ? (
            <img
              src={primaryPhoto.url}
              alt={pg.name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-muted">
              <BedDouble className="size-12 text-muted-foreground/30" />
            </div>
          )}
          <div className="absolute top-3 left-3">
            <Badge className={cn('border-0 text-xs font-medium', typeColor[pg.pg_type])}>
              {pg.pg_type === 'co-ed' ? 'Co-ed' : pg.pg_type === 'boys' ? 'Boys' : 'Girls'}
            </Badge>
          </div>
          <div className="absolute top-3 right-3">
            <Badge variant={availabilityBadge.variant} className={cn('text-xs border', availabilityBadge.className)}>
              {availabilityBadge.label}
            </Badge>
          </div>
          {pg.distance_meters != null && (
            <div className="absolute bottom-3 right-3">
              <Badge variant="secondary" className="text-xs bg-background/80 backdrop-blur-sm">
                {formatDistance(pg.distance_meters)} away
              </Badge>
            </div>
          )}
        </div>

        <CardContent className="p-4">
          <h3 className="font-semibold text-base leading-snug line-clamp-1 group-hover:text-primary transition-colors">
            {pg.name}
          </h3>
          <div className="mt-1.5 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" />
            <span className="line-clamp-1">{pg.locality}, {pg.city}</span>
          </div>

          {/* Amenities */}
          {amenityIcons.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {amenityIcons.slice(0, 4).map(({ Icon, label }) => (
                <div key={label} className="flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                  <Icon className="size-3" />
                  {label}
                </div>
              ))}
              {amenityIcons.length > 4 && (
                <div className="flex items-center rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                  +{amenityIcons.length - 4}
                </div>
              )}
            </div>
          )}

          {/* Price */}
          <div className="mt-3 flex items-end justify-between">
            <div>
              <span className="text-lg font-bold">
                ₹{pg.monthly_rent_min.toLocaleString('en-IN')}
              </span>
              {pg.monthly_rent_max > pg.monthly_rent_min && (
                <span className="text-sm text-muted-foreground">
                  {' '}– ₹{pg.monthly_rent_max.toLocaleString('en-IN')}
                </span>
              )}
              <span className="text-xs text-muted-foreground">/month</span>
            </div>
            {pg.deposit_amount > 0 && (
              <span className="text-xs text-muted-foreground">
                ₹{pg.deposit_amount.toLocaleString('en-IN')} deposit
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
