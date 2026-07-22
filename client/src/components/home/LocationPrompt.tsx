import { useState } from 'react'
import { MapPin, Navigation, X, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { LocationState } from '@/types/filters'

const POPULAR_CITIES = [
  { name: 'Bangalore', lat: 12.9716, lng: 77.5946 },
  { name: 'Mumbai', lat: 19.0760, lng: 72.8777 },
  { name: 'Pune', lat: 18.5204, lng: 73.8567 },
  { name: 'Delhi', lat: 28.6139, lng: 77.2090 },
  { name: 'Hyderabad', lat: 17.3850, lng: 78.4867 },
  { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
  { name: 'Noida', lat: 28.5355, lng: 77.3910 },
  { name: 'Gurgaon', lat: 28.4595, lng: 77.0266 },
]

interface LocationPromptProps {
  open: boolean
  onSelect: (location: LocationState) => void
  onSkip: () => void
}

export function LocationPrompt({ open, onSelect, onSkip }: LocationPromptProps) {
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [manualCity, setManualCity] = useState('')
  const [filtered, setFiltered] = useState(POPULAR_CITIES)

  function handleCityInput(val: string) {
    setManualCity(val)
    const q = val.toLowerCase()
    setFiltered(
      q.length > 0
        ? POPULAR_CITIES.filter((c) => c.name.toLowerCase().startsWith(q))
        : POPULAR_CITIES
    )
  }

  function selectCity(city: (typeof POPULAR_CITIES)[0]) {
    onSelect({ lat: city.lat, lng: city.lng, city: city.name, radius: 5000 })
  }

  async function requestGPS() {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.')
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
          radius: 5000,
        })
        setGpsLoading(false)
      },
      (err) => {
        setGpsError(err.message || 'Could not get your location. Please choose a city.')
        setGpsLoading(false)
      },
      { timeout: 8000 }
    )
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-sm w-[92vw] rounded-2xl"
        onInteractOutside={(e) => e.preventDefault()}
        showCloseButton={false}
      >
        <DialogHeader className="text-center pb-0">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <MapPin className="size-6 text-primary" />
          </div>
          <DialogTitle className="text-xl">Where are you looking?</DialogTitle>
          <DialogDescription className="text-sm">
            Share your location for PGs near you, or pick a city
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* GPS button */}
          <Button
            className="w-full"
            onClick={requestGPS}
            disabled={gpsLoading}
          >
            <Navigation className={cn('size-4', gpsLoading && 'animate-spin')} />
            {gpsLoading ? 'Getting location…' : 'Use my current location'}
          </Button>

          {gpsError && (
            <p className="text-xs text-destructive text-center">{gpsError}</p>
          )}

          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or choose a city</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Manual city search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Type a city..."
              value={manualCity}
              onChange={(e) => handleCityInput(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>

          {/* City grid */}
          <div className="grid grid-cols-2 gap-2">
            {filtered.slice(0, 8).map((city) => (
              <button
                key={city.name}
                type="button"
                onClick={() => selectCity(city)}
                className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2.5 text-sm text-left transition-all hover:border-primary hover:bg-primary/5 active:scale-95"
              >
                <MapPin className="size-3.5 text-muted-foreground shrink-0" />
                <span className="font-medium truncate">{city.name}</span>
              </button>
            ))}
          </div>

          {/* Skip */}
          <button
            type="button"
            onClick={onSkip}
            className="w-full flex items-center justify-center gap-1 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="size-3" />
            Skip for now
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
