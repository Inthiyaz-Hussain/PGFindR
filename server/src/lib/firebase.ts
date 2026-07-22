import { initializeApp, getApp, getApps, App } from 'firebase-admin/app'
import { getMessaging, Messaging } from 'firebase-admin/messaging'
import { cert } from 'firebase-admin/app'

let firebaseApp: App | null = null

export function initializeFirebase() {
  if (firebaseApp) {
    return firebaseApp
  }

  // Check for required environment variables
  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY

  if (
    !projectId ||
    !clientEmail ||
    !rawPrivateKey ||
    projectId.includes('your_project_id') ||
    rawPrivateKey.includes('YOUR_PRIVATE_KEY_HERE')
  ) {
    console.log('Firebase Admin SDK key not set. Push notifications running in client-mode.')
    return null
  }

  try {
    // Clean and handle escaped/quoted newlines in private key
    let formattedPrivateKey = rawPrivateKey.trim()
    if (
      (formattedPrivateKey.startsWith('"') && formattedPrivateKey.endsWith('"')) ||
      (formattedPrivateKey.startsWith("'") && formattedPrivateKey.endsWith("'"))
    ) {
      formattedPrivateKey = formattedPrivateKey.slice(1, -1)
    }
    formattedPrivateKey = formattedPrivateKey.replace(/\\n/g, '\n')

    // Check if app already initialized
    if (getApps().length > 0) {
      firebaseApp = getApp()
    } else {
      firebaseApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: formattedPrivateKey,
        }),
      })
    }

    console.log('Firebase Admin SDK initialized successfully')
    return firebaseApp
  } catch (error) {
    console.warn('Firebase Admin SDK could not be initialized with provided credentials. Push notifications will be disabled.')
    return null
  }
}

export function getFirebaseMessaging(): Messaging | null {
  const app = initializeFirebase()
  if (!app) {
    return null
  }
  return getMessaging(app)
}

export interface PushNotificationPayload {
  token: string
  title: string
  body: string
  data?: Record<string, string>
}

export async function sendPushNotification(payload: PushNotificationPayload): Promise<boolean> {
  const messaging = getFirebaseMessaging()
  if (!messaging) {
    console.warn('Firebase Messaging not initialized. Cannot send push notification.')
    return false
  }

  try {
    const message = {
      token: payload.token,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data || {},
      android: {
        priority: 'high' as const,
        notification: {
          channelId: 'inquiries',
          priority: 'high' as const,
          sound: 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    }

    const response = await messaging.send(message)
    console.log('Push notification sent successfully:', response)
    return true
  } catch (error) {
    console.error('Failed to send push notification:', error)

    // Check for invalid token errors
    if (error instanceof Error) {
      const errorMsg = error.message
      if (
        errorMsg.includes('registration-token-not-registered') ||
        errorMsg.includes('invalid-registration-token')
      ) {
        console.warn('FCM token is invalid or expired. Token should be removed.')
        return false
      }
    }

    return false
  }
}

export interface MultiNotificationPayload {
  tokens: string[]
  title: string
  body: string
  data?: Record<string, string>
}

export async function sendMulticastNotification(payload: MultiNotificationPayload): Promise<number> {
  const messaging = getFirebaseMessaging()
  if (!messaging) {
    console.warn('Firebase Messaging not initialized. Cannot send multicast notification.')
    return 0
  }

  if (payload.tokens.length === 0) {
    return 0
  }

  try {
    const message = {
      tokens: payload.tokens,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data || {},
      android: {
        priority: 'high' as const,
        notification: {
          channelId: 'inquiries',
          priority: 'high' as const,
          sound: 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    }

    const response = await messaging.sendEachForMulticast(message)
    console.log(`Multicast sent: ${response.successCount} success, ${response.failureCount} failed`)
    return response.successCount
  } catch (error) {
    console.error('Failed to send multicast notification:', error)
    return 0
  }
}
