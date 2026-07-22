import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CheckCircle, XCircle, Eye, MapPin, Building2, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabaseUntyped } from '@/lib/supabase'
import type { PGListing, PGStatus } from '@/types'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'

const STATUS_CONFIG: Record<PGStatus, { label: string; class: string }> = {
  pending: { label: 'Pending', class: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400' },
  approved: { label: 'Active', class: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400' },
  rejected: { label: 'Rejected', class: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400' },
  inactive: { label: 'Suspended', class: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400' },
}

const ITEMS_PER_PAGE = 10

export function AdminPGsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [suspendId, setSuspendId] = useState<string | null>(null)

  const page = Number(searchParams.get('page') || '1')
  const statusFilter = searchParams.get('status') || 'all'
  const cityFilter = searchParams.get('city') || ''
  const searchQuery = searchParams.get('search') || ''

  const { data: pgData, isLoading } = useQuery({
    queryKey: ['admin-pgs', page, statusFilter, cityFilter, searchQuery],
    queryFn: async () => {
      let query = supabaseUntyped
        .from('pg_listings')
        .select('*, owner:profiles!pg_listings_owner_id_fkey(full_name, phone)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE - 1)

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }
      if (cityFilter) {
        query = query.ilike('city', `%${cityFilter}%`)
      }
      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,locality.ilike.%${searchQuery}%`)
      }

      const { data, count } = await query
      return { listings: (data || []) as PGListing[], total: count || 0 }
    },
  })

  const { data: cities } = useQuery({
    queryKey: ['admin-cities'],
    queryFn: async () => {
      const { data } = await supabaseUntyped.from('pg_listings').select('city').order('city')
      const uniqueCities = [...new Set((data || []).map((p: { city: string }) => p.city))]
      return uniqueCities
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: PGStatus }) => {
      const { error } = await supabaseUntyped.from('pg_listings').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pgs'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats-full'] })
      toast.success('Status updated')
      setSuspendId(null)
    },
    onError: () => toast.error('Failed to update'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabaseUntyped.from('pg_listings').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pgs'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats-full'] })
      toast.success('PG deleted')
      setDeleteId(null)
    },
    onError: () => toast.error('Failed to delete'),
  })

  const totalPages = Math.ceil((pgData?.total || 0) / ITEMS_PER_PAGE)

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
        <h1 className="scroll-m-20 text-2xl font-bold tracking-tight">PG Management</h1>
        <p className="text-muted-foreground mt-1">Review, approve, or suspend PG listings</p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-5">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search PGs..."
                  value={searchQuery}
                  onChange={(e) => updateFilter('search', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={(v) => updateFilter('status', v)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Active</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="inactive">Suspended</SelectItem>
              </SelectContent>
            </Select>
            <Select value={cityFilter} onValueChange={(v) => updateFilter('city', v)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Cities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Cities</SelectItem>
                {(cities || []).map((city) => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All PGs ({pgData?.total || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14" />)}</div>
          ) : pgData?.listings && pgData.listings.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PG Name</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Beds</TableHead>
                  <TableHead>Listed</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pgData.listings.map((pg) => {
                  const cfg = STATUS_CONFIG[pg.status]
                  const owner = pg.owner as { full_name?: string; phone?: string | null } | null
                  return (
                    <TableRow key={pg.id}>
                      <TableCell>
                        <div className="font-medium">{pg.name}</div>
                        <div className="text-xs text-muted-foreground capitalize">{pg.pg_type} PG</div>
                      </TableCell>
                      <TableCell>
                        <div>{owner?.full_name || '—'}</div>
                        {owner?.phone && <div className="text-xs text-muted-foreground">{owner.phone}</div>}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="size-3 text-muted-foreground" />
                          <span>{pg.locality}, {pg.city}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cfg.class}>{cfg.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-green-600 font-medium">{pg.available_beds}</span>
                        <span className="text-muted-foreground">/{pg.total_beds}</span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(pg.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon-sm" onClick={() => navigate(`/pg/${pg.id}`)} title="View">
                            <Eye className="size-4" />
                          </Button>
                          {pg.status === 'pending' && (
                            <Button variant="ghost" size="icon-sm" className="text-green-600 hover:text-green-700" onClick={() => updateMutation.mutate({ id: pg.id, status: 'approved' })} title="Approve">
                              <CheckCircle className="size-4" />
                            </Button>
                          )}
                          {pg.status === 'approved' && (
                            <Button variant="ghost" size="icon-sm" className="text-orange-600 hover:text-orange-700" onClick={() => setSuspendId(pg.id)} title="Suspend">
                              <XCircle className="size-4" />
                            </Button>
                          )}
                          {(pg.status === 'inactive' || pg.status === 'rejected') && (
                            <Button variant="ghost" size="icon-sm" className="text-green-600 hover:text-green-700" onClick={() => updateMutation.mutate({ id: pg.id, status: 'approved' })} title="Reactivate">
                              <CheckCircle className="size-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(pg.id)} title="Delete">
                            <XCircle className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <Empty className="border-dashed">
              <EmptyMedia variant="icon"><Building2 /></EmptyMedia>
              <EmptyTitle>No PGs found</EmptyTitle>
              <EmptyDescription>Try adjusting your filters</EmptyDescription>
            </Empty>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            Showing {((page - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(page * ITEMS_PER_PAGE, pgData?.total || 0)} of {pgData?.total || 0}
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

      {/* Suspend Dialog */}
      <AlertDialog open={!!suspendId} onOpenChange={(open) => !open && setSuspendId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend this PG?</AlertDialogTitle>
            <AlertDialogDescription>This will make the PG invisible to seekers. The owner can request reactivation.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => suspendId && updateMutation.mutate({ id: suspendId, status: 'inactive' })}>
              Suspend
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this PG?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the PG listing and all associated data. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)} className="bg-destructive text-white hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
