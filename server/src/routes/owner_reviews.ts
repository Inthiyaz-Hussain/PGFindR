import { Router } from 'express'
import { getSupabaseClient } from '../index.js'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()

// Middleware to ensure the user is an owner
const requireOwner = async (req: any, res: any, next: any) => {
  if (req.user?.role !== 'owner') {
    return res.status(403).json({ error: 'Access denied: Owner role required' })
  }
  next()
}

// GET /api/owner/reviews - Get all reviews for the owner's PGs
router.get('/', authenticateToken, requireOwner, async (req: any, res) => {
  try {
    const ownerId = req.user?.id
    const limit = Math.min(Number(req.query.limit) || 20, 50)
    const offset = Number(req.query.offset) || 0

    const supabase = getSupabaseClient(req)

    // First get all PG IDs owned by this owner
    const { data: pgs, error: pgError } = await supabase
      .from('pg_listings')
      .select('id')
      .eq('owner_id', ownerId)

    if (pgError) throw pgError

    const pgIds = pgs.map((pg: any) => pg.id)

    if (pgIds.length === 0) {
      return res.json({ data: [], total: 0 })
    }

    // Now fetch reviews for these PGs
    const { data: reviews, error: reviewError, count } = await supabase
      .from('reviews')
      .select(`
        *,
        pg:pg_listings!reviews_pg_id_fkey(name),
        reviewer:profiles!reviews_user_id_fkey(full_name)
      `, { count: 'exact' })
      .in('pg_id', pgIds)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (reviewError) throw reviewError

    res.json({ data: reviews, total: count })
  } catch (err: any) {
    console.error('Error fetching owner reviews:', err)
    res.status(500).json({ error: 'Failed to fetch reviews', details: err.message })
  }
})

// PATCH /api/owner/reviews/:id/status - Approve or reject a review
router.patch('/:id/status', authenticateToken, requireOwner, async (req: any, res) => {
  try {
    const ownerId = req.user?.id
    const reviewId = req.params.id
    const { status } = req.body

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be approved or rejected.' })
    }

    const supabase = getSupabaseClient(req)

    // Ensure the review belongs to a PG owned by this owner
    const { data: review, error: checkError } = await supabase
      .from('reviews')
      .select('pg_id, pg:pg_listings!reviews_pg_id_fkey(owner_id)')
      .eq('id', reviewId)
      .single()

    if (checkError) throw checkError
    if (!review || (review as any).pg.owner_id !== ownerId) {
      return res.status(403).json({ error: 'Not authorized to modify this review' })
    }

    // Update the status
    const { data: updatedReview, error: updateError } = await supabase
      .from('reviews')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', reviewId)
      .select()
      .single()

    if (updateError) throw updateError

    res.json(updatedReview)
  } catch (err: any) {
    console.error('Error updating review status:', err)
    res.status(500).json({ error: 'Failed to update review status', details: err.message })
  }
})

export default router

