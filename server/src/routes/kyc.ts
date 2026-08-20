import { Router, Response } from 'express'
import { supabase, getSupabaseClient } from '../index.js'
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth.js'
import { generatePresignedUploadUrl, generatePresignedViewUrl } from '../lib/r2.js'

const router = Router()

// POST /api/kyc/upload-url - Generate presigned PUT URL for private tenant KYC
router.post(
  '/upload-url',
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { docType } = req.body
      const userId = req.user?.id

      if (!userId) {
        res.status(401).json({ error: 'User context not found' })
        return
      }

      if (!docType) {
        res.status(400).json({ error: 'Missing docType in request body' })
        return
      }

      const bucketName = process.env.R2_PRIVATE_BUCKET_NAME

      if (!bucketName) {
        res.status(500).json({ error: 'R2_PRIVATE_BUCKET_NAME is not configured' })
        return
      }

      const timestamp = Date.now()
      const key = `kyc/${userId}/${docType}-${timestamp}.webp`

      // Generate a short-lived (10 min) presigned PUT URL
      const uploadUrl = await generatePresignedUploadUrl(bucketName, key, 'image/webp', 600)

      // Create a pending KYC entry in the database
      const db = getSupabaseClient(req)
      const { data, error } = await db
        .from('tenant_kyc')
        .insert({
          tenant_id: userId,
          document_type: docType,
          r2_storage_key: key,
          status: 'pending',
        })
        .select()
        .single()

      if (error) {
        res.status(400).json({ error: error.message })
        return
      }

      res.json({ uploadUrl, key, kycId: data.id })
    } catch (err) {
      console.error('Error generating private KYC upload URL:', err)
      res.status(500).json({ error: (err as Error).message })
    }
  }
)

// GET /api/kyc/view-url - Generate short-lived presigned GET URL for authorized owner or admin
router.get(
  '/view-url',
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { kycId } = req.query

      if (!kycId) {
        res.status(400).json({ error: 'Missing kycId query parameter' })
        return
      }

      // 1. Fetch KYC metadata (using bypass/service client to read security key securely)
      const { data: kyc, error } = await supabase
        .from('tenant_kyc')
        .select('*')
        .eq('id', kycId)
        .single()

      if (error || !kyc) {
        res.status(404).json({ error: 'KYC document not found' })
        return
      }

      const callerId = req.user?.id
      const callerRole = req.user?.role

      if (!callerId) {
        res.status(401).json({ error: 'Caller context not found' })
        return
      }

      // 2. Authorize access: Admin OR Respective Tenant OR PG Owner with a booking
      let authorized = false

      if (callerRole === 'admin') {
        authorized = true
      } else if (callerId === kyc.tenant_id) {
        authorized = true
      } else if (callerRole === 'owner') {
        // Check if there is a booking between this owner and the tenant
        const { data: booking, error: bookingErr } = await supabase
          .from('bookings')
          .select('id')
          .eq('seeker_id', kyc.tenant_id)
          .eq('owner_id', callerId)
          .limit(1)

        if (!bookingErr && booking && booking.length > 0) {
          authorized = true
        }
      }

      if (!authorized) {
        res.status(403).json({ error: 'Not authorized to view this document' })
        return
      }

      const bucketName = process.env.R2_PRIVATE_BUCKET_NAME

      if (!bucketName) {
        res.status(500).json({ error: 'R2_PRIVATE_BUCKET_NAME is not configured' })
        return
      }

      // 3. Generate 10-minute temporary signed GET URL
      const viewUrl = await generatePresignedViewUrl(bucketName, kyc.r2_storage_key, 600)
      res.json({ viewUrl })
    } catch (err) {
      console.error('Error generating private KYC view URL:', err)
      res.status(500).json({ error: (err as Error).message })
    }
  }
)

// GET /api/kyc/queue - List all tenant KYC documents for admin review
router.get(
  '/queue',
  authenticateToken,
  requireRole('admin'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('tenant_kyc')
        .select('*, tenant:profiles!tenant_kyc_tenant_id_fkey(full_name, email)')
        .order('uploaded_at', { ascending: false })

      if (error) {
        res.status(400).json({ error: error.message })
        return
      }

      res.json(data)
    } catch (err) {
      console.error('Error fetching KYC queue:', err)
      res.status(500).json({ error: (err as Error).message })
    }
  }
)

// PUT /api/kyc/:id/status - Approve or reject tenant KYC
router.put(
  '/:id/status',
  authenticateToken,
  requireRole('admin'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params
      const { status } = req.body

      if (!status || !['verified', 'rejected', 'pending'].includes(status)) {
        res.status(400).json({ error: 'Invalid status. Must be pending, verified, or rejected.' })
        return
      }

      const { data, error } = await supabase
        .from('tenant_kyc')
        .update({ status })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        res.status(400).json({ error: error.message })
        return
      }

      res.json(data)
    } catch (err) {
      console.error('Error updating KYC status:', err)
      res.status(500).json({ error: (err as Error).message })
    }
  }
)

export default router
