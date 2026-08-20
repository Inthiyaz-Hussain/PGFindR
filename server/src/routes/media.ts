import { Router, Response } from 'express'
import { getSupabaseClient } from '../index.js'
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth.js'
import { generatePresignedUploadUrl } from '../lib/r2.js'

const router = Router()

// POST /api/media/upload-url - Generate presigned PUT URL for public property media
router.post(
  '/upload-url',
  authenticateToken,
  requireRole('owner', 'admin'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { key, contentType } = req.body

      if (!key || !contentType) {
        res.status(400).json({ error: 'Missing key or contentType in request body' })
        return
      }

      const bucketName = process.env.R2_PUBLIC_BUCKET_NAME

      if (!bucketName) {
        res.status(500).json({ error: 'R2_PUBLIC_BUCKET_NAME is not configured' })
        return
      }

      const uploadUrl = await generatePresignedUploadUrl(bucketName, key, contentType)
      const publicDomain = process.env.R2_PUBLIC_DOMAIN || 'https://cdn.yourpgdomain.com'
      const fileUrl = `${publicDomain}/${key}`

      res.json({ uploadUrl, fileUrl })
    } catch (err) {
      console.error('Error generating public presigned URL:', err)
      res.status(500).json({ error: (err as Error).message })
    }
  }
)

// POST /api/media/confirm - Insert media record into property_media table
router.post(
  '/confirm',
  authenticateToken,
  requireRole('owner', 'admin'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { property_id, file_url, file_type } = req.body

      if (!property_id || !file_url || !file_type) {
        res.status(400).json({ error: 'Missing property_id, file_url, or file_type in request body' })
        return
      }

      if (!['image', 'video'].includes(file_type)) {
        res.status(400).json({ error: 'Invalid file_type. Must be image or video.' })
        return
      }

      const db = getSupabaseClient(req)
      const { data, error } = await db
        .from('property_media')
        .insert({
          property_id,
          file_url,
          file_type,
        })
        .select()
        .single()

      if (error) {
        res.status(400).json({ error: error.message })
        return
      }

      res.json(data)
    } catch (err) {
      console.error('Error confirming public media:', err)
      res.status(500).json({ error: (err as Error).message })
    }
  }
)

export default router
