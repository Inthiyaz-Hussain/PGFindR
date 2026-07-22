import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { SharingTypeItem } from '@/types'

export interface AvailabilityInfo {
  available: number
  total: number
}

export type AvailabilityMap = Record<string, AvailabilityInfo>

export interface RealTimeAvailabilityResult {
  availabilityMap: AvailabilityMap
  sharingTypes: Record<string, SharingTypeItem[]>
  lastUpdatedPgId: string | null
}

/**
 * Subscribe to Supabase Realtime changes on the `sharing_types` table.
 *
 * Single-PG mode (pgDetail = a UUID): subscribes with a filter
 *   `pg_id=eq.<id>` and tracks per-sharing-type rows for that PG.
 *
 * Multi-PG mode (pgDetail = null): subscribes to ALL sharing_types
 *   changes and maintains an availability map keyed by pg_id. Used
 *   by the home page to update availability pills across all visible
 *   PG cards in real time.
 *
 * The hook handles subscription setup, cleanup on unmount, and
 * automatic reconnection (Supabase client reconnects internally; we
 * also re-fetch the initial snapshot on reconnect via the callback).
 */
export function useRealTimeAvailability(
  pgDetail: string | null
): RealTimeAvailabilityResult {
  const [sharingTypesMap, setSharingTypesMap] = useState<Record<string, SharingTypeItem[]>>({})
  const [lastUpdatedPgId, setLastUpdatedPgId] = useState<string | null>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // Fetch initial snapshot for the PG(s) we care about
  const fetchInitial = useCallback(async () => {
    let query = supabase.from('sharing_types').select('*')
    if (pgDetail) {
      query = query.eq('pg_id', pgDetail)
    }
    const { data, error } = await query
    if (error || !data) return

    const grouped: Record<string, SharingTypeItem[]> = {}
    for (const row of data) {
      const item = row as SharingTypeItem
      if (!grouped[item.pg_id]) grouped[item.pg_id] = []
      grouped[item.pg_id].push(item)
    }
    setSharingTypesMap(grouped)
  }, [pgDetail])

  // Compute availability map from sharing types
  const computeAvailability = useCallback(
    (map: Record<string, SharingTypeItem[]>): AvailabilityMap => {
      const result: AvailabilityMap = {}
      for (const [pgId, items] of Object.entries(map)) {
        let total = 0
        let occupied = 0
        for (const s of items) {
          total += s.total_beds
          occupied += s.occupied_beds
        }
        result[pgId] = { available: total - occupied, total }
      }
      return result
    },
    []
  )

  useEffect(() => {
    fetchInitial()

    const channelName = pgDetail
      ? `sharing_types:pg:${pgDetail}:${Math.random().toString(36).substring(7)}`
      : `sharing_types:all:${Math.random().toString(36).substring(7)}`

    const filter = pgDetail ? `pg_id=eq.${pgDetail}` : undefined

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sharing_types',
          ...(filter ? { filter } : {}),
        },
        (payload) => {
          const eventType = payload.eventType

          if (eventType === 'UPDATE' || eventType === 'INSERT') {
            const newRow = payload.new as SharingTypeItem
            setSharingTypesMap((prev) => {
              const existing = prev[newRow.pg_id] || []
              const idx = existing.findIndex((s) => s.id === newRow.id)
              const updated = [...existing]
              if (idx >= 0) {
                updated[idx] = newRow
              } else {
                updated.push(newRow)
              }
              return { ...prev, [newRow.pg_id]: updated }
            })
            setLastUpdatedPgId(newRow.pg_id)
          } else if (eventType === 'DELETE') {
            const oldRow = payload.old as SharingTypeItem
            setSharingTypesMap((prev) => {
              const existing = prev[oldRow.pg_id] || []
              const filtered = existing.filter((s) => s.id !== oldRow.id)
              return { ...prev, [oldRow.pg_id]: filtered }
            })
            setLastUpdatedPgId(oldRow.pg_id)
          }
        }
      )
      .on('system', {}, () => {
        // Re-fetch on reconnect to catch up on missed changes
        fetchInitial()
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [pgDetail, fetchInitial])

  const availabilityMap = computeAvailability(sharingTypesMap)

  return {
    availabilityMap,
    sharingTypes: sharingTypesMap,
    lastUpdatedPgId,
  }
}
