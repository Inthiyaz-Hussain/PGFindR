export type UserRole = 'seeker' | 'owner' | 'admin'
export type GenderPref = 'male' | 'female' | 'mixed'
export type PGStatus = 'pending' | 'active' | 'suspended'
export type SharingTypeValue = 1 | 2 | 3 | 4
export type AmenityKey = 'wifi' | 'ac' | 'food_veg' | 'food_nonveg' | 'laundry' | 'parking' | 'cctv' | 'generator'
export type InquiryStatus = 'pending' | 'confirmed' | 'declined' | 'booked'
export type BookingStatus = 'payment_pending' | 'paid' | 'completed' | 'refunded'

export interface User {
  id: string
  name: string
  email: string
  mobile: string | null
  role: UserRole
  created_at: string
  updated_at: string
}

export interface PG {
  id: string
  owner_id: string
  name: string
  description: string | null
  address: string
  city: string
  locality: string
  lat: number | null
  lng: number | null
  gender_pref: GenderPref
  status: PGStatus
  monthly_rent_min: number
  monthly_rent_max: number
  deposit_amount: number
  total_beds: number
  available_beds: number
  commission_rate: number
  created_at: string
  updated_at: string
}

export interface SharingType {
  id: string
  pg_id: string
  type: SharingTypeValue
  price_monthly: number
  price_daily: number | null
  total_beds: number
  occupied_beds: number
  created_at: string
  updated_at: string
}

export interface Amenity {
  id: string
  pg_id: string
  key: AmenityKey
  is_available: boolean
  created_at: string
}

export interface Inquiry {
  id: string
  user_id: string
  pg_id: string
  sharing_type: SharingTypeValue | null
  move_in_date: string | null
  occupation: string | null
  from_city: string | null
  duration_days: number | null
  message: string | null
  status: InquiryStatus
  owner_notes: string | null
  created_at: string
  updated_at: string
}

export interface Booking {
  id: string
  inquiry_id: string
  user_id: string
  pg_id: string
  bed_id: string
  amount: number
  commission_pct: number
  commission_amount: number
  owner_payout: number
  status: BookingStatus
  payment_id: string | null
  razorpay_order_id: string | null
  razorpay_payment_id: string | null
  confirmed_at: string | null
  created_at: string
  updated_at: string
}

export interface Review {
  id: string
  user_id: string
  pg_id: string
  rating: 1 | 2 | 3 | 4 | 5
  comment: string | null
  created_at: string
  updated_at: string
}

export interface Bed {
  id: string
  pg_id: string
  room_number: string
  bed_label: string
  sharing_type: SharingTypeValue
  monthly_rent: number
  status: 'available' | 'occupied' | 'reserved' | 'maintenance'
  floor_number: number
  has_ac: boolean
  has_attached_bath: boolean
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  booking_id: string
  user_id: string
  amount: number
  commission_rate: number
  commission_amount: number
  owner_payout: number
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  payment_type: 'deposit' | 'monthly_rent'
  razorpay_order_id: string | null
  razorpay_payment_id: string | null
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
  status: 'pending' | 'approved' | 'rejected'
  admin_notes: string | null
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
