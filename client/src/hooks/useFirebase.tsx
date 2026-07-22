import { useEffect, useRef } from 'react'
import { useAuth } from './useAuth'
import { initializeFirebaseApp, requestNotificationPermission, onForegroundMessage } from '@/lib/firebase'
import { toast } from 'sonner'

export function useFirebasePush() {
  const { user } = useAuth()
  const initialized = useRef(false)

  useEffect(() => {
    if (!user || initialized.current) return

    const init = async () => {
      initialized.current = true

      // Initialize Firebase app
      const app = initializeFirebaseApp()
      if (!app) {
        console.log('Firebase not configured, push notifications disabled')
        return
      }

      // Request permission and register token
      try {
        const token = await requestNotificationPermission()
        if (token) {
          // Register token with backend
          await fetch('/api/notifications/register-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: user.id, fcm_token: token }),
          })
          console.log('FCM token registered')
        }
      } catch (err) {
        console.error('Failed to initialize push notifications:', err)
      }
    }

    init()
  }, [user])

  // Set up foreground message handler
  useEffect(() => {
    if (!user) return

    const cleanup = onForegroundMessage((payload) => {
      const data = payload as { notification?: { title?: string; body?: string }; data?: Record<string, string> }
      const title = data.notification?.title || 'New Notification'
      const body = data.notification?.body || ''

      toast.info(title, {
        description: body,
      })
    })

    return () => {
      if (cleanup) cleanup()
    }
  }, [user])
}
