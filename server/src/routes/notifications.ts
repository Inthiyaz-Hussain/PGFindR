import { Router } from 'express'
import { supabase } from '../index.js'
import { updateUserFcmToken, markNotificationRead, markAllNotificationsRead, getNotifications, getUnreadNotificationCount } from '../lib/notifications.js'

const router = Router()

// POST /api/notifications/register-token - Register FCM token for user
router.post('/register-token', async (req, res) => {
  try {
    const { user_id, fcm_token } = req.body

    if (!user_id || typeof user_id !== 'string') {
      return res.status(400).json({ error: 'user_id is required' })
    }
    if (!fcm_token || typeof fcm_token !== 'string') {
      return res.status(400).json({ error: 'fcm_token is required' })
    }

    const success = await updateUserFcmToken(user_id, fcm_token)

    if (success) {
      res.json({ message: 'FCM token registered successfully' })
    } else {
      res.status(500).json({ error: 'Failed to register FCM token' })
    }
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

// GET /api/notifications - Get notifications for user
router.get('/', async (req, res) => {
  try {
    const { user_id, limit } = req.query

    if (!user_id || typeof user_id !== 'string') {
      return res.status(400).json({ error: 'user_id is required' })
    }

    const notifications = await getNotifications(user_id, Number(limit) || 20)
    res.json(notifications)
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

// GET /api/notifications/unread-count - Get unread count for user
router.get('/unread-count', async (req, res) => {
  try {
    const { user_id } = req.query

    if (!user_id || typeof user_id !== 'string') {
      return res.status(400).json({ error: 'user_id is required' })
    }

    const count = await getUnreadNotificationCount(user_id)
    res.json({ count })
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

// PUT /api/notifications/:id/read - Mark notification as read
router.put('/:id/read', async (req, res) => {
  try {
    const success = await markNotificationRead(req.params.id)

    if (success) {
      res.json({ message: 'Notification marked as read' })
    } else {
      res.status(500).json({ error: 'Failed to mark notification as read' })
    }
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

// PUT /api/notifications/read-all - Mark all notifications as read for user
router.put('/read-all', async (req, res) => {
  try {
    const { user_id } = req.body

    if (!user_id || typeof user_id !== 'string') {
      return res.status(400).json({ error: 'user_id is required in body' })
    }

    const success = await markAllNotificationsRead(user_id)

    if (success) {
      res.json({ message: 'All notifications marked as read' })
    } else {
      res.status(500).json({ error: 'Failed to mark all notifications as read' })
    }
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

// GET /api/notifications/stream - SSE endpoint for realtime notifications
router.get('/stream', async (req, res) => {
  const { user_id } = req.query

  if (!user_id || typeof user_id !== 'string') {
    return res.status(400).json({ error: 'user_id is required' })
  }

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  // Send initial ping
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`)

  // Set up Supabase realtime subscription
  const channel = supabase
    .channel(`notifications:${user_id}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user_id}`,
      },
      (payload) => {
        res.write(`data: ${JSON.stringify({ type: 'notification', data: payload.new })}\n\n`)
      }
    )
    .subscribe()

  // Clean up on client disconnect
  req.on('close', () => {
    supabase.removeChannel(channel)
  })
})

export default router
