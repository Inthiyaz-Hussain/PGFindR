import { Router } from 'express'
import { supabase } from '../index.js'

const router = Router()

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

async function geocodeQuery(q: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), 2000)

    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'PGFindR/1.0' },
      signal: controller.signal
    })
    clearTimeout(id)

    if (!res.ok) return null
    const data: any = await res.json()
    if (data && data[0]) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      }
    }
  } catch (err) {
    console.warn(`Geocoding failed for "${q}":`, err)
  }
  return null
}

const SHARING_MAP: Record<string, string> = {
  '1': 'single',
  '2': 'double',
  '3': 'triple',
  '4': 'dormitory',
}

const VALID_AMENITIES = [
  'wifi_included',
  'food_included',
  'ac_rooms',
  'parking',
  'laundry',
  'security_24x7',
]

// GET /api/pgs
// Query params:
//   lat, lng, radius (meters, default 5000)
//   min_price, max_price
//   sharing (comma-separated: 1,2,3,4)
//   food (true/false)
//   gender (boys/girls/co-ed)
//   amenities (comma-separated: wifi_included,food_included,...)
//   available_only (true/false)
//   q (text search)
//   limit (default 20), offset (default 0)
router.get('/', async (req, res) => {
  try {
    const {
      lat, lng,
      radius = '5000',
      min_price, max_price,
      sharing,
      food,
      gender,
      amenities,
      available_only,
      q,
      city,
      limit = '20',
      offset = '0',
    } = req.query as Record<string, string>

    const pgLimit = Math.min(Number(limit) || 20, 50)
    const pgOffset = Number(offset) || 0

    // ── Build query ──────────────────────────────────────────────────────────
    let query = supabase
      .from('pg_listings')
      .select('*, photos:pg_photos(url, is_primary), amenities(*)')
      .eq('status', 'approved')

    const CATEGORY_KEYWORDS = [
      'mall', 'malls', 'restaurant', 'restaurants', 'metro', 'station', 'cafe', 
      'food', 'dining', 'park', 'theater', 'cinema', 'hospital', 'landmark', 
      'market', 'shop', 'multiplex', 'highway', 'bus stop', 'dhabha'
    ]

    const isCategory = q ? CATEGORY_KEYWORDS.some(k => q.toLowerCase().includes(k)) : false

    // Resolve geocoded coordinates if searching for a specific location
    let refLat: number | null = lat ? Number(lat) : null
    let refLng: number | null = lng ? Number(lng) : null

    if (q && !isCategory) {
      const geocoded = await geocodeQuery(q)
      if (geocoded) {
        refLat = geocoded.lat
        refLng = geocoded.lng
      }
    }

    const hasCoords = refLat != null && refLng != null

    if (q) {
      if (!isCategory || !hasCoords) {
        query = query.or(
          `name.ilike.%${q}%,city.ilike.%${q}%,locality.ilike.%${q}%,address.ilike.%${q}%,description.ilike.%${q}%`
        )
      }
    }
    if (min_price) query = query.gte('monthly_rent_min', Number(min_price))
    if (max_price) query = query.lte('monthly_rent_min', Number(max_price))
    if (food === 'true') query = query.eq('food_included', true)
    if (gender) query = query.eq('pg_type', gender)
    if (available_only === 'true') query = query.gt('available_beds', 0)
    
    // Strict city matching
    if (city) {
      query = query.ilike('city', `%${city}%`)
    }

    // Amenity filters
    const amenityList = amenities
      ? amenities.split(',').filter((a) => VALID_AMENITIES.includes(a))
      : []
    for (const amenity of amenityList) {
      query = query.eq(amenity as 'wifi_included', true)
    }

    // Sharing type filter: get pg_ids with matching bed types first
    const sharingList = sharing
      ? sharing.split(',').map((s) => SHARING_MAP[s]).filter(Boolean)
      : []
    if (sharingList.length > 0) {
      const { data: bedRows } = await supabase
        .from('beds')
        .select('pg_id')
        .in('sharing_type', sharingList)
      const pgIds = [...new Set((bedRows || []).map((b) => b.pg_id))]
      if (pgIds.length > 0) {
        query = query.in('id', pgIds)
      } else {
        // No PGs match sharing filter
        return res.json({ data: [], total: 0, limit: pgLimit, offset: pgOffset })
      }
    }

    // Fetch up to 500 for geo filtering (JS Haversine)
    const { data: pgs, error } = await query
      .order('available_beds', { ascending: false })
      .limit(hasCoords ? 500 : pgOffset + pgLimit)

    if (error) throw error

    // ── Geo filter ────────────────────────────────────────────────────────────
    type PGWithDistance = (typeof pgs)[0] & { distance_meters?: number }
    let results: PGWithDistance[] = pgs || []

    if (hasCoords) {
      const userLat = refLat!
      const userLng = refLng!
      const radiusM = Number(radius)

      results = results
        .map((pg) => {
          if (pg.latitude == null || pg.longitude == null) {
            return { ...pg, distance_meters: undefined }
          }
          return {
            ...pg,
            distance_meters: haversineMeters(userLat, userLng, pg.latitude, pg.longitude),
          }
        })
        .filter((pg) => {
          if (q) {
            const queryLower = q.toLowerCase().trim()
            
            if (!isCategory) {
              // Exact address/location search -> show that location ONLY
              const nameLower = pg.name ? pg.name.toLowerCase() : ''
              const cityLower = pg.city ? pg.city.toLowerCase() : ''
              const localityLower = pg.locality ? pg.locality.toLowerCase() : ''
              const addressLower = pg.address ? pg.address.toLowerCase() : ''
              const descLower = pg.description ? pg.description.toLowerCase() : ''

              const isTextMatch = 
                nameLower.includes(queryLower) ||
                cityLower.includes(queryLower) ||
                localityLower.includes(queryLower) ||
                addressLower.includes(queryLower) ||
                descLower.includes(queryLower)

              const isCloseGeoMatch = 
                pg.distance_meters != null && pg.distance_meters <= 5000

              if (!isTextMatch && !isCloseGeoMatch) return false
            }
          }
          // Strict location: do not allow PGs with null distance if searching by coords
          return pg.distance_meters != null && pg.distance_meters <= radiusM
        })
        .sort((a, b) => {
          // If it's a category/nearby search, bubble up PGs that explicitly mention the landmark
          if (q && isCategory) {
            const queryLower = q.toLowerCase().trim()
            
            const aMatch = 
              (a.name && a.name.toLowerCase().includes(queryLower)) ||
              (a.address && a.address.toLowerCase().includes(queryLower)) ||
              (a.description && a.description.toLowerCase().includes(queryLower))
              
            const bMatch = 
              (b.name && b.name.toLowerCase().includes(queryLower)) ||
              (b.address && b.address.toLowerCase().includes(queryLower)) ||
              (b.description && b.description.toLowerCase().includes(queryLower))

            if (aMatch && !bMatch) return -1
            if (!aMatch && bMatch) return 1
          }
          return (a.distance_meters ?? Infinity) - (b.distance_meters ?? Infinity)
        })
    }

    const pgIdsOnPage = results.slice(pgOffset, pgOffset + pgLimit).map(pg => pg.id)
    let verifiedPgIds = new Set<string>()
    if (pgIdsOnPage.length > 0) {
      const { data: confirmedInqs } = await supabase
        .from('inquiries')
        .select('pg_id')
        .in('pg_id', pgIdsOnPage)
        .eq('status', 'confirmed')
      
      verifiedPgIds = new Set((confirmedInqs || []).map(inq => inq.pg_id))
    }

    const total = results.length
    const page = results.slice(pgOffset, pgOffset + pgLimit).map(pg => ({
      ...pg,
      is_verified: verifiedPgIds.has(pg.id)
    }))

    res.json({ data: page, total, limit: pgLimit, offset: pgOffset })
  } catch (err) {
    console.error('Error fetching PGs:', err)
    res.status(500).json({ error: (err as Error).message || 'Failed to fetch PGs' })
  }
})

