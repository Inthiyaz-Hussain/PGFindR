import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, SlidersHorizontal, X, Filter } from 'lucide-react'
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
import { supabase } from '@/lib/supabase'
import type { PGListing, PGType } from '@/types'
import { PGCard } from '@/components/pg/PGCard'
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
import { Building2 } from 'lucide-react'

const AMENITIES = [
  { id: 'wifi_included', label: 'WiFi' },
  { id: 'food_included', label: 'Food Included' },
  { id: 'ac_rooms', label: 'AC Rooms' },
  { id: 'parking', label: 'Parking' },
  { id: 'laundry', label: 'Laundry' },
  { id: 'security_24x7', label: '24x7 Security' },
]

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [inputValue, setInputValue] = useState(query)
  const [pgType, setPgType] = useState<string>(searchParams.get('type') || 'all')
  const [amenities, setAmenities] = useState<Set<string>>(new Set())
  const [maxRent, setMaxRent] = useState<string>('')
  const [filterOpen, setFilterOpen] = useState(false)

  useEffect(() => {
    const q = searchParams.get('q') || ''
    setQuery(q)
    setInputValue(q)
  }, [searchParams])

  const { data: pgs, isLoading } = useQuery({
    queryKey: ['search-pgs', query, pgType, Array.from(amenities), maxRent],
    queryFn: async () => {
      let q = supabase
        .from('pg_listings')
        .select('*, photos:pg_photos(*)')
        .eq('status', 'approved')

      if (query) {
        q = q.or(`name.ilike.%${query}%,city.ilike.%${query}%,locality.ilike.%${query}%,address.ilike.%${query}%`)
      }

      if (pgType !== 'all') {
        q = q.eq('pg_type', pgType as PGType)
      }

      if (maxRent && Number(maxRent) > 0) {
        q = q.lte('monthly_rent_min', Number(maxRent))
      }

      amenities.forEach((a) => {
        q = q.eq(a as keyof PGListing, true)
      })

      const { data } = await q.order('available_beds', { ascending: false }).limit(50)
      return (data || []) as PGListing[]
    },
  })

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setQuery(inputValue)
    setSearchParams(inputValue ? { q: inputValue } : {})
  }

  function toggleAmenity(id: string) {
    setAmenities((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const activeFilters = amenities.size + (pgType !== 'all' ? 1 : 0) + (maxRent ? 1 : 0)

  const FiltersPanel = () => (
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
            <SelectItem value="co-ed">Co-ed</SelectItem>
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
          onChange={(e) => setMaxRent(e.target.value)}
        />
      </div>

      <Separator />

      <div className="space-y-3">
        <Label className="text-sm font-medium">Amenities</Label>
        <div className="space-y-2.5">
          {AMENITIES.map(({ id, label }) => (
            <div key={id} className="flex items-center gap-2">
              <Checkbox
                id={id}
                checked={amenities.has(id)}
                onCheckedChange={() => toggleAmenity(id)}
              />
              <Label htmlFor={id} className="font-normal cursor-pointer">{label}</Label>
            </div>
          ))}
        </div>
      </div>

      {activeFilters > 0 && (
        <>
          <Separator />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setAmenities(new Set()); setPgType('all'); setMaxRent('') }}
            className="w-full text-muted-foreground"
          >
            <X className="size-4" /> Clear all filters
          </Button>
        </>
      )}
    </div>
  )

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by city, locality, or PG name..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="pl-10"
          />
        </div>
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
              <FiltersPanel />
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
            <FiltersPanel />
          </div>
        </aside>

        {/* Results */}
        <main className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {isLoading ? 'Searching...' : `${pgs?.length || 0} PGs found`}
              {query && <span className="font-medium text-foreground"> for "{query}"</span>}
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
