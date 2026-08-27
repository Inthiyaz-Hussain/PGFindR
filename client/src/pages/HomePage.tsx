import { useState, useEffect, useCallback } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { SplashScreen } from '@/components/home/SplashScreen'
import { POPULAR_CITIES } from '@/components/home/LocationPrompt'
import { SearchBar } from '@/components/home/SearchBar'
import { FilterPanel } from '@/components/home/FilterPanel'
import { PGList } from '@/components/pg/PGList'
import { DEFAULT_FILTERS, DEFAULT_LOCATION, type SearchFilters, type LocationState } from '@/types/filters'

export function HomePage() {
  const [showSplash, setShowSplash] = useState(true)
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [location, setLocation] = useState<LocationState>(DEFAULT_LOCATION)
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS)

  // Embla Carousel setup
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true })
  const [selectedIndex, setSelectedIndex] = useState(0)

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    onSelect()
    emblaApi.on('select', onSelect)
    emblaApi.on('reInit', onSelect)
  }, [emblaApi, onSelect])

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
    localStorage.setItem('pgr_location', JSON.stringify(location))
  }, [location])

  useEffect(() => {
    localStorage.setItem('pgr_filters', JSON.stringify(filters))
  }, [filters])

  function handleSplashDismiss() {
    setShowSplash(false)
  }

  function handleLocationSelect(newLocation: LocationState) {
    setLocation(newLocation)
  }

  function handleSearchChange(query: string) {
    const cleanQuery = query.trim().toLowerCase()
    const matchedCity = POPULAR_CITIES.find(
      (c) => c.name.toLowerCase() === cleanQuery
    )

    if (matchedCity) {
      setLocation({
        lat: matchedCity.lat,
        lng: matchedCity.lng,
        city: matchedCity.name,
        radius: 25000,
      })
      setFilters((prev) => ({ ...prev, query: '' }))
    } else {
      setFilters((prev) => ({ ...prev, query }))
    }
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
        {/* Carousel Banners */}
        <div className="w-full relative group">
          <div className="overflow-hidden rounded-3xl shadow-xl ring-1 ring-slate-900/5 h-48 sm:h-64" ref={emblaRef}>
            <div className="flex h-full touch-pan-y">
              {[1, 2, 3, 4, 5].map((index) => (
                <div key={index} className="flex-[0_0_100%] min-w-0 relative h-full">
                  <img
                    src={`/images/banner-${index}.png`}
                    alt={`FindPGR Feature ${index}`}
                    className="w-full h-full object-cover object-center"
                  />
                  {/* Subtle gradient overlay to make any overlay text readable if added later */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />
                </div>
              ))}
            </div>
          </div>
          
          {/* Carousel Dots */}
          <div className="absolute -bottom-6 left-0 right-0 flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((_, index) => (
              <button
                key={index}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === selectedIndex ? 'bg-primary w-4' : 'bg-primary/30'
                }`}
                onClick={() => emblaApi?.scrollTo(index)}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Search Bar */}
        <SearchBar
          location={location}
          filters={filters}
          onLocationSelect={handleLocationSelect}
          onFilterClick={() => setShowFilterPanel(true)}
          onSearchChange={handleSearchChange}
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


    </div>
  )
}
