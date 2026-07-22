import { MapPin, Star, Navigation } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface PGHeaderProps {
  name: string
  address: string
  city: string
  locality: string
  latitude: number | null
  longitude: number | null
  pg_type: string
  avg_rating: number
  review_count: number
}

export function PGHeader({
  name,
  address,
  city,
  locality,
  latitude,
  longitude,
  pg_type,
  avg_rating,
  review_count,
}: PGHeaderProps) {
  const genderConfig = {
    boys: { label: 'Boys PG', class: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900' },
    girls: { label: 'Girls PG', class: 'bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-950 dark:text-pink-300 dark:border-pink-900' },
    'co-ed': { label: 'Co-ed PG', class: 'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-900' },
  } as const

  const gender = genderConfig[pg_type as keyof typeof genderConfig] || genderConfig['co-ed']

  function formatDistance() {
    if (!latitude || !longitude) return null
    // Distance display would be computed from user location; placeholder
    return null
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-start gap-3">
        <h1 className="scroll-m-20 text-2xl md:text-3xl font-bold tracking-tight flex-1">
          {name}
        </h1>
        <Badge variant="outline" className={cn('text-sm shrink-0', gender.class)}>
          {gender.label}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <MapPin className="size-4 shrink-0" />
          <span className="text-sm">{address}, {locality}, {city}</span>
        </div>

        {formatDistance() && (
          <div className="flex items-center gap-1.5 text-sm">
            <Navigation className="size-4 shrink-0" />
            <span>{formatDistance()}</span>
          </div>
        )}
      </div>

      {/* Rating */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <Star className="size-4 fill-amber-400 text-amber-400" />
          <span className="text-sm font-semibold">{avg_rating > 0 ? avg_rating.toFixed(1) : 'New'}</span>
        </div>
        {review_count > 0 && (
          <span className="text-sm text-muted-foreground">({review_count} reviews)</span>
        )}
      </div>
    </div>
  )
}
