import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import type { SearchFilters, SharingNumber, GenderFilter } from '@/types/filters'

interface FilterPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  filters: SearchFilters
  onApply: (filters: SearchFilters) => void
}

const AMENITIES = [
  { id: 'wifi_included', label: 'WiFi', image: '/images/icon-wifi.png' },
  { id: 'food_included', label: 'Food Included', image: '/images/icon-food.png' },
  { id: 'ac_rooms', label: 'AC Rooms', image: '/images/icon-ac.png' },
  { id: 'parking', label: 'Parking', image: '/images/icon-parking.png' },
  { id: 'laundry', label: 'Laundry', image: '/images/icon-washing.png' },
  { id: 'security_24x7', label: '24/7 Security', image: '/images/icon-cctv.png' },
] as const

export function FilterPanel({ open, onOpenChange, filters, onApply }: FilterPanelProps) {
  const [localFilters, setLocalFilters] = useState<SearchFilters>(filters)

  function updateFilter<K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) {
    setLocalFilters((prev) => ({ ...prev, [key]: value }))
  }

  function toggleSharing(type: SharingNumber) {
    setLocalFilters((prev) => {
      const current = prev.sharingTypes
      const next = current.includes(type)
        ? current.filter((t) => t !== type)
        : [...current, type]
      return { ...prev, sharingTypes: next }
    })
  }

  function toggleAmenity(amenity: string) {
    setLocalFilters((prev) => {
      const current = prev.amenities
      const next = current.includes(amenity)
        ? current.filter((a) => a !== amenity)
        : [...current, amenity]
      return { ...prev, amenities: next }
    })
  }

  function handleApply() {
    onApply(localFilters)
    onOpenChange(false)
  }

  function handleReset() {
    setLocalFilters({
      query: filters.query,
      minPrice: 0,
      maxPrice: 20000,
      sharingTypes: [],
      food: null,
      gender: null,
      amenities: [],
      availableOnly: false,
    })
  }

  const isModified =
    localFilters.minPrice > 0 ||
    localFilters.maxPrice < 20000 ||
    localFilters.sharingTypes.length > 0 ||
    localFilters.food !== null ||
    localFilters.gender !== null ||
    localFilters.amenities.length > 0 ||
    localFilters.availableOnly

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl px-4 pb-6" showCloseButton={false}>
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg">Filters</SheetTitle>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-full p-1.5 hover:bg-muted"
            >
              <X className="size-5" />
            </button>
          </div>
        </SheetHeader>

        <div className="space-y-6">
          {/* Price Range */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Price Range</span>
              <span className="text-sm text-muted-foreground">
                ₹{localFilters.minPrice.toLocaleString('en-IN')} – ₹{localFilters.maxPrice.toLocaleString('en-IN')}
              </span>
            </div>
            <Slider
              min={0}
              max={20000}
              step={500}
              value={[localFilters.minPrice, localFilters.maxPrice]}
              onValueChange={([min, max]) => {
                updateFilter('minPrice', min)
                updateFilter('maxPrice', max)
              }}
            />
          </div>

          {/* Sharing Type */}
          <div className="space-y-3">
            <span className="text-sm font-medium">Room Sharing</span>
            <div className="grid grid-cols-2 gap-3">
              {([1, 2, 3, 4] as SharingNumber[]).map((type) => {
                const config: Record<number, { label: string, image: string }> = { 
                  1: { label: 'Single Room', image: '/images/room-single.png' }, 
                  2: { label: 'Double Sharing', image: '/images/room-double.png' }, 
                  3: { label: 'Triple Sharing', image: '/images/room-triple.png' }, 
                  4: { label: 'Dormitory', image: '/images/room-four.png' } 
                }
                const isActive = localFilters.sharingTypes.includes(type)
                return (
                  <label
                    key={type}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border p-3 cursor-pointer transition-all',
                      isActive
                        ? 'border-primary bg-primary/5'
                        : 'border-input hover:bg-accent'
                    )}
                  >
                    <Checkbox
                      checked={isActive}
                      onCheckedChange={() => toggleSharing(type)}
                    />
                    <div className="flex items-center gap-2">
                      <img src={config[type].image} alt={config[type].label} className="w-5 h-5 object-contain" />
                      <span className="text-sm">{config[type].label}</span>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Gender */}
          <div className="space-y-3">
            <span className="text-sm font-medium">PG Type</span>
            <Select
              value={localFilters.gender || 'all'}
              onValueChange={(v) => updateFilter('gender', v === 'all' ? null : (v as GenderFilter))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Any gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="boys">Boys Only</SelectItem>
                <SelectItem value="girls">Girls Only</SelectItem>
                <SelectItem value="co-ed">Co-ed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Food Included */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Food Included</span>
            <div className="flex items-center gap-2">
              {localFilters.food === null ? (
                <Badge variant="secondary" className="text-xs">Any</Badge>
              ) : localFilters.food ? (
                <Badge className="text-xs">Yes</Badge>
              ) : (
                <Badge variant="outline" className="text-xs">No</Badge>
              )}
              <Switch
                checked={localFilters.food !== null}
                onCheckedChange={(checked) => updateFilter('food', checked ? true : null)}
              />
              {localFilters.food !== null && (
                <button
                  type="button"
                  onClick={() => updateFilter('food', !localFilters.food)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  {localFilters.food ? 'Switch to No' : 'Switch to Yes'}
                </button>
              )}
            </div>
          </div>

          {/* Amenities */}
          <div className="space-y-3">
            <span className="text-sm font-medium">Amenities</span>
            <div className="grid grid-cols-2 gap-3">
              {AMENITIES.map(({ id, label, image }) => {
                const checked = localFilters.amenities.includes(id)
                return (
                  <label
                    key={id}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border p-3 cursor-pointer transition-all',
                      checked ? 'border-primary bg-primary/5' : 'border-input hover:bg-accent'
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleAmenity(id)}
                    />
                    <div className="flex items-center gap-2">
                      <img src={image} alt={label} className="w-5 h-5 object-contain drop-shadow-sm" />
                      <span className="text-sm">{label}</span>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Available Only */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium">Only show available</span>
              <p className="text-xs text-muted-foreground">Hide fully booked PGs</p>
            </div>
            <Switch
              checked={localFilters.availableOnly}
              onCheckedChange={(checked) => updateFilter('availableOnly', checked)}
            />
          </div>
        </div>

        <SheetFooter className="pt-6 flex-row gap-2">
          <Button variant="outline" className="flex-1" onClick={handleReset} disabled={!isModified}>
            Reset
          </Button>
          <Button className="flex-[2]" onClick={handleApply}>
            Apply Filters
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
