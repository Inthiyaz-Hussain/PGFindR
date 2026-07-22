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
      limit = '20',
      offset = '0',
    } = req.query as Record<string, string>

    const pgLimit = Math.min(Number(limit) || 20, 50)
    const pgOffset = Number(offset) || 0

    // ── Build query ──────────────────────────────────────────────────────────
    let query = supabase
      .from('pg_listings')
      .select('*, photos:pg_photos(url, is_primary)')
      .eq('status', 'approved')

    if (q) {
      query = query.or(
        `name.ilike.%${q}%,city.ilike.%${q}%,locality.ilike.%${q}%,address.ilike.%${q}%`
      )
    }
    if (min_price) query = query.gte('monthly_rent_min', Number(min_price))
    if (max_price) query = query.lte('monthly_rent_min', Number(max_price))
    if (food === 'true') query = query.eq('food_included', true)
    if (gender) query = query.eq('pg_type', gender)
    if (available_only === 'true') query = query.gt('available_beds', 0)

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
      .limit(lat && lng ? 500 : pgOffset + pgLimit)

    if (error) throw error

    // ── Geo filter ────────────────────────────────────────────────────────────
    type PGWithDistance = (typeof pgs)[0] & { distance_meters?: number }
    let results: PGWithDistance[] = pgs || []

    if (lat && lng) {
      const userLat = Number(lat)
      const userLng = Number(lng)
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
        .filter((pg) => pg.distance_meters == null || pg.distance_meters <= radiusM)
        .sort((a, b) => (a.distance_meters ?? Infinity) - (b.distance_meters ?? Infinity))
    }

    const total = results.length
    const page = results.slice(pgOffset, pgOffset + pgLimit)

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
      .eq('status', 'approved')
      .single()

    if (pgError) throw pgError
    if (!pg) return res.status(404).json({ error: 'PG not found' })

    // Compute average rating
    const { data: ratingAgg } = await supabase
      .from('reviews')
      .select('rating', { count: 'exact', head: false })
      .eq('pg_id', pgId)

    const avgRating = ratingAgg && ratingAgg.length > 0
      ? (ratingAgg.reduce((sum: number, r: any) => sum + r.rating, 0) / ratingAgg.length)
      : 0

    res.json({
      ...pg,
      avg_rating: Number(avgRating.toFixed(1)),
      review_count: ratingAgg?.length ?? 0,
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

    const { data, error, count } = await supabase
      .from('reviews')
      .select('*, reviewer:profiles(full_name)', { count: 'exact' })
      .eq('pg_id', pgId)
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

export default router
