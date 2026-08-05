import { useState } from 'react'
import { MessageSquare, Calendar, Loader2, CheckCircle, XCircle, Phone, User, MapPin, Clock, Briefcase, Users } from 'lucide-react'
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
  4: 'Dormitory',
}

export function OwnerInquiriesPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<InquiryStatus | 'all'>('all')

  const { data: inquiries, isLoading } = useQuery({
    queryKey: ['owner-all-inquiries', user?.id],
    queryFn: async () => {
      const pgRes = await supabaseUntyped.from('pg_listings').select('id').eq('owner_id', user!.id)
      const pgIds = (pgRes.data || []).map((p: { id: string }) => p.id)
      if (pgIds.length === 0) return []
      const { data } = await supabaseUntyped
        .from('inquiries')
        .select('*, pg:pg_listings(name, city), seeker:profiles!inquiries_seeker_id_fkey(full_name, phone)')
        .in('pg_id', pgIds)
        .order('created_at', { ascending: false })
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-all-inquiries'] })
      toast.success('Inquiry updated')
    },
    onError: () => toast.error('Failed to update inquiry'),
  })

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
