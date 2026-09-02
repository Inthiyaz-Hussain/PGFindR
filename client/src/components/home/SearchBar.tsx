import { useState, useEffect, useRef } from 'react'
import { Search, MapPin, SlidersHorizontal, X, Navigation } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import type { SearchFilters, LocationState } from '@/types/filters'
import { countActiveFilters } from '@/types/filters'
import { cn } from '@/lib/utils'

interface SearchBarProps {
  location: LocationState
  filters: SearchFilters
  onLocationSelect: (location: LocationState) => void
  onFilterClick: () => void
  onSearchChange: (query: string) => void
  onSearchFocus?: () => void
}

export function SearchBar({
  location,
  filters,
  onLocationSelect,
  onFilterClick,
  onSearchChange,
  onSearchFocus,
}: SearchBarProps) {
  const [query, setQuery] = useState(filters.query)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const activeFilterCount = countActiveFilters(filters)

  const [gpsLoading, setGpsLoading] = useState(false)

  function requestGPS() {
    if (!navigator.geolocation) {
      console.warn('Geolocation is not supported')
      return
    }
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onLocationSelect({
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

  useEffect(() => {
    setQuery(filters.query)
  }, [filters.query])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    const controller = new AbortController()
    const rawUrl = import.meta.env.VITE_API_URL || 'https://swiftpg-backend.onrender.com'
    const baseUrl = rawUrl.replace(/\/api\/?$/, '').replace(/\/$/, '')

    fetch(`${baseUrl}/api/pgs/cities?q=${encodeURIComponent(query)}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data: string[]) => {
        setSuggestions(data)
        setShowSuggestions(data.length > 0)
      })
      .catch(() => { })

    return () => controller.abort()
  }, [query])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSearchChange(query)
    setShowSuggestions(false)
  }

  function selectSuggestion(suggestion: string) {
    setQuery(suggestion)
    onSearchChange(suggestion)
    setShowSuggestions(false)
    inputRef.current?.blur()
  }

  function clearSearch() {
    setQuery('')
    onSearchChange('')
    inputRef.current?.focus()
  }

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        onClick={requestGPS}
        disabled={gpsLoading}
        className={cn(
          "w-full flex items-center justify-center gap-2 rounded-xl border bg-card px-4 py-3 h-12 text-sm font-medium hover:border-primary hover:bg-accent cursor-pointer",
          location.city === 'Near me' && "bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/20 dark:border-indigo-800 dark:text-indigo-400"
        )}
      >
        <Navigation className={cn("size-4 text-primary shrink-0", gpsLoading && "animate-spin", location.city === 'Near me' && "text-indigo-600 dark:text-indigo-400")} />
        <span>{gpsLoading ? 'Locating...' : location.city === 'Near me' ? 'Using Current Location' : 'Use Current Location'}</span>
      </Button>

      {/* Search Input + Filter */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div ref={containerRef} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Search relevant area / location (e.g., Ban...)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={(e) => {
              if (onSearchFocus) {
                e.preventDefault()
                onSearchFocus()
              } else {
                suggestions.length > 0 && setShowSuggestions(true)
              }
            }}
            className="pl-10 pr-10"
          />
          {query && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}

          {/* Autocomplete dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-auto rounded-lg border bg-background shadow-lg">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => selectSuggestion(suggestion)}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-left hover:bg-accent"
                >
                  <MapPin className="size-3.5 text-muted-foreground shrink-0" />
                  <span>{suggestion}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <Button type="button" variant="outline" size="icon" onClick={onFilterClick} className="relative shrink-0">
          <SlidersHorizontal className="size-4" />
          {activeFilterCount > 0 && (
            <Badge className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </form>
    </div>
  )
}