// GET /api/pgs/cities — autocomplete city/locality suggestions
router.get('/cities', async (req, res) => {
  try {
    const { q = '' } = req.query as { q: string }
    if (!q || q.length < 2) return res.json([])

    const { data } = await supabase
      .from('pg_listings')
      .select('city, locality')
      .eq('status', 'approved')
      .or(`city.ilike.%${q}%,locality.ilike.%${q}%`)
      .limit(20)

    const cities = [...new Set((data || []).map((d) => d.city))].filter(Boolean)
    const localities = [...new Set((data || []).map((d) => d.locality))].filter(Boolean)
    const merged = [
      ...cities.filter((c) => c.toLowerCase().includes(q.toLowerCase())),
      ...localities.filter((l) => l.toLowerCase().includes(q.toLowerCase())),
    ].slice(0, 8)

    res.json(merged)
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

// GET /api/pgs/:id — full PG details with photos, amenities, sharing_types, avg rating
router.get('/:id', async (req, res) => {
  try {
    const pgId = req.params.id

    // Fetch PG with photos, amenities, sharing_types, owner profile
    const { data: pg, error: pgError } = await supabase
      .from('pg_listings')
      .select('*, photos:pg_photos(*), amenities(*), sharing_types(*), owner:profiles!pg_listings_owner_id_fkey(full_name, phone)')
      .eq('id', pgId)
      .single()

    if (pgError) throw pgError
    if (!pg) return res.status(404).json({ error: 'PG not found' })

    // Fetch custom_nearby_places separately to prevent crashes if the table hasn't been migrated
    const { data: customPlaces } = await supabase
      .from('custom_nearby_places')
      .select('label')
      .eq('pg_id', pgId)
    
    if (customPlaces) {
      pg.custom_nearby_places = customPlaces
    }

    // Fetch custom_amenities separately to prevent crashes if the table hasn't been migrated
    const { data: customAmenities } = await supabase
      .from('custom_amenities')
      .select('label')
      .eq('pg_id', pgId)
    
    if (customAmenities) {
      pg.custom_amenities = customAmenities
    }

    // Compute average rating
    const { data: ratingAgg } = await supabase
      .from('reviews')
      .select('rating', { count: 'exact', head: false })
      .eq('pg_id', pgId)

    const avgRating = ratingAgg && ratingAgg.length > 0
      ? (ratingAgg.reduce((sum: number, r: any) => sum + r.rating, 0) / ratingAgg.length)
      : 0

    const { data: confirmedInqs } = await supabase
      .from('inquiries')
      .select('id')
      .eq('pg_id', pgId)
      .eq('status', 'confirmed')

    const isVerifiedByOwner = confirmedInqs && confirmedInqs.length > 0

    res.json({
      ...pg,
      avg_rating: Number(avgRating.toFixed(1)),
      review_count: ratingAgg?.length ?? 0,
      is_verified: isVerifiedByOwner,
    })
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

// GET /api/pgs/:id/reviews — paginated reviews
router.get('/:id/reviews', async (req, res) => {
  try {
    const pgId = req.params.id
    const limit = Math.min(Number(req.query.limit) || 10, 50)
    const offset = Number(req.query.offset) || 0

    const { data, count, error } = await supabase
      .from('reviews')
      .select('*, reviewer:profiles!reviews_user_id_fkey(full_name)', { count: 'exact' })
      .eq('pg_id', pgId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    res.json({
      data: data || [],
      total: count ?? 0,
      limit,
      offset,
    })
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

// POST /api/pgs/reset-db — development database reset and seed utility
router.post('/reset-db', async (req, res) => {
  try {
    console.log('Starting DB Reset and Seeding via API...');

    // Delete in reverse order of FK constraints
    await supabase.from('reviews').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('bookings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('inquiries').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('payments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('beds').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('sharing_types').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('pg_photos').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('amenities').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('owner_documents').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('owner_kyc').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('pg_listings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    // Delete non-demo profiles
    await supabase
      .from('profiles')
      .delete()
      .not('id', 'in', '("00000000-0000-0000-0000-000000000002","00000000-0000-0000-0000-000000000003")');

    // Create owner profile
    await supabase.from('profiles').upsert({
      id: '00000000-0000-0000-0000-000000000002',
      full_name: 'Rajesh Sharma (Bangalore Owner)',
      phone: '+91 9876543210',
      role: 'owner',
    });

    // Create KYC
    await supabase.from('owner_kyc').upsert({
      owner_id: '00000000-0000-0000-0000-000000000002',
      pan_number: 'ABCDE1234F',
      aadhaar_number: '123456789012',
      bank_account: '91827364501',
      bank_ifsc: 'SBIN0001234',
      bank_name: 'State Bank of India',
      status: 'approved',
    });

    // Create PG
    const { error: pgErr } = await supabase.from('pg_listings').upsert({
      id: 'b1111111-1111-4111-a111-111111111101',
      owner_id: '00000000-0000-0000-0000-000000000002',
      name: 'Starlight Premium Coliving',
      description: 'Modern luxury PG located in the heart of Koramangala near Sony World Signal. Fully furnished with high-speed WiFi, daily housekeeping, and delicious meals.',
      address: 'No. 45, 5th Block, 80 Feet Road, Koramangala',
      city: 'Bangalore',
      locality: 'Koramangala',
      latitude: 12.935242,
      longitude: 77.624462,
      pg_type: 'co-ed',
      status: 'approved',
      total_beds: 4,
      available_beds: 4,
      monthly_rent_min: 12500,
      monthly_rent_max: 18000,
      deposit_amount: 15000,
      food_included: true,
      wifi_included: true,
      ac_rooms: true,
      parking: true,
      laundry: true,
      security_24x7: true,
      rules: 'No smoking inside rooms. Visitors allowed till 9 PM.',
    });

    if (pgErr) throw pgErr;

    // Photos
    await supabase.from('pg_photos').insert([
      { pg_id: 'b1111111-1111-4111-a111-111111111101', url: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?q=80&w=1200&auto=format&fit=crop', caption: 'Building Exterior', is_primary: true, type: 'exterior' },
      { pg_id: 'b1111111-1111-4111-a111-111111111101', url: 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?q=80&w=1200&auto=format&fit=crop', caption: 'Spacious Single AC Room', is_primary: false, type: 'room' }
    ]);

    // Sharing Types
    await supabase.from('sharing_types').insert([
      { pg_id: 'b1111111-1111-4111-a111-111111111101', type: 1, price_monthly: 18000, total_beds: 2, occupied_beds: 0 },
      { pg_id: 'b1111111-1111-4111-a111-111111111101', type: 2, price_monthly: 12500, total_beds: 2, occupied_beds: 0 }
    ]);

    // Beds
    await supabase.from('beds').insert([
      { pg_id: 'b1111111-1111-4111-a111-111111111101', room_number: '101', bed_label: 'Bed 1', sharing_type: 'single', monthly_rent: 18000, status: 'available', floor_number: 1, has_ac: true, has_attached_bath: true },
      { pg_id: 'b1111111-1111-4111-a111-111111111101', room_number: '101', bed_label: 'Bed 2', sharing_type: 'single', monthly_rent: 18000, status: 'available', floor_number: 1, has_ac: true, has_attached_bath: true },
      { pg_id: 'b1111111-1111-4111-a111-111111111101', room_number: '102', bed_label: 'Bed 1', sharing_type: 'double', monthly_rent: 12500, status: 'available', floor_number: 1, has_ac: true, has_attached_bath: true },
      { pg_id: 'b1111111-1111-4111-a111-111111111101', room_number: '102', bed_label: 'Bed 2', sharing_type: 'double', monthly_rent: 12500, status: 'available', floor_number: 1, has_ac: true, has_attached_bath: true }
    ]);

    // Create Admin Profile
    await supabase.from('profiles').upsert({
      id: '00000000-0000-0000-0000-000000000003',
      full_name: 'Super Admin',
      phone: '+91 9999999999',
      role: 'admin',
    });

    console.log('DB Reset and Seeding completed successfully!');
    res.json({ status: 'success', message: 'Database reset and seeded with exactly one PG and Super Admin.' });
  } catch (err) {
    console.error('Error resetting DB:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router
