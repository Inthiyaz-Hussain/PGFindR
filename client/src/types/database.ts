export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          phone: string | null
          avatar_url: string | null
          role: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string
          phone?: string | null
          avatar_url?: string | null
          role?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          full_name?: string
          phone?: string | null
          avatar_url?: string | null
          role?: string
          updated_at?: string
        }
      }
      pg_listings: {
        Row: {
          id: string
          owner_id: string
          name: string
          description: string | null
          address: string
          city: string
          locality: string
          latitude: number | null
          longitude: number | null
          pg_type: string
          status: string
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
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          description?: string | null
          address: string
          city: string
          locality: string
          latitude?: number | null
          longitude?: number | null
          pg_type?: string
          status?: string
          total_beds?: number
          available_beds?: number
          monthly_rent_min?: number
          monthly_rent_max?: number
          deposit_amount?: number
          food_included?: boolean
          wifi_included?: boolean
          ac_rooms?: boolean
          parking?: boolean
          laundry?: boolean
          security_24x7?: boolean
          rules?: string | null
          commission_rate?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          owner_id?: string
          name?: string
          description?: string | null
          address?: string
          city?: string
          locality?: string
          latitude?: number | null
          longitude?: number | null
          pg_type?: string
          status?: string
          total_beds?: number
          available_beds?: number
          monthly_rent_min?: number
          monthly_rent_max?: number
          deposit_amount?: number
          food_included?: boolean
          wifi_included?: boolean
          ac_rooms?: boolean
          parking?: boolean
          laundry?: boolean
          security_24x7?: boolean
          rules?: string | null
          commission_rate?: number
          updated_at?: string
        }
      }
      beds: {
        Row: {
          id: string
          pg_id: string
          room_number: string
          bed_label: string
          sharing_type: string
          monthly_rent: number
          status: string
          floor_number: number
          has_ac: boolean
          has_attached_bath: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          pg_id: string
          room_number: string
          bed_label: string
          sharing_type?: string
          monthly_rent?: number
          status?: string
          floor_number?: number
          has_ac?: boolean
          has_attached_bath?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          pg_id?: string
          room_number?: string
          bed_label?: string
          sharing_type?: string
          monthly_rent?: number
          status?: string
          floor_number?: number
          has_ac?: boolean
          has_attached_bath?: boolean
          updated_at?: string
        }
      }
      pg_photos: {
        Row: {
          id: string
          pg_id: string
          url: string
          type: 'room' | 'common' | 'exterior' | 'kitchen' | 'washroom' | null
          caption: string | null
          is_primary: boolean
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          pg_id: string
          url: string
          type?: 'room' | 'common' | 'exterior' | 'kitchen' | 'washroom' | null
          caption?: string | null
          is_primary?: boolean
          sort_order?: number
          created_at?: string
        }
        Update: {
          pg_id?: string
          url?: string
          type?: 'room' | 'common' | 'exterior' | 'kitchen' | 'washroom' | null
          caption?: string | null
          is_primary?: boolean
          sort_order?: number
        }
      }
      sharing_types: {
        Row: {
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
        Insert: {
          id?: string
          pg_id: string
          type: 1 | 2 | 3 | 4
          price_monthly?: number
          price_daily?: number | null
          total_beds?: number
          occupied_beds?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          pg_id?: string
          type?: 1 | 2 | 3 | 4
          price_monthly?: number
          price_daily?: number | null
          total_beds?: number
          occupied_beds?: number
          updated_at?: string
        }
      }
      amenities: {
        Row: {
          id: string
          pg_id: string
          key: 'wifi' | 'ac' | 'food_veg' | 'food_nonveg' | 'laundry' | 'parking' | 'cctv' | 'generator'
          is_available: boolean
          created_at: string
        }
        Insert: {
          id?: string
          pg_id: string
          key: 'wifi' | 'ac' | 'food_veg' | 'food_nonveg' | 'laundry' | 'parking' | 'cctv' | 'generator'
          is_available?: boolean
          created_at?: string
        }
        Update: {
          pg_id?: string
          key?: 'wifi' | 'ac' | 'food_veg' | 'food_nonveg' | 'laundry' | 'parking' | 'cctv' | 'generator'
          is_available?: boolean
        }
      }
      inquiries: {
        Row: {
          id: string
          pg_id: string
          seeker_id: string
          bed_id: string | null
          message: string | null
          move_in_date: string | null
          status: string
          owner_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          pg_id: string
          seeker_id: string
          bed_id?: string | null
          message?: string | null
          move_in_date?: string | null
          status?: string
          owner_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          pg_id?: string
          seeker_id?: string
          bed_id?: string | null
          message?: string | null
          move_in_date?: string | null
          status?: string
          owner_notes?: string | null
          updated_at?: string
        }
      }
      bookings: {
        Row: {
          id: string
          inquiry_id: string | null
          pg_id: string
          seeker_id: string
          owner_id: string
          bed_id: string
          monthly_rent: number
          deposit_amount: number
          move_in_date: string
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          inquiry_id?: string | null
          pg_id: string
          seeker_id: string
          owner_id: string
          bed_id: string
          monthly_rent: number
          deposit_amount?: number
          move_in_date: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          inquiry_id?: string | null
          pg_id?: string
          seeker_id?: string
          owner_id?: string
          bed_id?: string
          monthly_rent?: number
          deposit_amount?: number
          move_in_date?: string
          status?: string
          updated_at?: string
        }
      }
      reviews: {
        Row: {
          id: string
          user_id: string
          pg_id: string
          rating: 1 | 2 | 3 | 4 | 5
          comment: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          pg_id: string
          rating: 1 | 2 | 3 | 4 | 5
          comment?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          pg_id?: string
          rating?: 1 | 2 | 3 | 4 | 5
          comment?: string | null
          updated_at?: string
        }
      }
      owner_documents: {
        Row: {
          id: string
          owner_id: string
          doc_type: 'id_proof' | 'address_proof' | 'ownership_proof'
          url: string
          verified: boolean
          admin_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          doc_type: 'id_proof' | 'address_proof' | 'ownership_proof'
          url: string
          verified?: boolean
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          owner_id?: string
          doc_type?: 'id_proof' | 'address_proof' | 'ownership_proof'
          url?: string
          verified?: boolean
          admin_notes?: string | null
          updated_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          booking_id: string
          seeker_id: string
          amount: number
          commission_rate: number
          commission_amount: number
          owner_payout: number
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          status: string
          payment_type: string
          created_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          seeker_id: string
          amount: number
          commission_rate?: number
          commission_amount?: number
          owner_payout?: number
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          status?: string
          payment_type?: string
          created_at?: string
        }
        Update: {
          booking_id?: string
          seeker_id?: string
          amount?: number
          commission_rate?: number
          commission_amount?: number
          owner_payout?: number
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          status?: string
          payment_type?: string
        }
      }
      owner_kyc: {
        Row: {
          id: string
          owner_id: string
          pan_number: string | null
          aadhaar_number: string | null
          bank_account: string | null
          bank_ifsc: string | null
          bank_name: string | null
          status: string
          admin_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          pan_number?: string | null
          aadhaar_number?: string | null
          bank_account?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          status?: string
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          owner_id?: string
          pan_number?: string | null
          aadhaar_number?: string | null
          bank_account?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          status?: string
          admin_notes?: string | null
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
