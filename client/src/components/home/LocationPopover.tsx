import { useState } from 'react'
import { Navigation, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { LocationState } from '@/types/filters'
import { POPULAR_CITIES } from '@/components/home/LocationPrompt'

interface LocationPopoverProps {
  selectedCity: string
  onSelect: (location: LocationState) => void
  align?: 'start' | 'center' | 'end'
  variant?: 'compact' | 'full'
}

export function LocationPopover({
  selectedCity,
  onSelect,
  align = 'end',
  variant = 'compact',
}: LocationPopoverProps) {
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  async function requestGPS() {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported')
      return
    }
    setGpsLoading(true)
    setGpsError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onSelect({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          city: 'Near me',
          radius: 25000,
        })
        setGpsLoading(false)
        setOpen(false)
      },
      (err) => {
        setGpsError(err.message || 'Could not get location')
        setGpsLoading(false)
      },
      { timeout: 8000 }
    )
  }

  const computedAlign = variant === 'full' ? 'start' : align

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {variant === 'full' ? (
          <button
            type="button"
            className="w-full flex items-center gap-2 rounded-xl border bg-card px-4 py-3 text-left transition-all hover:border-primary hover:bg-accent cursor-pointer"
          >
            <MapPin className="size-4 text-primary shrink-0" />
            <span className="flex-1 text-sm">
              {selectedCity ? (
                <span className="text-foreground font-medium">{selectedCity}</span>
              ) : (
                <span className="text-muted-foreground">Select your location</span>
              )}
            </span>
            <span className="text-xs text-muted-foreground">Change</span>
          </button>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="flex items-center gap-1.5 cursor-pointer h-9 md:h-10"
          >
            <MapPin className="size-4 text-primary shrink-0" />
            <span className="max-w-[120px] truncate font-medium text-xs sm:text-sm">
              {selectedCity || 'Location'}
            </span>
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3 space-y-3 rounded-2xl border bg-popover shadow-xl" align={computedAlign}>
        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full flex items-center justify-start gap-2 h-9 text-sm font-medium border-slate-200 cursor-pointer"
            onClick={requestGPS}
            disabled={gpsLoading}
          >
            <Navigation className={cn('size-4 text-primary shrink-0', gpsLoading && 'animate-spin')} />
            <span className="truncate">{gpsLoading ? 'Locating...' : 'Use my current location'}</span>
          </Button>

          {gpsError && (
            <p className="text-[10px] text-destructive text-center font-medium leading-none mt-1">{gpsError}</p>
          )}

          <div className="flex items-center gap-2 py-1">
            <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
            <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">or choose a city</span>
            <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {POPULAR_CITIES.map((city) => (
              <button
                key={city.name}
                type="button"
                onClick={() => {
                  onSelect({ lat: city.lat, lng: city.lng, city: city.name, radius: 25000 })
                  setOpen(false)
                }}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg border bg-card px-2.5 py-2 text-xs text-left transition-all hover:border-primary hover:bg-primary/5 active:scale-95 duration-100 cursor-pointer",
                  selectedCity === city.name && "border-primary bg-primary/5 text-primary font-bold"
                )}
              >
                <MapPin className="size-3 text-muted-foreground shrink-0" />
                <span className="font-semibold truncate">{city.name}</span>
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
