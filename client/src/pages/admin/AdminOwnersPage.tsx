import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { UserCheck, Search, ChevronLeft, ChevronRight, CheckCircle, XCircle, Loader2, Eye, FileText, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabaseUntyped } from '@/lib/supabase'
import type { KYCStatus, Profile } from '@/types'
import { toast } from 'sonner'

const KYC_STATUS_CONFIG: Record<KYCStatus, { label: string; class: string }> = {
  pending: { label: 'Pending', class: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400' },
  approved: { label: 'Verified', class: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400' },
  rejected: { label: 'Rejected', class: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400' },
}

const ITEMS_PER_PAGE = 10

interface OwnerWithDetails extends Profile {
  kyc?: {
    id: string
    status: KYCStatus
    pan_number: string | null
    aadhaar_number: string | null
    bank_account: string | null
    bank_ifsc: string | null
    bank_name: string | null
    admin_notes: string | null
    created_at: string
  }
  pg_count: number
  documents?: { id: string; doc_type: string; url: string; verified: boolean }[]
}

export function AdminOwnersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const [selectedOwner, setSelectedOwner] = useState<OwnerWithDetails | null>(null)
  const [kycNote, setKycNote] = useState('')

  const page = Number(searchParams.get('page') || '1')
  const kycFilter = searchParams.get('kyc') || 'all'
  const searchQuery = searchParams.get('search') || ''

  const { data: ownersData, isLoading } = useQuery({
    queryKey: ['admin-owners', page, kycFilter, searchQuery],
    queryFn: async () => {
      let query = supabaseUntyped
        .from('profiles')
        .select('*, kyc:owner_kyc(*), documents:owner_documents(*)', { count: 'exact' })
        .eq('role', 'owner')
        .order('created_at', { ascending: false })
        .range((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE - 1)

      if (searchQuery) {
        query = query.ilike('full_name', `%${searchQuery}%`)
      }

      const { data, count } = await query

      // Get PG count for each owner
      const owners = (data || []) as OwnerWithDetails[]
      const ownerIds = owners.map((o) => o.id)
      const { data: pgCounts } = await supabaseUntyped
        .from('pg_listings')
        .select('owner_id, id')
        .in('owner_id', ownerIds)

      const countMap = (pgCounts || []).reduce((acc: Record<string, number>, pg: { owner_id: string }) => {
        acc[pg.owner_id] = (acc[pg.owner_id] || 0) + 1
        return acc
      }, {})

      owners.forEach((o) => { o.pg_count = countMap[o.id] || 0 })

      // Filter by KYC status
      let filtered = owners
      if (kycFilter !== 'all') {
        filtered = owners.filter((o) => (o.kyc as { status: string } | null)?.status === kycFilter)
      }

      return { owners: filtered, total: count || 0 }
    },
  })

  const updateKycMutation = useMutation({
    mutationFn: async ({ kycId, status, adminNotes }: { kycId: string; status: KYCStatus; adminNotes?: string }) => {
      const { error } = await supabaseUntyped
        .from('owner_kyc')
        .update({ status, admin_notes: adminNotes || null, updated_at: new Date().toISOString() })
        .eq('id', kycId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-owners'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats-full'] })
      toast.success('KYC updated')
      setSelectedOwner(null)
      setKycNote('')
    },
    onError: () => toast.error('Failed to update KYC'),
  })

  const totalPages = Math.ceil((ownersData?.total || 0) / ITEMS_PER_PAGE)

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams)
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.set('page', '1')
    setSearchParams(params)
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="scroll-m-20 text-2xl font-bold tracking-tight">Owner Management</h1>
        <p className="text-muted-foreground mt-1">View owners and verify their KYC documents</p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-5">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search owners..."
                  value={searchQuery}
                  onChange={(e) => updateFilter('search', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Button
              variant={kycFilter === 'all' ? 'default' : 'outline'}
              onClick={() => updateFilter('kyc', 'all')}
            >
              All
            </Button>
            <Button
              variant={kycFilter === 'pending' ? 'default' : 'outline'}
              onClick={() => updateFilter('kyc', 'pending')}
            >
              KYC Pending
            </Button>
            <Button
              variant={kycFilter === 'approved' ? 'default' : 'outline'}
              onClick={() => updateFilter('kyc', 'approved')}
            >
              KYC Verified
            </Button>
            <Button
              variant={kycFilter === 'rejected' ? 'default' : 'outline'}
              onClick={() => updateFilter('kyc', 'rejected')}
            >
              KYC Rejected
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Owners ({ownersData?.total || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14" />)}</div>
          ) : ownersData?.owners && ownersData.owners.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>PGs</TableHead>
                  <TableHead>KYC Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ownersData.owners.map((owner) => {
                  const kyc = owner.kyc as { status: KYCStatus } | null
                  const kycStatus = kyc?.status || 'pending'
                  const cfg = KYC_STATUS_CONFIG[kycStatus]
                  return (
                    <TableRow key={owner.id}>
                      <TableCell>
                        <div className="font-medium">{owner.full_name}</div>
                      </TableCell>
                      <TableCell>{owner.phone || '—'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Building2 className="size-3 text-muted-foreground" />
                          <span>{owner.pg_count}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cfg.class}>{cfg.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(owner.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => setSelectedOwner(owner)}>
                          <Eye className="size-4 mr-1" /> View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <Empty className="border-dashed">
              <EmptyMedia variant="icon"><UserCheck /></EmptyMedia>
              <EmptyTitle>No owners found</EmptyTitle>
              <EmptyDescription>Try adjusting your filters</EmptyDescription>
            </Empty>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            Showing {((page - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(page * ITEMS_PER_PAGE, ownersData?.total || 0)} of {ownersData?.total || 0}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setSearchParams({ ...Object.fromEntries(searchParams), page: String(page - 1) })}>
              <ChevronLeft className="size-4" /> Previous
            </Button>
            <div className="text-sm text-muted-foreground">Page {page} of {totalPages}</div>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setSearchParams({ ...Object.fromEntries(searchParams), page: String(page + 1) })}>
              Next <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Owner Detail Dialog */}
      <Dialog open={!!selectedOwner} onOpenChange={(open) => !open && setSelectedOwner(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Owner Details</DialogTitle>
            <DialogDescription>Review KYC documents and verify identity</DialogDescription>
          </DialogHeader>

          {selectedOwner && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Full Name</div>
                  <div className="font-medium">{selectedOwner.full_name}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Phone</div>
                  <div className="font-medium">{selectedOwner.phone || '—'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Total PGs</div>
                  <div className="font-medium">{selectedOwner.pg_count}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Joined</div>
                  <div className="font-medium">{new Date(selectedOwner.created_at).toLocaleDateString('en-IN')}</div>
                </div>
              </div>

              {/* KYC Information */}
              {selectedOwner.kyc && (
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">KYC Information</h4>
                    <Badge variant="outline" className={KYC_STATUS_CONFIG[(selectedOwner.kyc as { status: KYCStatus }).status].class}>
                      {KYC_STATUS_CONFIG[(selectedOwner.kyc as { status: KYCStatus }).status].label}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    {(selectedOwner.kyc as { pan_number?: string }).pan_number && (
                      <div><span className="text-muted-foreground">PAN: </span>{(selectedOwner.kyc as { pan_number: string }).pan_number}</div>
                    )}
                    {(selectedOwner.kyc as { aadhaar_number?: string }).aadhaar_number && (
                      <div><span className="text-muted-foreground">Aadhaar: </span>{(selectedOwner.kyc as { aadhaar_number: string }).aadhaar_number}</div>
                    )}
                    {(selectedOwner.kyc as { bank_name?: string }).bank_name && (
                      <div><span className="text-muted-foreground">Bank: </span>{(selectedOwner.kyc as { bank_name: string }).bank_name}</div>
                    )}
                    {(selectedOwner.kyc as { bank_ifsc?: string }).bank_ifsc && (
                      <div><span className="text-muted-foreground">IFSC: </span>{(selectedOwner.kyc as { bank_ifsc: string }).bank_ifsc}</div>
                    )}
                    {(selectedOwner.kyc as { bank_account?: string }).bank_account && (
                      <div className="col-span-2"><span className="text-muted-foreground">Account: </span>{(selectedOwner.kyc as { bank_account: string }).bank_account}</div>
                    )}
                  </div>
                  {(selectedOwner.kyc as { admin_notes?: string }).admin_notes && (
                    <div className="text-xs bg-muted rounded px-2 py-1.5">Admin Note: {(selectedOwner.kyc as { admin_notes: string }).admin_notes}</div>
                  )}
                </div>
              )}

              {/* Documents */}
              {selectedOwner.documents && selectedOwner.documents.length > 0 && (
                <div className="border rounded-lg p-4 space-y-3">
                  <h4 className="font-medium">Documents</h4>
                  <div className="space-y-2">
                    {selectedOwner.documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                        <div className="flex items-center gap-2">
                          <FileText className="size-4 text-muted-foreground" />
                          <span className="text-sm capitalize">{doc.doc_type.replace('_', ' ')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {doc.verified ? (
                            <Badge className="bg-green-100 text-green-800">Verified</Badge>
                          ) : (
                            <Badge variant="secondary">Pending</Badge>
                          )}
                          <a href={doc.url} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="xs">View</Button>
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* KYC Actions */}
              {selectedOwner.kyc && (selectedOwner.kyc as { status: KYCStatus }).status === 'pending' && (
                <div className="space-y-3">
                  <Textarea
                    placeholder="Add notes (reason for rejection, etc.)..."
                    value={kycNote}
                    onChange={(e) => setKycNote(e.target.value)}
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Button
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => updateKycMutation.mutate({
                        kycId: (selectedOwner.kyc as { id: string }).id,
                        status: 'approved',
                        adminNotes: kycNote,
                      })}
                      disabled={updateKycMutation.isPending}
                    >
                      {updateKycMutation.isPending ? <Loader2 className="size-4 animate-spin mr-1" /> : <CheckCircle className="size-4 mr-1" />}
                      Approve KYC
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => updateKycMutation.mutate({
                        kycId: (selectedOwner.kyc as { id: string }).id,
                        status: 'rejected',
                        adminNotes: kycNote,
                      })}
                      disabled={updateKycMutation.isPending}
                    >
                      {updateKycMutation.isPending ? <Loader2 className="size-4 animate-spin mr-1" /> : <XCircle className="size-4 mr-1" />}
                      Reject KYC
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
