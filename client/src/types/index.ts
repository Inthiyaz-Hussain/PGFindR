export type UserRole = 'seeker' | 'owner' | 'admin'
export type PGType = 'boys' | 'girls' | 'co-ed'
export type PGStatus = 'pending' | 'approved' | 'rejected' | 'inactive'
export type BedStatus = 'available' | 'occupied' | 'reserved' | 'maintenance'
export type SharingType = 'single' | 'double' | 'triple' | 'dormitory'
export type InquiryStatus = 'pending' | 'contacted' | 'confirmed' | 'cancelled'
export type BookingStatus = 'pending_payment' | 'payment_done' | 'active' | 'completed' | 'cancelled'
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded'
export type PaymentType = 'deposit' | 'monthly_rent'
export type KYCStatus = 'pending' | 'approved' | 'rejected'

export interface Profile {
  id: string
  full_name: string
  phone: string | null
  avatar_url: string | null
  role: UserRole
  created_at: string
  updated_at: string
}

export interface PGListing {
  id: string
  owner_id: string
  name: string
  description: string | null
  address: string
  city: string
  locality: string
  latitude: number | null
  longitude: number | null
  pg_type: PGType
  status: PGStatus
  total_beds: number
  available_beds: number
  monthly_rent_min: number
  monthly_rent_max: number
  deposit_amount: number
  food_included: boolean
  wifi_included: boolean
  ac_rooms: boolean
  parking: boolean
  laundry: boolean
  security_24x7: boolean
  rules: string | null
  commission_rate: number
  created_at: string
  updated_at: string
  // joined
  owner?: Profile
  photos?: PGPhoto[]
}

export interface Bed {
  id: string
  pg_id: string
  room_number: string
  bed_label: string
  sharing_type: SharingType
  monthly_rent: number
  status: BedStatus
  floor_number: number
  has_ac: boolean
  has_attached_bath: boolean
  created_at: string
  updated_at: string
}

export interface PGPhoto {
  id: string
  pg_id: string
  url: string
  caption: string | null
  is_primary: boolean
  sort_order: number
  created_at: string
}

export interface Inquiry {
  id: string
  pg_id: string
  seeker_id: string
  bed_id: string | null
  message: string | null
  move_in_date: string | null
  status: InquiryStatus
  owner_notes: string | null
  created_at: string
  updated_at: string
  // Extended fields
  full_name: string | null
  mobile: string | null
  age: number | null
  sharing_preference: 1 | 2 | 3 | 4 | null
  occupation: 'Student' | 'Working Professional' | 'Other' | null
  city_of_origin: string | null
  duration_value: number | null
  duration_unit: 'days' | 'months' | null
  // joined
  pg?: PGListing
  seeker?: Profile
  bed?: Bed
}

export interface Booking {
  id: string
  inquiry_id: string | null
  pg_id: string
  seeker_id: string
  owner_id: string
  bed_id: string
  monthly_rent: number
  deposit_amount: number
  move_in_date: string
  status: BookingStatus
  created_at: string
  updated_at: string
  // joined
  pg?: PGListing
  bed?: Bed
  seeker?: Profile
}

export interface Payment {
  id: string
  booking_id: string
  seeker_id: string
  amount: number
  commission_rate: number
  commission_amount: number
  owner_payout: number
  razorpay_order_id: string | null
  razorpay_payment_id: string | null
  status: PaymentStatus
  payment_type: PaymentType
  created_at: string
}

export interface OwnerKYC {
  id: string
  owner_id: string
  pan_number: string | null
  aadhaar_number: string | null
  bank_account: string | null
  bank_ifsc: string | null
  bank_name: string | null
  status: KYCStatus
  admin_notes: string | null
  created_at: string
  updated_at: string
}

export interface SharingTypeItem {
  id: string
  pg_id: string
  type: 1 | 2 | 3 | 4
  price_monthly: number
  price_daily: number | null
  total_beds: number
  occupied_beds: number
  created_at: string
  updated_at: string
}

export interface AmenityItem {
  id: string
  pg_id: string
  key: 'wifi' | 'ac' | 'food_veg' | 'food_nonveg' | 'laundry' | 'parking' | 'cctv' | 'generator'
  is_available: boolean
  created_at: string
}

export interface Review {
  id: string
  user_id: string
  pg_id: string
  rating: 1 | 2 | 3 | 4 | 5
  comment: string | null
  created_at: string
  updated_at: string
  // joined
  reviewer?: { full_name: string }
}

export interface SearchFilters {
  city?: string
  locality?: string
  pg_type?: PGType
  min_rent?: number
  max_rent?: number
  food_included?: boolean
  wifi_included?: boolean
  ac_rooms?: boolean
  parking?: boolean
  laundry?: boolean
  security_24x7?: boolean
  sharing_type?: SharingType
}
