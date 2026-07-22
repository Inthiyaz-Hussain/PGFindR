export type SharingNumber = 1 | 2 | 3 | 4
export type GenderFilter = 'boys' | 'girls' | 'co-ed' | null

export interface SearchFilters {
  query: string
  minPrice: number
  maxPrice: number
  sharingTypes: SharingNumber[]
  food: boolean | null
  gender: GenderFilter
  amenities: string[]
  availableOnly: boolean
}

export const DEFAULT_FILTERS: SearchFilters = {
  query: '',
  minPrice: 0,
  maxPrice: 20000,
  sharingTypes: [],
  food: null,
  gender: null,
  amenities: [],
  availableOnly: false,
}

export interface LocationState {
  lat: number | null
  lng: number | null
  city: string | null
  radius: number
}

export const DEFAULT_LOCATION: LocationState = {
  lat: null,
  lng: null,
  city: null,
  radius: 5000,
}

export function countActiveFilters(filters: SearchFilters): number {
  let count = 0
  if (filters.minPrice > 0 || filters.maxPrice < 20000) count++
  if (filters.sharingTypes.length > 0) count++
  if (filters.food !== null) count++
  if (filters.gender !== null) count++
  if (filters.amenities.length > 0) count++
  if (filters.availableOnly) count++
  return count
}
