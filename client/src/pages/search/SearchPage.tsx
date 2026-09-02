import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, SlidersHorizontal, X, Filter, Navigation, Building2, Wifi, Utensils, Snowflake, Car, Shirt, ShieldCheck, User, Users, BedDouble } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useQuery } from '@tanstack/react-query'
import type { PGListing } from '@/types'
import { PGCard } from '@/components/pg/PGCard'
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
import { type LocationState } from '@/types/filters'
import { POPULAR_CITIES } from '@/components/home/LocationPrompt'
import { cn } from '@/lib/utils'

const AMENITIES = [
  { id: 'wifi_included', label: 'WiFi', icon: Wifi },
  { id: 'food_included', label: 'Food Included', icon: Utensils },
  { id: 'ac_rooms', label: 'AC Rooms', icon: Snowflake },
  { id: 'parking', label: 'Parking', icon: Car },
  { id: 'laundry', label: 'Laundry', icon: Shirt },
  { id: 'security_24x7', label: '24x7 Security', icon: ShieldCheck },
]

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const searchQuery = searchParams.get('q') || ''
  const [query, setQuery] = useState(searchQuery)
  const [inputValue, setInputValue] = useState(searchQuery)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const searchContainerRef = useRef<HTMLDivElement>(null)
  const [pgType, setPgType] = useState<string>(searchParams.get('type') || 'all')
  const [amenities, setAmenities] = useState<Set<string>>(new Set())
  const [sharingTypes, setSharingTypes] = useState<Set<string>>(new Set())
  const [availableOnly, setAvailableOnly] = useState(false)
  const [maxRent, setMaxRent] = useState<string>('')
  const [filterOpen, setFilterOpen] = useState(false)

  // Use refs for latest state in scroll handler
  const pageRef = useRef(1)
  const hasMoreRef = useRef(true)

  // Sync internal input value with URL query param if it changes
  useEffect(() => {
    setInputValue(searchQuery)
  }, [searchQuery])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const q = searchParams.get('q') || ''
    setQuery(q)
    setInputValue(q)
  }, [searchParams])

  const [selectedCity, setSelectedCity] = useState('')
  const [gpsLoading, setGpsLoading] = useState(false)

  useEffect(() => {
    try {
      const locStr = localStorage.getItem('pgr_location')
      if (locStr) {
        const loc = JSON.parse(locStr)
        setSelectedCity(loc.city || '')
      }
    } catch (e) {
      console.warn('Failed to load location from storage:', e)
    }
  }, [])

  function handleLocationSelect(newLocation: LocationState) {
    setSelectedCity(newLocation.city || '')
    localStorage.setItem('pgr_location', JSON.stringify(newLocation))
  }

  function requestGPS() {
    if (!navigator.geolocation) {
      console.warn('Geolocation is not supported')
      return
    }
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handleLocationSelect({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          city: 'Near me',
          radius: 25000,
        })
        setGpsLoading(false)
      },
      (err) => {
        console.warn(err.message || 'Could not get location')
        setGpsLoading(false)
      },
      { timeout: 8000 }
    )
  }

  const { data: pgs, isLoading } = useQuery({
    queryKey: ['search-pgs', query, pgType, Array.from(amenities), Array.from(sharingTypes), availableOnly, maxRent, selectedCity],
    queryFn: async () => {
      const params = new URLSearchParams()
      
      try {
        const locStr = localStorage.getItem('pgr_location')
        if (locStr) {
          const loc = JSON.parse(locStr)
          if (loc.lat != null && loc.lng != null) {
            params.set('lat', String(loc.lat))
            params.set('lng', String(loc.lng))
            params.set('radius', String(loc.radius || 25000))
          }
        }
      } catch (e) {
        console.warn('Failed to parse local location:', e)
      }

      if (query) params.set('q', query)
      if (pgType !== 'all') params.set('gender', pgType)
      if (maxRent && Number(maxRent) > 0) params.set('max_price', maxRent)
      if (availableOnly) params.set('available_only', 'true')
      
      const amenityArray = Array.from(amenities)
      if (amenityArray.length > 0) {
        params.set('amenities', amenityArray.join(','))
      }

      const sharingArray = Array.from(sharingTypes)
      if (sharingArray.length > 0) {
        params.set('sharing', sharingArray.join(','))
      }

      params.set('limit', '50')

      const rawUrl = import.meta.env.VITE_API_URL || 'https://swiftpg-backend.onrender.com'
      const baseUrl = rawUrl.replace(/\/api\/?$/, '').replace(/\/$/, '')
      const res = await fetch(`${baseUrl}/api/pgs?${params}`)
      
      if (!res.ok) {
        throw new Error('Failed to fetch filtered PGs')
      }
      
      const result = await res.json()
      return (result.data || []) as PGListing[]
    },
  })

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const cleanInput = inputValue.trim().toLowerCase()
    const matchedCity = POPULAR_CITIES.find(
      (c) => c.name.toLowerCase() === cleanInput
    )

    if (matchedCity) {
      handleLocationSelect({
        lat: matchedCity.lat,
        lng: matchedCity.lng,
        city: matchedCity.name,
        radius: 25000,
      })
      setQuery('')
      setInputValue('')
      setSearchParams({})
    } else {
      setQuery(inputValue)
      setSearchParams(inputValue ? { q: inputValue } : {})
    }
  }

  function toggleAmenity(id: string) {
    setAmenities((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSharingType(id: string) {
    setSharingTypes((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const activeFilters = amenities.size + sharingTypes.size + (pgType !== 'all' ? 1 : 0) + (maxRent ? 1 : 0) + (availableOnly ? 1 : 0)

  function renderFilters() {
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <Label className="text-sm font-medium">PG Type</Label>
          <Select value={pgType} onValueChange={setPgType}>
            <SelectTrigger>
              <SelectValue placeholder="Any type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any type</SelectItem>
              <SelectItem value="boys">Boys</SelectItem>
              <SelectItem value="girls">Girls</SelectItem>
              <SelectItem value="co-ed">Coliving</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        <div className="space-y-3">
          <Label className="text-sm font-medium">Max Monthly Rent (₹)</Label>
          <Input
            type="number"
            placeholder="e.g. 15000"
            value={maxRent}
            min={1}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '') {
                setMaxRent('');
              } else {
                const num = parseFloat(val);
                if (num >= 1) {
                  setMaxRent(String(num));
                }
              }
            }}
          />
        </div>

        <Separator />

        <div className="space-y-3">
          <Label className="text-sm font-medium">Amenities</Label>
          <div className="space-y-2.5">
            {AMENITIES.map(({ id, label, icon: Icon }) => (
              <div key={id} className="flex items-center gap-2">
                <Checkbox
                  id={id}
                  checked={amenities.has(id)}
                  onCheckedChange={() => toggleAmenity(id)}
                />
                <Label htmlFor={id} className="font-normal cursor-pointer flex items-center gap-1.5">
                  <Icon className="size-3.5 text-muted-foreground" />
                  {label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <Label className="text-sm font-medium">Room Sharing</Label>
          <div className="space-y-2.5">
            {[
              { id: '1', label: 'Single Room', icon: User },
              { id: '2', label: 'Double Sharing', icon: Users },
              { id: '3', label: 'Triple Sharing', icon: Users },
              { id: '4', label: '4 Sharing', icon: BedDouble },
            ].map(({ id, label, icon: Icon }) => (
              <div key={id} className="flex items-center gap-2">
                <Checkbox
                  id={`sharing-${id}`}
                  checked={sharingTypes.has(id)}
                  onCheckedChange={() => toggleSharingType(id)}
                />
                <Label htmlFor={`sharing-${id}`} className="font-normal cursor-pointer flex items-center gap-1.5">
                  <Icon className="size-3.5 text-muted-foreground" />
                  {label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        <div className="flex items-center gap-2 py-1">
          <Checkbox
            id="availableOnly"
            checked={availableOnly}
            onCheckedChange={(checked) => setAvailableOnly(!!checked)}
          />
          <Label htmlFor="availableOnly" className="font-medium cursor-pointer">Only Show Available Beds</Label>
        </div>

        {activeFilters > 0 && (
          <>
            <Separator />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { 
                setAmenities(new Set()); 
                setSharingTypes(new Set());
                setAvailableOnly(false);
                setPgType('all'); 
                setMaxRent(''); 
              }}
              className="w-full text-muted-foreground"
            >
              <X className="size-4" /> Clear all filters
            </Button>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Search Bar */}
      <form id="search-form" onSubmit={handleSearch} className="flex gap-2 mb-6">
        <div className="relative flex-1" ref={searchContainerRef}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by city, locality, or PG name..."
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value)
              if (e.target.value.length >= 2) {
                const controller = new AbortController()
                const rawUrl = import.meta.env.VITE_API_URL || 'https://swiftpg-backend.onrender.com'
                const baseUrl = rawUrl.replace(/\/api\/?$/, '').replace(/\/$/, '')
                fetch(`${baseUrl}/api/pgs/cities?q=${encodeURIComponent(e.target.value)}`, {
                  signal: controller.signal,
                })
                  .then((res) => res.json())
                  .then((data: string[]) => {
                    setSuggestions(data)
                    setShowSuggestions(data.length > 0)
                  })
                  .catch(() => {})
              } else {
                setSuggestions([])
                setShowSuggestions(false)
              }
            }}
            onFocus={() => {
              if (suggestions.length > 0) setShowSuggestions(true)
            }}
            className="pl-10"
          />
          {/* Autocomplete dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-auto rounded-lg border bg-background shadow-lg">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => {
                    setInputValue(suggestion)
                    setShowSuggestions(false)
                    // Trigger search automatically if they select an option
                    setTimeout(() => {
                      document.getElementById('search-form')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
                    }, 0)
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-left hover:bg-accent"
                >
                  <Search className="size-3.5 text-muted-foreground shrink-0" />
                  <span>{suggestion}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={requestGPS}
          disabled={gpsLoading}
          className={cn(
            "flex items-center gap-1.5 cursor-pointer h-9 md:h-10 text-xs sm:text-sm font-medium border-slate-200 dark:border-slate-800 shrink-0",
            selectedCity === 'Near me' && "bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/20 dark:border-indigo-800 dark:text-indigo-400"
          )}
        >
          <Navigation className={cn("size-3.5 text-primary shrink-0", gpsLoading && "animate-spin", selectedCity === 'Near me' && "text-indigo-600 dark:text-indigo-400")} />
          <span>{gpsLoading ? 'Locating...' : selectedCity === 'Near me' ? 'Current Location' : 'Use Current Location'}</span>
        </Button>
        <Button type="submit">Search</Button>
        {/* Mobile Filter Button */}
        <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="md:hidden relative">
              <Filter className="size-4" />
              {activeFilters > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
                  {activeFilters}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              {renderFilters()}
            </div>
          </SheetContent>
        </Sheet>
      </form>

      <div className="flex gap-6">
        {/* Desktop Filters Sidebar */}
        <aside className="hidden md:block w-60 shrink-0">
          <div className="sticky top-24 rounded-lg border bg-card p-5">
            <div className="flex items-center gap-2 mb-5">
              <SlidersHorizontal className="size-4" />
              <h2 className="font-semibold">Filters</h2>
              {activeFilters > 0 && (
                <Badge variant="secondary" className="ml-auto text-xs">{activeFilters} active</Badge>
              )}
            </div>
            {renderFilters()}
          </div>
        </aside>

        {/* Results */}
        <main className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {isLoading ? 'Searching...' : `${pgs?.length || 0} PGs found`}
              {query && <span className="font-medium text-foreground"> for "{query}"</span>}
              {!query && selectedCity && <span className="font-medium text-foreground"> in {selectedCity}</span>}
            </p>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-xl border bg-card overflow-hidden">
                  <Skeleton className="h-48 w-full rounded-none" />
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : pgs && pgs.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {pgs.map((pg) => (
                <PGCard key={pg.id} pg={pg} />
              ))}
            </div>
          ) : (
            <Empty className="border-dashed">
              <EmptyMedia variant="icon">
                <Building2 />
              </EmptyMedia>
              <EmptyTitle>No PGs found</EmptyTitle>
              <EmptyDescription>
                Try adjusting your search or filters. More PGs are being added daily.
              </EmptyDescription>
              <Button variant="outline" onClick={() => { setQuery(''); setInputValue(''); setSearchParams({}); setAmenities(new Set()); setPgType('all'); setMaxRent('') }}>
                Clear search
              </Button>
            </Empty>
          )}
        </main>
      </div>


    </div>
  )
}
