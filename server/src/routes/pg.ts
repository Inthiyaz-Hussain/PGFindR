import { Router } from 'express'
import { supabase, getSupabaseClient } from '../index.js'
import { authenticateToken, AuthRequest } from '../middleware/auth.js'

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
    const { id, payload, sharingTypes, amenities, customAmenities, customNearbyPlaces, photos, isAdmin } = req.body
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
      const { data, error } = await db
        .from('pg_listings')
        .update(payload)
        .eq('id', id)
        .select('id')

      if (error) throw error
      if (!data || data.length === 0) throw new Error("Unauthorized or PG not found")
    }

    // Save sharing types
    if (sharingTypes && sharingTypes.length > 0 && pgId) {
      // Find which types to keep
      const keepTypes = sharingTypes.map((s: any) => Number(s.type));

      // Attempt to delete types that are no longer in the payload
      if (keepTypes.length > 0) {
        const { error: delErr } = await supabase
          .from('sharing_types')
          .delete()
          .eq('pg_id', pgId)
          .not('type', 'in', `(${keepTypes.join(',')})`);
        
        if (delErr) {
          console.warn('Could not delete some sharing types (might be in use by beds/rooms):', delErr);
        }
      }
      
      // Deduplicate by type to prevent unique constraint violation
      const uniqueSharingTypes = Array.from(new Map(sharingTypes.map((s: any) => [Number(s.type), s])).values());
      
      const sharingPayloads = (uniqueSharingTypes as any[]).map((s: any) => ({
        pg_id: pgId,
        type: Number(s.type),
        price_monthly: Number(s.price_monthly) || 0,
        price_daily: s.price_daily ? Number(s.price_daily) : null,
        total_beds: Number(s.total_beds) || 0,
        occupied_beds: Number(s.occupied_beds) || 0,
      }))
      
      // Use upsert to avoid duplicate key errors for existing sharing types
      const { error: sharingErr } = await supabase
        .from('sharing_types')
        .upsert(sharingPayloads, { onConflict: 'pg_id,type' })
        
      if (sharingErr) throw sharingErr
    }

    // Save amenities
    if (pgId) {
      // We must handle the case where amenities lack RLS policies, so use supabase service client
      await supabase.from('amenities').delete().eq('pg_id', pgId)
      const amenityPayloads = Object.entries(amenities || {})
        .filter(([, v]) => v)
        .map(([key]) => ({ pg_id: pgId, key, is_available: true }))
      if (amenityPayloads.length > 0) {
        const { error: amenityErr } = await supabase.from('amenities').insert(amenityPayloads)
        if (amenityErr) throw amenityErr
      }
    }

    // Save custom amenities
    if (req.body.customAmenities && pgId) {
      try {
        await supabase.from('custom_amenities').delete().eq('pg_id', pgId)
        const customAmenityPayloads = req.body.customAmenities.map((label: string) => ({
          pg_id: pgId,
          label,
          created_by: payload.owner_id
        }))
        if (customAmenityPayloads.length > 0) {
          const { error: customAmenityErr } = await supabase.from('custom_amenities').insert(customAmenityPayloads)
          if (customAmenityErr) console.warn('Could not save custom_amenities:', customAmenityErr)
        }
      } catch (e) {
        console.warn('Could not save custom_amenities:', e)
      }
    }

    // Save custom nearby places
    if (customNearbyPlaces && Array.isArray(customNearbyPlaces) && pgId) {
      try {
        await supabase.from('custom_nearby_places').delete().eq('pg_id', pgId)
        if (customNearbyPlaces.length > 0) {
          const cnpPayload = customNearbyPlaces.map((label: string) => ({
            pg_id: pgId,
            label
          }))
          const { error: cnpErr } = await supabase.from('custom_nearby_places').insert(cnpPayload)
          if (cnpErr) throw cnpErr
        }
      } catch (e) {
        console.warn('Could not save custom_nearby_places:', e)
      }
    }

    // Save photos
    if (photos && photos.length > 0 && pgId) {
      await supabase.from('pg_photos').delete().eq('pg_id', pgId)
      const photoPayloads = photos.map((p: any) => ({
        pg_id: pgId,
        url: p.url,
        is_primary: p.is_primary || false
      }))
      const { error: photoErr } = await supabase.from('pg_photos').insert(photoPayloads)
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

// DELETE /api/pg/:id - Delete PG (owner or admin)
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params
    const userId = req.user?.id
    const userRole = req.user?.role

    if (!userId) {
      res.status(401).json({ error: 'User context not found' })
      return
    }

    // Fetch listing details to verify ownership
    const { data: pgListing, error: fetchErr } = await supabase
      .from('pg_listings')
      .select('owner_id')
      .eq('id', id)
      .single()

    if (fetchErr || !pgListing) {
      res.status(404).json({ error: 'PG listing not found' })
      return
    }

    // Authorize: Owner of the listing OR Admin
    if (pgListing.owner_id !== userId && userRole !== 'admin') {
      res.status(403).json({ error: 'Not authorized to delete this listing' })
      return
    }

    // 1. Fetch bookings for this PG to delete related payments & invoices & tenant documents
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id')
      .eq('pg_id', id)

    const bookingIds = bookings?.map(b => b.id) || []

    if (bookingIds.length > 0) {
      // Delete invoices first (foreign key to bookings)
      await supabase.from('invoices').delete().in('booking_id', bookingIds).throwOnError()
      
      // Delete tenant documents first (foreign key to bookings)
      await supabase.from('tenant_documents').delete().in('booking_id', bookingIds).throwOnError()

      // Delete payments first (foreign key to bookings)
      await supabase.from('payments').delete().in('booking_id', bookingIds).throwOnError()

      // Delete bookings
      await supabase.from('bookings').delete().eq('pg_id', id).throwOnError()
    }

    // 2. Delete inquiries
    await supabase.from('inquiries').delete().eq('pg_id', id).throwOnError()

    // 2.5 Delete reviews
    await supabase.from('reviews').delete().eq('pg_id', id).throwOnError()

    // 3. Delete beds
    await supabase.from('beds').delete().eq('pg_id', id).throwOnError()

    // 4. Delete rooms
    await supabase.from('rooms').delete().eq('pg_id', id).throwOnError()

    // 5. Delete sharing types
    await supabase.from('sharing_types').delete().eq('pg_id', id).throwOnError()

    // 6. Delete amenities
    await supabase.from('amenities').delete().eq('pg_id', id).throwOnError()

    // 7. Delete custom amenities
    await supabase.from('custom_amenities').delete().eq('pg_id', id).throwOnError()

    // 8. Delete photos
    await supabase.from('pg_photos').delete().eq('pg_id', id).throwOnError()

    // 9. Delete property media
    await supabase.from('property_media').delete().eq('property_id', id).throwOnError()

    // 9.5 Delete custom nearby places
    await supabase.from('custom_nearby_places').delete().eq('pg_id', id).throwOnError()

    // 10. Delete the pg_listings record
    const { error: deleteErr } = await supabase
      .from('pg_listings')
      .delete()
      .eq('id', id)

    if (deleteErr) throw deleteErr

    res.json({ success: true })
  } catch (err) {
    console.error('Delete PG error:', err)
    res.status(500).json({ error: (err as Error).message })
  }
})

export default router
