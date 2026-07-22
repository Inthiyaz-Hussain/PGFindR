import { initializeApp } from 'firebase/app'
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

let app: ReturnType<typeof initializeApp> | null = null
let messaging: ReturnType<typeof getMessaging> | null = null

export function initializeFirebaseApp() {
  if (app) {
    return app
  }

  // Check if all required config values are present
  if (!firebaseConfig.projectId || !firebaseConfig.apiKey) {
    console.warn('Firebase configuration not complete. Push notifications will be disabled.')
    return null
  }

  try {
    app = initializeApp(firebaseConfig)
    return app
  } catch (error) {
    console.error('Failed to initialize Firebase app:', error)
    return null
  }
}

export async function getFirebaseMessagingInstance() {
  if (messaging) {
    return messaging
  }

  const isSupportedBrowser = await isSupported()
  if (!isSupportedBrowser) {
    console.warn('Firebase Messaging is not supported in this browser.')
    return null
  }

  const firebaseApp = initializeFirebaseApp()
  if (!firebaseApp) {
    return null
  }

  try {
    messaging = getMessaging(firebaseApp)
    return messaging
  } catch (error) {
    console.error('Failed to get Firebase Messaging instance:', error)
    return null
  }
}

export async function requestNotificationPermission(): Promise<string | null> {
  const messagingInstance = await getFirebaseMessagingInstance()
  if (!messagingInstance) {
    return null
  }

  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      console.warn('Notification permission not granted')
      return null
    }

    // Get FCM token
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY
    if (!vapidKey) {
      console.warn('VAPID key not configured. Cannot get FCM token.')
      return null
    }

    const token = await getToken(messagingInstance, { vapidKey })
    return token
  } catch (error) {
    console.error('Failed to get notification permission:', error)
    return null
  }
}

export async function registerFcmToken(userId: string): Promise<boolean> {
  const token = await requestNotificationPermission()
  if (!token) {
    return false
  }

  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://swiftpg-backend.onrender.com'}/api/notifications/register-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, fcm_token: token }),
    })

    if (!response.ok) {
      console.error('Failed to register FCM token')
      return false
    }

    console.log('FCM token registered successfully')
    return true
  } catch (error) {
    console.error('Error registering FCM token:', error)
    return false
  }
}

export function onForegroundMessage(callback: (payload: unknown) => void): (() => void) | null {
  getFirebaseMessagingInstance().then((messagingInstance) => {
    if (!messagingInstance) {
      return
    }

    onMessage(messagingInstance, (payload) => {
      console.log('Foreground message received:', payload)
      callback(payload)
    })
  })

  // Return a no-op cleanup function (onMessage doesn't provide an unsubscribe)
  return () => {}
}

export { messaging }
