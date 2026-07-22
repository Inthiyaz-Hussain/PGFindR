import { supabase } from '../index.js'

export interface CreateNotificationParams {
  userId: string
  type: 'inquiry_new' | 'inquiry_confirmed' | 'inquiry_declined' | 'booking_confirmed' | 'payment_received' | 'general'
  title: string
  body: string
  data?: Record<string, unknown>
}

export async function createNotification(params: CreateNotificationParams): Promise<boolean> {
  try {
    const { error } = await supabase.from('notifications').insert({
      user_id: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      data: params.data || {},
      read: false,
    })

    if (error) {
      console.error('Failed to create notification:', error)
      return false
    }

    return true
  } catch (err) {
    console.error('Error creating notification:', err)
    return false
  }
}

export async function markNotificationRead(notificationId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)

    return !error
  } catch (err) {
    console.error('Error marking notification read:', err)
    return false
  }
}

export async function markAllNotificationsRead(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false)

    return !error
  } catch (err) {
    console.error('Error marking all notifications read:', err)
    return false
  }
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false)

    if (error) {
      return 0
    }

    return count || 0
  } catch (err) {
    console.error('Error getting unread count:', err)
    return 0
  }
}

export async function getNotifications(userId: string, limit = 20): Promise<unknown[]> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching notifications:', error)
      return []
    }

    return data || []
  } catch (err) {
    console.error('Error fetching notifications:', err)
    return []
  }
}

export async function getUserFcmToken(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('fcm_token')
      .eq('id', userId)
      .single()

    if (error || !data) {
      return null
    }

    return (data as { fcm_token: string | null }).fcm_token
  } catch (err) {
    console.error('Error getting FCM token:', err)
    return null
  }
}

export async function updateUserFcmToken(userId: string, token: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ fcm_token: token })
      .eq('id', userId)

    return !error
  } catch (err) {
    console.error('Error updating FCM token:', err)
    return false
  }
}
