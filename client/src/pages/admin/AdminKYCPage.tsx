import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { OwnerKYC, KYCStatus } from '@/types'
import { toast } from 'sonner'
import { useState } from 'react'

const KYC_STATUS_CONFIG: Record<KYCStatus, { label: string; class: string }> = {
  pending: { label: 'Pending', class: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  approved: { label: 'Approved', class: 'bg-green-100 text-green-800 border-green-200' },
  rejected: { label: 'Rejected', class: 'bg-red-100 text-red-800 border-red-200' },
}

interface KYCWithOwner extends OwnerKYC {
  owner: { full_name: string; phone: string | null }
}

export function AdminKYCPage() {
  const queryClient = useQueryClient()
  const [note, setNote] = useState<{ id: string; text: string } | null>(null)

  const { data: kycList, isLoading } = useQuery({
    queryKey: ['admin-kyc'],
    queryFn: async () => {
      const { data } = await supabase
        .from('owner_kyc')
        .select('*, owner:profiles!owner_kyc_owner_id_fkey(full_name, phone)')
        .order('created_at', { ascending: false })
      return (data || []) as KYCWithOwner[]
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, admin_notes }: { id: string; status: KYCStatus; admin_notes?: string }) => {
      const { error } = await (supabase
        .from('owner_kyc') as any)
        .update({ status, admin_notes: admin_notes || null, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['admin-kyc'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      toast.success(`KYC ${vars.status}`)
      setNote(null)
    },
    onError: () => toast.error('Failed to update KYC'),
  })

  const pending = kycList?.filter((k) => k.status === 'pending') || []
  const processed = kycList?.filter((k) => k.status !== 'pending') || []

  function KYCCard({ k }: { k: KYCWithOwner }) {
    const cfg = KYC_STATUS_CONFIG[k.status]
    return (
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-semibold">{k.owner.full_name}</div>
              {k.owner.phone && <div className="text-sm text-muted-foreground">{k.owner.phone}</div>}
            </div>
            <Badge variant="outline" className={`text-xs ${cfg.class}`}>{cfg.label}</Badge>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {k.pan_number && <div><span className="text-muted-foreground">PAN: </span>{k.pan_number}</div>}
            {k.aadhaar_number && <div><span className="text-muted-foreground">Aadhaar: </span>{k.aadhaar_number}</div>}
            {k.bank_name && <div><span className="text-muted-foreground">Bank: </span>{k.bank_name}</div>}
            {k.bank_ifsc && <div><span className="text-muted-foreground">IFSC: </span>{k.bank_ifsc}</div>}
            {k.bank_account && <div className="col-span-2"><span className="text-muted-foreground">Account: </span>{k.bank_account}</div>}
          </div>

          {note?.id === k.id && (
            <Textarea
              placeholder="Admin notes (reason for rejection, etc.)..."
              value={note.text}
              onChange={(e) => setNote({ id: k.id, text: e.target.value })}
              rows={2}
            />
          )}

          {k.admin_notes && (
            <div className="text-xs text-muted-foreground bg-muted rounded px-2 py-1.5">Note: {k.admin_notes}</div>
          )}

          {k.status === 'pending' && (
            <div className="flex flex-wrap gap-2">
              <Button size="xs" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => updateMutation.mutate({ id: k.id, status: 'approved' })} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle className="size-3" />}
                Approve
              </Button>
              {note?.id === k.id ? (
                <>
                  <Button size="xs" variant="destructive" onClick={() => updateMutation.mutate({ id: k.id, status: 'rejected', admin_notes: note.text })} disabled={updateMutation.isPending}>
                    Confirm Reject
                  </Button>
                  <Button size="xs" variant="ghost" onClick={() => setNote(null)}>Cancel</Button>
                </>
              ) : (
                <Button size="xs" variant="outline" className="text-destructive hover:text-destructive" onClick={() => setNote({ id: k.id, text: '' })}>
                  <XCircle className="size-3" /> Reject
                </Button>
              )}
            </div>
          )}

          <div className="text-xs text-muted-foreground">Submitted {new Date(k.created_at).toLocaleDateString('en-IN')}</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="scroll-m-20 text-2xl font-bold tracking-tight">KYC Review</h1>
        <p className="text-muted-foreground mt-1">Verify owner identities before they can list PGs</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">{[1, 2].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>
      ) : (
        <Tabs defaultValue="pending">
          <TabsList className="mb-4">
            <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
            <TabsTrigger value="processed">Processed ({processed.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="pending">
            {pending.length > 0 ? (
              <div className="space-y-4">{pending.map((k) => <KYCCard key={k.id} k={k} />)}</div>
            ) : (
              <Empty className="border-dashed">
                <EmptyMedia variant="icon"><CheckCircle /></EmptyMedia>
                <EmptyTitle>No pending KYC</EmptyTitle>
                <EmptyDescription>All owner KYC requests have been processed.</EmptyDescription>
              </Empty>
            )}
          </TabsContent>
          <TabsContent value="processed">
            {processed.length > 0 ? (
              <div className="space-y-4">{processed.map((k) => <KYCCard key={k.id} k={k} />)}</div>
            ) : <div className="text-center py-8 text-muted-foreground">No processed KYC yet.</div>}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
