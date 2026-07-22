import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabaseUntyped } from '@/lib/supabase'
import { useAuth } from './useAuth'

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  body: string
  data: Record<string, unknown>
  read: boolean
  created_at: string
}

export function useNotifications() {
  const { user } = useAuth()
  const channelRef = useRef<ReturnType<typeof supabaseUntyped.channel> | null>(null)

  const { data: notifications, isLoading, refetch } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user) return []
      const { data } = await supabaseUntyped
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)
      return (data || []) as Notification[]
    },
    enabled: !!user,
  })

  const { data: unreadCount, refetch: refetchUnread } = useQuery({
    queryKey: ['notifications-unread-count', user?.id],
    queryFn: async () => {
      if (!user) return 0
      const { count } = await supabaseUntyped
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false)
      return count || 0
    },
    enabled: !!user,
  })

  // Subscribe to real-time notification updates
  useEffect(() => {
    if (!user) return

    const uniqueChannelName = `notifications:${user.id}:${Math.random().toString(36).substring(7)}`
    const channel = supabaseUntyped
      .channel(uniqueChannelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          refetch()
          refetchUnread()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          refetch()
          refetchUnread()
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabaseUntyped.removeChannel(channelRef.current)
      }
    }
  }, [user, refetch, refetchUnread])

  const markAsRead = async (notificationId: string) => {
    await supabaseUntyped
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)
    refetch()
    refetchUnread()
  }

  const markAllAsRead = async () => {
    if (!user) return
    await supabaseUntyped
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false)
    refetch()
    refetchUnread()
  }

  return {
    notifications: notifications || [],
    unreadCount: unreadCount || 0,
    isLoading,
    markAsRead,
    markAllAsRead,
    refetch,
  }
}
