import { useState } from 'react'
import { MessageSquare, Calendar, Loader2, CheckCircle, XCircle, Phone, User, MapPin, Clock, Briefcase, Users, BedSingle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabaseUntyped } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Inquiry, InquiryStatus } from '@/types'
import { toast } from 'sonner'

const STATUS_CONFIG: Record<InquiryStatus, { label: string; class: string }> = {
  pending: { label: 'Pending', class: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800' },
  contacted: { label: 'Contacted', class: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' },
  confirmed: { label: 'Confirmed', class: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' },
  cancelled: { label: 'Declined', class: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800' },
}

const SHARING_LABELS: Record<number, string> = {
  1: 'Single',
  2: 'Double',
  3: 'Triple',
  4: '4 Sharing',
}

export function OwnerInquiriesPage() {
  const { user, session } = useAuth()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<InquiryStatus | 'all'>('all')

  const hasGoogleAuth = session?.user?.app_metadata?.provider === 'google'

  const { data: inquiries, isLoading } = useQuery({
    queryKey: ['owner-all-inquiries', user?.id],
    queryFn: async () => {
      console.log('[OwnerInquiriesPage] Fetching inquiries for owner ID:', user?.id)
      const pgRes = await supabaseUntyped.from('pg_listings').select('id').eq('owner_id', user!.id)
      if (pgRes.error) {
        console.error('[OwnerInquiriesPage] Error fetching owner listings:', pgRes.error)
        throw pgRes.error
      }
      
      const pgIds = (pgRes.data || []).map((p: { id: string }) => p.id)
      console.log('[OwnerInquiriesPage] Found owner PG IDs:', pgIds)
      if (pgIds.length === 0) return []
      
      const { data, error } = await supabaseUntyped
        .from('inquiries')
        .select('*, pg:pg_listings(name, city), seeker:profiles!inquiries_seeker_id_fkey(full_name, phone), room:rooms(room_label, door_facing)')
        .in('pg_id', pgIds)
        .order('created_at', { ascending: false })
        
      if (error) {
        console.error('[OwnerInquiriesPage] Error fetching inquiries details:', error)
        throw error
      }
      
      console.log('[OwnerInquiriesPage] Successfully fetched inquiries:', data)
      return (data || []) as Inquiry[]
    },
    enabled: !!user,
  })

  const filteredInquiries = inquiries?.filter((inq) => {
    if (activeTab === 'all') return true
    return inq.status === activeTab
  })

  const statusCounts = {
    all: inquiries?.length || 0,
    pending: inquiries?.filter((i) => i.status === 'pending').length || 0,
    contacted: inquiries?.filter((i) => i.status === 'contacted').length || 0,
    confirmed: inquiries?.filter((i) => i.status === 'confirmed').length || 0,
    cancelled: inquiries?.filter((i) => i.status === 'cancelled').length || 0,
  }

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: InquiryStatus }) => {
      const { error } = await supabaseUntyped.from('inquiries').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['owner-all-inquiries', user?.id] })
      const previousInquiries = queryClient.getQueryData(['owner-all-inquiries', user?.id])

      queryClient.setQueryData(['owner-all-inquiries', user?.id], (old: any) => {
        if (!old) return old
        return old.map((inq: any) => 
          inq.id === id ? { ...inq, status } : inq
        )
      })

      return { previousInquiries }
    },
    onSuccess: () => {
      toast.success('Inquiry updated')
    },
    onError: (_err: any, _variables: any, context: any) => {
      if (context?.previousInquiries) {
        queryClient.setQueryData(['owner-all-inquiries', user?.id], context.previousInquiries)
      }
      toast.error('Failed to update inquiry')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-all-inquiries', user?.id] })
    },
  })

  if (!hasGoogleAuth) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center p-4 text-center space-y-4">
        <Empty>
          <EmptyMedia variant="icon"><User /></EmptyMedia>
          <EmptyTitle>Google Sign-In Required</EmptyTitle>
          <EmptyDescription>
            You must be signed in with Google to view and manage inquiries. Please sign out and sign in with Google.
          </EmptyDescription>
        </Empty>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="scroll-m-20 text-2xl font-bold tracking-tight">Inquiries</h1>
        <p className="text-muted-foreground mt-1">Manage seeker inquiries across your listings</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as InquiryStatus | 'all')} className="mb-6">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="all">
            All <Badge variant="secondary" className="ml-1.5">{statusCounts.all}</Badge>
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending <Badge variant="secondary" className="ml-1.5">{statusCounts.pending}</Badge>
          </TabsTrigger>
          <TabsTrigger value="contacted">
            Contacted <Badge variant="secondary" className="ml-1.5">{statusCounts.contacted}</Badge>
          </TabsTrigger>
          <TabsTrigger value="confirmed">
            Confirmed <Badge variant="secondary" className="ml-1.5">{statusCounts.confirmed}</Badge>
          </TabsTrigger>
          <TabsTrigger value="cancelled">
            Declined <Badge variant="secondary" className="ml-1.5">{statusCounts.cancelled}</Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="space-y-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>
      ) : filteredInquiries && filteredInquiries.length > 0 ? (
        <div className="space-y-4">
          {filteredInquiries.map((inq) => {
            const cfg = STATUS_CONFIG[inq.status]
            const pg = inq.pg as { name?: string; city?: string } | null
            const seeker = inq.seeker as { full_name?: string; phone?: string | null } | null
            const room = inq.room as { room_label?: string; door_facing?: string | null } | null

            return (
              <Card key={inq.id}>
                <CardContent className="pt-5 space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <User className="size-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-semibold">{inq.full_name || seeker?.full_name || 'Seeker'}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="size-3" />
                          {pg?.name || 'PG'} - {pg?.city}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className={cfg.class}>{cfg.label}</Badge>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    {inq.age && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="size-4" />
                        <span>{inq.age} years old</span>
                      </div>
                    )}
                    {inq.occupation && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Briefcase className="size-4" />
                        <span>{inq.occupation}</span>
                      </div>
                    )}
                    {inq.sharing_preference && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="size-4" />
                        <span>{SHARING_LABELS[inq.sharing_preference]} sharing</span>
                      </div>
                    )}
                    {inq.move_in_date && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="size-4" />
                        <span>Move-in: {new Date(inq.move_in_date).toLocaleDateString('en-IN')}</span>
                      </div>
                    )}
                  </div>

                  {/* Additional Info */}
                  <div className="flex flex-wrap gap-2">
                    {inq.city_of_origin && (
                      <Badge variant="secondary" className="text-xs">From: {inq.city_of_origin}</Badge>
                    )}
                    {inq.duration_value && inq.duration_unit && (
                      <Badge variant="secondary" className="text-xs">Duration: {inq.duration_value} {inq.duration_unit}</Badge>
                    )}
                    {inq.num_beds && (
                      <div className="flex items-center gap-2 text-muted-foreground col-span-2 sm:col-span-4 mt-1 p-2 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-md border border-indigo-100 dark:border-indigo-900">
                        <BedSingle className="size-4 text-indigo-600 dark:text-indigo-400" />
                        <span className="font-medium text-indigo-900 dark:text-indigo-200">
                          Requested: {inq.num_beds} {inq.num_beds === 1 ? 'Bed' : 'Beds'}
                        </span>
                        {room ? (
                          <span className="text-xs ml-2 px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/50 rounded-full text-indigo-800 dark:text-indigo-300">
                            in {room.room_label || 'Specific Room'} ({room.door_facing || 'Standard'} facing)
                          </span>
                        ) : (
                          <span className="text-xs ml-2 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-600 dark:text-slate-400">
                            Any Room (Auto assign)
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Message */}
                  {inq.message && (
                    <div className="text-sm bg-muted rounded-lg px-4 py-3 text-muted-foreground italic">
                      "{inq.message}"
                    </div>
                  )}

                  {/* Contact Info */}
                  {(seeker?.phone || inq.mobile) && inq.status !== 'pending' && (
                    <div className="flex items-center gap-2 text-sm font-medium text-primary">
                      <Phone className="size-4" />
                      {seeker?.phone || inq.mobile}
                    </div>
                  )}

                  {/* Actions */}
                  {(inq.status === 'pending' || inq.status === 'contacted') && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t">
                      {inq.status === 'pending' && (
                        <Button size="sm" variant="outline" onClick={() => updateMutation.mutate({ id: inq.id, status: 'contacted' })}>
                          <Phone className="size-4" /> Mark Contacted
                        </Button>
                      )}
                      <Button size="sm" variant="default" onClick={() => updateMutation.mutate({ id: inq.id, status: 'confirmed' })}>
                        {updateMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle className="size-4" />}
                        Confirm Availability
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => updateMutation.mutate({ id: inq.id, status: 'cancelled' })}>
                        <XCircle className="size-4" />
                        Decline
                      </Button>
                    </div>
                  )}

                  {/* Timestamp */}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="size-3" />
                    Received {new Date(inq.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Empty className="border-dashed">
          <EmptyMedia variant="icon"><MessageSquare /></EmptyMedia>
          <EmptyTitle>No inquiries found</EmptyTitle>
          <EmptyDescription>
            {activeTab === 'all'
              ? 'Once seekers submit inquiries for your PGs, they\'ll appear here.'
              : `No ${activeTab} inquiries.`}
          </EmptyDescription>
        </Empty>
      )}
    </div>
  )
}
