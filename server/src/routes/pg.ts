import { Router } from 'express'
import { supabase, getSupabaseClient } from '../index.js'

const router = Router()

// GET /api/pg - List all active PGs
router.get('/', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('pg_listings')
      .select('*, owner:profiles!pg_listings_owner_id_fkey(full_name, phone), photos:url')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })

    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

// GET /api/pg/:id - Get single PG details
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('pg_listings')
      .select('*, owner:profiles!pg_listings_owner_id_fkey(full_name, phone, email), photos:pg_photos(url, is_primary), beds(*)')
      .eq('id', req.params.id)
      .single()

    if (error) throw error
    if (!data) return res.status(404).json({ error: 'PG not found' })
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

// GET /api/pg/:id/availability - Get real-time bed availability
router.get('/:id/availability', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('beds')
      .select('id, room_number, bed_label, sharing_type, monthly_rent, status, has_ac, has_attached_bath')
      .eq('pg_id', req.params.id)

    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

// Helper to simulate email dispatch to the CEO
async function sendCEONotificationEmail(pgName: string, ownerName: string, pgId: string) {
  const dummyCEOMail = 'ceo@findpgr.demo'
  const subject = `[Action Required] New PG Listing Submission: ${pgName}`
  const body = `
    Hi CEO,
    
    A new PG Listing "${pgName}" has been submitted for approval by owner/manager "${ownerName}".
    
    Listing Details:
    - PG ID: ${pgId}
    - Submitted By: ${ownerName}
    
    Please click the link below to review and approve/reject the listing:
    http://localhost:5173/admin/pgs
    
    Regards,
    FindPgR System
  `
  
  console.log(`=========================================`)
  console.log(`SIMULATING EMAIL DISPATCH TO CEO`)
  console.log(`To: ${dummyCEOMail}`)
  console.log(`Subject: ${subject}`)
  console.log(`Body:\n${body}`)
  console.log(`=========================================`)
}

// POST /api/pg/save-listing - Atomic save listing + relationships (bypasses RLS issues on the client side)
router.post('/save-listing', async (req, res) => {
  try {
    const { id, payload, sharingTypes, amenities, photos, isAdmin } = req.body
    const isNew = !id || id === 'new'

    let pgId = id
    // Use admin client if requested by admin console to bypass RLS
    const db = isAdmin ? supabase : getSupabaseClient(req)

    if (isNew) {
      const { data, error } = await db
        .from('pg_listings')
        .insert(payload)
        .select('id')
        .single()

      if (error) throw error
      pgId = data.id
    } else {
      const { error } = await db
        .from('pg_listings')
        .update(payload)
        .eq('id', id)

      if (error) throw error
    }

    // Save sharing types
    if (sharingTypes && sharingTypes.length > 0 && pgId) {
      await db.from('sharing_types').delete().eq('pg_id', pgId)
      const sharingPayloads = sharingTypes.map((s: any) => ({
        pg_id: pgId,
        type: s.type,
        price_monthly: Number(s.price_monthly) || 0,
        price_daily: s.price_daily ? Number(s.price_daily) : null,
        total_beds: Number(s.total_beds) || 0,
        occupied_beds: 0,
      }))
      const { error: sharingErr } = await db.from('sharing_types').insert(sharingPayloads)
      if (sharingErr) throw sharingErr
    }

    // Save amenities
    if (pgId) {
      await db.from('amenities').delete().eq('pg_id', pgId)
      const amenityPayloads = Object.entries(amenities || {})
        .filter(([, v]) => v)
        .map(([key]) => ({ pg_id: pgId, key, is_available: true }))
      if (amenityPayloads.length > 0) {
        const { error: amenityErr } = await db.from('amenities').insert(amenityPayloads)
        if (amenityErr) throw amenityErr
      }
    }

    // Save photos
    if (photos && photos.length > 0 && pgId) {
      await db.from('pg_photos').delete().eq('pg_id', pgId)
      const photoPayloads = photos.map((p: any, i: number) => ({
        pg_id: pgId,
        url: p.url,
        type: p.type,
        caption: p.caption,
        is_primary: i === 0,
      }))
      const { error: photoErr } = await db.from('pg_photos').insert(photoPayloads)
      if (photoErr) throw photoErr
    }

    // Trigger CEO Email Notification and In-App notification on submission for approval (status is pending)
    if (payload.status === 'pending') {
      const { data: ownerProfile } = await db
        .from('profiles')
        .select('full_name')
        .eq('id', payload.owner_id)
        .single()
      const ownerName = ownerProfile?.full_name || 'Property Owner'

      // Send simulated email
      await sendCEONotificationEmail(payload.name, ownerName, pgId)

      // Add in-app notification to the Admin/CEO user's profile
      await db
        .from('notifications')
        .insert({
          user_id: '00000000-0000-0000-0000-000000000003', // CEO/Admin ID in seeded db
          title: 'Pending PG Approval Action Required',
          message: `PG "${payload.name}" has been submitted for approval by ${ownerName}.`,
          type: 'booking_inquiry',
        })
    }

    return res.json({ success: true, pgId })
  } catch (err: any) {
    console.error('Save listing error:', err)
    return res.status(500).json({ error: err.message || 'Failed to save listing' })
  }
})

// POST /api/pg - Create new PG (owner only)
router.post('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('pg_listings')
      .insert({ ...req.body, status: 'pending' })
      .select()
      .single()

    if (error) throw error
    res.status(201).json(data)
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

// PUT /api/pg/:id - Update PG (owner only)
router.put('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('pg_listings')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single()

    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

// DELETE /api/pg/:id - Delete PG (owner only)
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('pg_listings')
      .delete()
      .eq('id', req.params.id)

    if (error) throw error
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

export default router
