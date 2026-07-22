import { Router } from 'express'
import { supabase } from '../index.js'

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
