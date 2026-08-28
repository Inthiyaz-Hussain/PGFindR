import { useState, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CheckCircle, XCircle, Eye, MapPin, Building2, Search, ChevronLeft, ChevronRight, Edit, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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
  
  const [optimisticDeletedIds, setOptimisticDeletedIds] = useState<Set<string>>(new Set())
  const pendingDeletes = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const page = Number(searchParams.get('page') || '1')
  const statusFilter = searchParams.get('status') || 'all'
  const cityFilter = searchParams.get('city') || ''
  const searchQuery = searchParams.get('search') || ''

  const { data: pgData, isLoading } = useQuery({
    queryKey: ['admin-pgs', page, statusFilter, cityFilter, searchQuery],
    queryFn: async () => {
      let query = supabaseUntyped
        .from('pg_listings')
        .select('*, owner:profiles!pg_listings_owner_id_fkey!inner(full_name, phone, onboarding_verified)', { count: 'exact' })
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
    queryFn: async (): Promise<string[]> => {
      const { data } = await supabaseUntyped.from('pg_listings').select('city').order('city')
      const uniqueCities = [...new Set((data || []).map((p: { city: string }) => p.city))]
      return uniqueCities as string[]
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: PGStatus; previousStatus?: PGStatus }) => {
      const { error } = await supabaseUntyped.from('pg_listings').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-pgs'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats-full'] })
      
      if (variables.previousStatus) {
        toast.success(`Status updated to ${STATUS_CONFIG[variables.status].label}`, {
          duration: 3000,
          action: {
            label: 'Undo',
            onClick: () => updateMutation.mutate({ id: variables.id, status: variables.previousStatus as PGStatus })
          }
        })
      } else {
        toast.success('Status updated', { duration: 3000 })
      }
    },
    onError: () => toast.error('Failed to update'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = (await supabaseUntyped.auth.getSession()).data.session?.access_token
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
      const response = await fetch(`${apiUrl}/api/pg/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to delete PG')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pgs'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats-full'] })
      queryClient.invalidateQueries({ queryKey: ['pgs'] })
    },
    onError: (err: any) => toast.error(err.message || 'Failed to delete'),
  })

  const handleDelete = (id: string) => {
    setOptimisticDeletedIds(prev => new Set(prev).add(id))
    
    const timeoutId = setTimeout(() => {
      deleteMutation.mutate(id)
      delete pendingDeletes.current[id]
      setOptimisticDeletedIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }, 3000)

    pendingDeletes.current[id] = timeoutId

    toast.success('PG deleted', {
      duration: 3000,
      action: {
        label: 'Undo',
        onClick: () => {
          clearTimeout(pendingDeletes.current[id])
          delete pendingDeletes.current[id]
          setOptimisticDeletedIds(prev => {
            const next = new Set(prev)
            next.delete(id)
            return next
          })
          toast.success('Delete undone', { duration: 2000 })
        }
      }
    })
  }

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
      <div className="mb-6 flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="scroll-m-20 text-2xl font-bold tracking-tight">PG Management</h1>
          <p className="text-muted-foreground mt-1">Review, approve, or suspend PG listings</p>
        </div>
        <Button onClick={() => navigate('/admin/pgs/new')} className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold">
          Add PG
        </Button>
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
                {pgData.listings.filter(pg => !optimisticDeletedIds.has(pg.id)).map((pg) => {
                  const cfg = STATUS_CONFIG[pg.status]
                  const owner = pg.owner as { full_name?: string; phone?: string | null } | null
                  return (
                    <TableRow key={pg.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell>
                        <div 
                          className="font-medium text-indigo-600 dark:text-indigo-400 cursor-pointer hover:underline"
                          onClick={(e) => { e.stopPropagation(); navigate(`/pg/${pg.id}`) }}
                        >
                          {pg.name}
                        </div>
                        <div className="text-xs text-muted-foreground capitalize">{pg.pg_type} PG</div>
                      </TableCell>
                      <TableCell>
                        <div 
                          className="font-medium cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (owner?.full_name) {
                              navigate(`/admin/owners?search=${encodeURIComponent(owner.full_name)}`)
                            }
                          }}
                        >
                          {owner?.full_name || '—'}
                        </div>
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
                          <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); navigate(`/pg/${pg.id}`) }} title="View">
                            <Eye className="size-4" />
                          </Button>
                          <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); navigate(`/admin/pgs/${pg.id}/edit`) }} title="Edit">
                            <Edit className="size-4" />
                          </Button>
                          {pg.status === 'pending' && (
                            <Button variant="ghost" size="icon-sm" className="text-green-600 hover:text-green-700" onClick={(e) => { e.stopPropagation(); updateMutation.mutate({ id: pg.id, status: 'approved', previousStatus: pg.status }) }} title="Approve">
                              <CheckCircle className="size-4" />
                            </Button>
                          )}
                          {pg.status === 'approved' && (
                            <Button variant="ghost" size="icon-sm" className="text-orange-600 hover:text-orange-700" onClick={(e) => { e.stopPropagation(); updateMutation.mutate({ id: pg.id, status: 'inactive', previousStatus: pg.status }) }} title="Suspend">
                              <XCircle className="size-4" />
                            </Button>
                          )}
                          {(pg.status === 'inactive' || pg.status === 'rejected') && (
                            <Button variant="ghost" size="icon-sm" className="text-green-600 hover:text-green-700" onClick={(e) => { e.stopPropagation(); updateMutation.mutate({ id: pg.id, status: 'approved', previousStatus: pg.status }) }} title="Reactivate">
                              <CheckCircle className="size-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(pg.id) }} title="Delete">
                            <Trash2 className="size-4" />
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
    </div>
  )
}
