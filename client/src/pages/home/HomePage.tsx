import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { SplashScreen } from '@/components/home/SplashScreen'
import { LocationPrompt } from '@/components/home/LocationPrompt'
import { SearchBar } from '@/components/home/SearchBar'
import { FilterPanel } from '@/components/home/FilterPanel'
import { PGList } from '@/components/pg/PGList'
import { DEFAULT_FILTERS, DEFAULT_LOCATION, type SearchFilters, type LocationState } from '@/types/filters'

export function HomePage() {
  const navigate = useNavigate()
  const [showSplash, setShowSplash] = useState(() => {
    return sessionStorage.getItem('pgr_splash_dismissed') !== 'true'
  })
  const [splashDismissed, setSplashDismissed] = useState(() => {
    return sessionStorage.getItem('pgr_splash_dismissed') === 'true'
  })
  const [showLocationPrompt, setShowLocationPrompt] = useState(false)
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [location, setLocation] = useState<LocationState>(DEFAULT_LOCATION)
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS)

  // Hydration-safe: read localStorage after mount
  useEffect(() => {
    const storedLocation = localStorage.getItem('pgr_location')
    if (storedLocation) {
      try {
        setLocation(JSON.parse(storedLocation))
      } catch {
        setLocation(DEFAULT_LOCATION)
      }
    }
    const storedFilters = localStorage.getItem('pgr_filters')
    if (storedFilters) {
      try {
        setFilters({ ...DEFAULT_FILTERS, ...JSON.parse(storedFilters) })
      } catch {
        setFilters(DEFAULT_FILTERS)
      }
    }
  }, [])

  useEffect(() => {
    if (!splashDismissed) return
    const prompted = sessionStorage.getItem('pgr_location_prompt_shown') === 'true'
    if (!prompted || location.lat == null || location.lng == null) {
      setShowLocationPrompt(true)
      sessionStorage.setItem('pgr_location_prompt_shown', 'true')
    }
  }, [splashDismissed, location.lat, location.lng])

  useEffect(() => {
    localStorage.setItem('pgr_location', JSON.stringify(location))
  }, [location])

  useEffect(() => {
    localStorage.setItem('pgr_filters', JSON.stringify(filters))
  }, [filters])

  function handleSplashDismiss() {
    setShowSplash(false)
    setSplashDismissed(true)
    sessionStorage.setItem('pgr_splash_dismissed', 'true')
    window.dispatchEvent(new CustomEvent('splash-dismissed'))
  }

  function handleLocationSelect(newLocation: LocationState) {
    setLocation(newLocation)
    setShowLocationPrompt(false)
  }

  function handleSkipLocation() {
    setShowLocationPrompt(false)
  }

  function handleSearchChange(query: string) {
    setFilters((prev) => ({ ...prev, query }))
  }

  function handleApplyFilters(newFilters: SearchFilters) {
    setFilters(newFilters)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Splash Screen */}
      {showSplash && <SplashScreen onDismiss={handleSplashDismiss} />}

      {/* Main Content */}
      <div className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Find your PG</h1>
          <p className="text-sm text-muted-foreground">
            Discover verified paying guests near you
          </p>
        </div>

        {/* Search Bar */}
        <SearchBar
          location={location}
          filters={filters}
          onLocationClick={() => setShowLocationPrompt(true)}
          onFilterClick={() => setShowFilterPanel(true)}
          onSearchChange={handleSearchChange}
          onSearchFocus={() => navigate('/?search=true')}
        />

        {/* PG List */}
        <PGList location={location} filters={filters} />

        {/* Filter Panel */}
        <FilterPanel
          open={showFilterPanel}
          onOpenChange={setShowFilterPanel}
          filters={filters}
          onApply={handleApplyFilters}
        />
      </div>

      {/* Location Prompt */}
      <LocationPrompt
        open={showLocationPrompt}
        onSelect={handleLocationSelect}
        onSkip={handleSkipLocation}
      />
    </div>
  )
}
