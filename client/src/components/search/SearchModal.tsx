import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, SlidersHorizontal, MapPin, Wifi, Utensils, Wind, Car, Shield, Building2 } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { PGListing, PGType } from '@/types'
import { PGCard } from '@/components/pg/PGCard'

interface SearchModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialQuery?: string
}

const AMENITIES = [
  { id: 'wifi_included', label: 'WiFi', icon: Wifi },
  { id: 'food_included', label: 'Food', icon: Utensils },
  { id: 'ac_rooms', label: 'AC', icon: Wind },
  { id: 'parking', label: 'Parking', icon: Car },
  { id: 'security_24x7', label: 'Security', icon: Shield },
]

export function SearchModal({ open, onOpenChange, initialQuery = '' }: SearchModalProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState(initialQuery)
  const [pgType, setPgType] = useState<string>('all')
  const [selectedAmenities, setSelectedAmenities] = useState<Set<string>>(new Set())
  const [maxRent, setMaxRent] = useState<number>(0) // 0 means no limit

  // Reset local state when opened
  useEffect(() => {
    if (open) {
      setQuery(initialQuery)
    }
  }, [open, initialQuery])

  // Query PGs from database in real-time
  const { data: pgs, isLoading } = useQuery({
    queryKey: ['modal-search-pgs', query, pgType, Array.from(selectedAmenities), maxRent],
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

      if (maxRent > 0) {
        q = q.lte('monthly_rent_min', maxRent)
      }

      selectedAmenities.forEach((a) => {
        q = q.eq(a as keyof PGListing, true)
      })

      const { data } = await q.order('available_beds', { ascending: false }).limit(20)
      return (data || []) as PGListing[]
    },
    enabled: open,
  })

  function toggleAmenity(id: string) {
    setSelectedAmenities((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handlePGSelect(id: string) {
    onOpenChange(false)
    navigate(`/pg/${id}`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] h-[85vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-2xl">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 bg-slate-50/50 dark:bg-slate-950/20">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-indigo-500" />
            <Input
              type="text"
              placeholder="Search by city, locality or PG name..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-12 pr-10 py-6 text-base rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus-visible:ring-indigo-500 shadow-sm"
              autoFocus
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>

        {/* Filters and Results Section */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Sidebar Filters */}
          <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800 p-4 space-y-5 overflow-y-auto shrink-0 bg-slate-50/30 dark:bg-slate-950/5">
            {/* PG Type Filter */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                PG Gender Type
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { value: 'all', label: 'Any' },
                  { value: 'boys', label: 'Boys' },
                  { value: 'girls', label: 'Girls' },
                  { value: 'co-ed', label: 'Co-ed' },
                ].map((type) => {
                  const isSelected = pgType === type.value
                  return (
                    <button
                      key={type.value}
                      onClick={() => setPgType(type.value)}
                      className={`py-1.5 px-3 rounded-lg border text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-indigo-950 dark:bg-indigo-900 border-indigo-950 dark:border-indigo-900 text-white shadow-sm'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-850'
                      }`}
                    >
                      {type.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Budget Range Filter */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Maximum Budget
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { value: 0, label: 'Any Budget' },
                  { value: 5000, label: '₹5,000 /mo' },
                  { value: 10000, label: '₹10,000 /mo' },
                  { value: 15000, label: '₹15,000 /mo' },
                ].map((budget) => {
                  const isSelected = maxRent === budget.value
                  return (
                    <button
                      key={budget.value}
                      onClick={() => setMaxRent(budget.value)}
                      className={`py-1.5 px-3 rounded-lg border text-left text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-indigo-950 dark:bg-indigo-900 border-indigo-950 dark:border-indigo-900 text-white shadow-sm'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-850'
                      }`}
                    >
                      {budget.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Amenities Filter */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Amenities
              </label>
              <div className="flex flex-col gap-1.5">
                {AMENITIES.map((amenity) => {
                  const isSelected = selectedAmenities.has(amenity.id)
                  const Icon = amenity.icon
                  return (
                    <button
                      key={amenity.id}
                      onClick={() => toggleAmenity(amenity.id)}
                      className={`flex items-center gap-2 py-2 px-3 rounded-lg border text-left text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-850 text-indigo-700 dark:text-indigo-400'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-850'
                      }`}
                    >
                      <Icon className={`size-3.5 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                      <span>{amenity.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Clear All Filters */}
            {(pgType !== 'all' || selectedAmenities.size > 0 || maxRent > 0) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPgType('all')
                  setSelectedAmenities(new Set())
                  setMaxRent(0)
                }}
                className="w-full text-xs text-rose-500 hover:text-rose-650 hover:bg-rose-50/50"
              >
                Clear all filters
              </Button>
            )}
          </div>

          {/* Results Grid Container */}
          <div className="flex-1 p-4 overflow-y-auto bg-slate-50/20 dark:bg-slate-950/10">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2, 4].map((i) => (
                  <div key={i} className="h-64 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                ))}
              </div>
            ) : pgs && pgs.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-6">
                {pgs.map((pg) => (
                  <div
                    key={pg.id}
                    onClick={() => handlePGSelect(pg.id)}
                    className="cursor-pointer transition-transform duration-200 active:scale-98"
                  >
                    <PGCard pg={pg} className="pointer-events-none" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-12 w-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3 border border-slate-200/50">
                  <Building2 className="size-6 text-slate-400" />
                </div>
                <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">No PGs Found</h4>
                <p className="text-xs text-slate-400 max-w-xs mt-1">
                  We couldn't find any approved PGs matching your search query or filters. Try adjusting them!
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
