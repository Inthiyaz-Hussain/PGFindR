import { useState } from 'react'
import { CheckCircle, XCircle, Eye, Loader2, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { PGListing, PGStatus } from '@/types'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'

export function AdminApprovalsPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [rejectNote, setRejectNote] = useState<{ id: string; note: string } | null>(null)

  const { data: listings, isLoading } = useQuery({
    queryKey: ['admin-all-listings'],
    queryFn: async () => {
      const { data } = await supabase
        .from('pg_listings')
        .select('*, owner:profiles!pg_listings_owner_id_fkey(full_name, phone)')
        .order('created_at', { ascending: false })
      return (data || []) as PGListing[]
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: PGStatus }) => {
      const { error } = await (supabase
        .from('pg_listings') as any)
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-listings'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      toast.success(`Listing ${vars.status}`)
      setRejectNote(null)
    },
    onError: () => toast.error('Failed to update listing'),
  })

  const STATUS_CONFIG: Record<PGStatus, { label: string; class: string }> = {
    pending: { label: 'Pending Review', class: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    approved: { label: 'Approved', class: 'bg-green-100 text-green-800 border-green-200' },
    rejected: { label: 'Rejected', class: 'bg-red-100 text-red-800 border-red-200' },
    inactive: { label: 'Inactive', class: 'bg-gray-100 text-gray-700 border-gray-200' },
  }

  const pending = listings?.filter((l) => l.status === 'pending') || []
  const approved = listings?.filter((l) => l.status === 'approved') || []
  const rejected = listings?.filter((l) => l.status === 'rejected') || []

  function ListingCard({ l }: { l: PGListing }) {
    const cfg = STATUS_CONFIG[l.status]
    return (
      <Card key={l.id}>
        <CardContent className="pt-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
              <div className="font-semibold">{l.name}</div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                <MapPin className="size-3.5" />{l.locality}, {l.city}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Owner: {(l.owner as { full_name: string })?.full_name} ·
                {l.pg_type} PG · ₹{l.monthly_rent_min.toLocaleString('en-IN')}/mo
              </div>
            </div>
            <Badge variant="outline" className={`text-xs shrink-0 ${cfg.class}`}>{cfg.label}</Badge>
          </div>

          {rejectNote?.id === l.id && (
            <div className="mb-3 space-y-2">
              <Textarea
                placeholder="Reason for rejection..."
                value={rejectNote.note}
                onChange={(e) => setRejectNote({ id: l.id, note: e.target.value })}
                rows={2}
              />
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button size="xs" variant="outline" onClick={() => navigate(`/pg/${l.id}`)}>
              <Eye className="size-3" /> Preview
            </Button>
            {l.status !== 'approved' && (
              <Button size="xs" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => updateMutation.mutate({ id: l.id, status: 'approved' })} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle className="size-3" />}
                Approve
              </Button>
            )}
            {l.status !== 'rejected' && (
              <>
                {rejectNote?.id === l.id ? (
                  <>
                    <Button size="xs" variant="destructive" onClick={() => updateMutation.mutate({ id: l.id, status: 'rejected' })} disabled={updateMutation.isPending}>
                      Confirm Reject
                    </Button>
                    <Button size="xs" variant="ghost" onClick={() => setRejectNote(null)}>Cancel</Button>
                  </>
                ) : (
                  <Button size="xs" variant="outline" className="text-destructive hover:text-destructive" onClick={() => setRejectNote({ id: l.id, note: '' })}>
                    <XCircle className="size-3" /> Reject
                  </Button>
                )}
              </>
            )}
          </div>

          <div className="mt-2 text-xs text-muted-foreground">
            Submitted {new Date(l.created_at).toLocaleDateString('en-IN')}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="scroll-m-20 text-2xl font-bold tracking-tight">PG Approvals</h1>
        <p className="text-muted-foreground mt-1">Review and approve PG listings before they go live</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
      ) : (
        <Tabs defaultValue="pending">
          <TabsList className="mb-4">
            <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
            <TabsTrigger value="approved">Approved ({approved.length})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected ({rejected.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="pending">
            {pending.length > 0 ? (
              <div className="space-y-4">{pending.map((l) => <ListingCard key={l.id} l={l} />)}</div>
            ) : (
              <Empty className="border-dashed">
                <EmptyMedia variant="icon"><CheckCircle /></EmptyMedia>
                <EmptyTitle>All caught up!</EmptyTitle>
                <EmptyDescription>No PG listings pending review.</EmptyDescription>
              </Empty>
            )}
          </TabsContent>
          <TabsContent value="approved">
            {approved.length > 0 ? (
              <div className="space-y-4">{approved.map((l) => <ListingCard key={l.id} l={l} />)}</div>
            ) : <div className="text-center py-8 text-muted-foreground">No approved listings yet.</div>}
          </TabsContent>
          <TabsContent value="rejected">
            {rejected.length > 0 ? (
              <div className="space-y-4">{rejected.map((l) => <ListingCard key={l.id} l={l} />)}</div>
            ) : <div className="text-center py-8 text-muted-foreground">No rejected listings.</div>}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
