import { Router } from 'express'
import { getSupabaseClient } from '../index.js'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()

// GET /api/seeker/saved - Get all saved PGs for the authenticated user
router.get('/saved', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const supabase = getSupabaseClient(req)

    // Fetch saved PGs joined with pg_listings
    const { data, error } = await supabase
      .from('saved_pgs')
      .select('pg_id, pg:pg_listings(*, photos:pg_photos(*))')
      .eq('user_id', userId)

    if (error) throw error

    // Map to just the PG object, similar to how pg_listings works
    const formattedData = data.map((item: any) => ({
      ...item.pg,
      is_saved: true // explicitly set is_saved to true since it's in the saved list
    }))

    res.json(formattedData)
  } catch (error: any) {
    console.error('Error fetching saved PGs:', error)
    res.status(500).json({ error: 'Failed to fetch saved PGs', details: error.message })
  }
})

// POST /api/seeker/saved/:pgId - Toggle saved status of a PG
router.post('/saved/:pgId', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user?.id
    const { pgId } = req.params

    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const supabase = getSupabaseClient(req)

    // Check if it's already saved
    const { data: existing, error: checkError } = await supabase
      .from('saved_pgs')
      .select('id')
      .eq('user_id', userId)
      .eq('pg_id', pgId)
      .maybeSingle()

    if (checkError) throw checkError

    if (existing) {
      // Unsave
      const { error: deleteError } = await supabase
        .from('saved_pgs')
        .delete()
        .eq('id', existing.id)

      if (deleteError) throw deleteError
      return res.json({ saved: false, message: 'PG unsaved successfully' })
    } else {
      // Save
      const { error: insertError } = await supabase
        .from('saved_pgs')
        .insert({ user_id: userId, pg_id: pgId })

      if (insertError) throw insertError
      return res.json({ saved: true, message: 'PG saved successfully' })
    }
  } catch (error: any) {
    console.error('Error toggling saved PG:', error)
    res.status(500).json({ error: 'Failed to toggle saved PG', details: error.message })
  }
})

// GET /api/seeker/saved/check/:pgId - Check if a specific PG is saved
router.get('/saved/check/:pgId', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user?.id
    const { pgId } = req.params

    if (!userId) return res.status(200).json({ saved: false })

    const supabase = getSupabaseClient(req)

    const { data, error } = await supabase
      .from('saved_pgs')
      .select('id')
      .eq('user_id', userId)
      .eq('pg_id', pgId)
      .maybeSingle()

    if (error) throw error

    res.json({ saved: !!data })
  } catch (error: any) {
    console.error('Error checking saved PG:', error)
    res.status(500).json({ error: 'Failed to check saved PG status', details: error.message })
  }
})

// GET /api/seeker/saved/ids - Get an array of all saved PG IDs
router.get('/saved/ids', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user?.id
    if (!userId) return res.json([])

    const supabase = getSupabaseClient(req)
    const { data, error } = await supabase
      .from('saved_pgs')
      .select('pg_id')
      .eq('user_id', userId)

    if (error) throw error

    res.json(data.map((item: any) => item.pg_id))
  } catch (error: any) {
    console.error('Error fetching saved PG IDs:', error)
    res.status(500).json({ error: 'Failed to fetch saved PG IDs', details: error.message })
  }
})

// POST /api/seeker/saved/batch - Get PGs by array of IDs (for unauthenticated users using localStorage)
router.post('/saved/batch', async (req: any, res) => {
  try {
    const { pgIds } = req.body
    if (!Array.isArray(pgIds) || pgIds.length === 0) return res.json([])

    const supabase = getSupabaseClient(req)
    const { data, error } = await supabase
      .from('pg_listings')
      .select('*, photos:pg_photos(*)')
      .in('id', pgIds)

    if (error) throw error
    
    // Set is_saved to true for all
    const formattedData = data.map((item: any) => ({
      ...item,
      is_saved: true
    }))

    res.json(formattedData)
  } catch (error: any) {
    console.error('Error fetching batch PGs:', error)
    res.status(500).json({ error: 'Failed to fetch batch PGs', details: error.message })
  }
})

export default router
