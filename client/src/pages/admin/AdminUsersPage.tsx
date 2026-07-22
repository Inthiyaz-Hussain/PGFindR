import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Users, Search, ChevronLeft, ChevronRight, Eye, MessageSquare, Calendar, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
import { useQuery } from '@tanstack/react-query'
import { supabaseUntyped } from '@/lib/supabase'
import type { InquiryStatus } from '@/types'

const INQUIRY_STATUS_CONFIG: Record<InquiryStatus, { label: string; class: string }> = {
  pending: { label: 'Pending', class: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400' },
  contacted: { label: 'Contacted', class: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400' },
  confirmed: { label: 'Confirmed', class: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400' },
  cancelled: { label: 'Cancelled', class: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400' },
}

const ITEMS_PER_PAGE = 10

interface SeekerRow {
  id: string
  full_name: string
  phone: string | null
  email: string
  created_at: string
  inquiries: { count: number }[]
  bookings: { count: number }[]
}

interface InquiryDetail {
  id: string
  status: InquiryStatus
  move_in_date: string | null
  created_at: string
  pg: { name: string; city: string } | null
  age: number | null
  occupation: string | null
  sharing_preference: number | null
  city_of_origin: string | null
  duration_value: number | null
  duration_unit: string | null
  message: string | null
}

export function AdminUsersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedUser, setSelectedUser] = useState<SeekerRow | null>(null)

  const page = Number(searchParams.get('page') || '1')
  const searchQuery = searchParams.get('search') || ''

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['admin-seekers', page, searchQuery],
    queryFn: async () => {
      // Get seekers with auth emails via profiles
      let query = supabaseUntyped
        .from('profiles')
        .select(`
          id,
          full_name,
          phone,
          created_at,
          inquiries:inquiries(count),
          bookings:bookings(count)
        `, { count: 'exact' })
        .eq('role', 'seeker')
        .order('created_at', { ascending: false })
        .range((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE - 1)

      if (searchQuery) {
        query = query.or(`full_name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
      }

      const { data, count } = await query
      return { seekers: (data || []) as SeekerRow[], total: count || 0 }
    },
  })

  const { data: userInquiries, isLoading: loadingInquiries } = useQuery({
    queryKey: ['seeker-inquiries', selectedUser?.id],
    queryFn: async () => {
      if (!selectedUser) return []
      const { data } = await supabaseUntyped
        .from('inquiries')
        .select(`
          id,
          status,
          move_in_date,
          created_at,
          age,
          occupation,
          sharing_preference,
          city_of_origin,
          duration_value,
          duration_unit,
          message,
          pg:pg_listings(name, city)
        `)
        .eq('seeker_id', selectedUser.id)
        .order('created_at', { ascending: false })
        .limit(20)
      // Transform nested pg from array to object
      return ((data || []) as unknown[]).map((item: unknown) => {
        const row = item as Record<string, unknown>
        const pgArr = row.pg as unknown[]
        return {
          ...row,
          pg: pgArr?.[0] || { name: '—', city: '—' }
        } as InquiryDetail
      })
    },
    enabled: !!selectedUser,
  })

  const totalPages = Math.ceil((usersData?.total || 0) / ITEMS_PER_PAGE)

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
        <h1 className="scroll-m-20 text-2xl font-bold tracking-tight">Seeker Management</h1>
        <p className="text-muted-foreground mt-1">View all registered seekers and their inquiry history</p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-5">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or phone..."
                  value={searchQuery}
                  onChange={(e) => updateFilter('search', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Seekers ({usersData?.total || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14" />)}</div>
          ) : usersData?.seekers && usersData.seekers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Inquiries</TableHead>
                  <TableHead>Bookings</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersData.seekers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="font-medium">{user.full_name || 'Unnamed'}</div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.phone || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{user.inquiries?.[0]?.count || 0}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{user.bookings?.[0]?.count || 0}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon-sm" onClick={() => setSelectedUser(user)} title="View Inquiries">
                        <Eye className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Empty className="border-dashed">
              <EmptyMedia variant="icon"><Users /></EmptyMedia>
              <EmptyTitle>No seekers found</EmptyTitle>
              <EmptyDescription>Try adjusting your search</EmptyDescription>
            </Empty>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            Showing {((page - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(page * ITEMS_PER_PAGE, usersData?.total || 0)} of {usersData?.total || 0}
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

      {/* User Inquiry History Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Inquiry History: {selectedUser?.full_name || 'Unknown'}</DialogTitle>
            <DialogDescription>
              {selectedUser?.phone && <span>Phone: {selectedUser.phone} • </span>}
              Joined {selectedUser?.created_at ? new Date(selectedUser.created_at).toLocaleDateString('en-IN') : '—'}
            </DialogDescription>
          </DialogHeader>

          {loadingInquiries ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div>
          ) : userInquiries && userInquiries.length > 0 ? (
            <div className="space-y-4">
              {userInquiries.map((inq) => {
                const cfg = INQUIRY_STATUS_CONFIG[inq.status]
                return (
                  <Card key={inq.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <div className="font-medium">{inq.pg?.name || 'Unknown PG'}</div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="size-3" /> {inq.pg?.city || '—'}
                          </div>
                        </div>
                        <Badge variant="outline" className={cfg.class}>{cfg.label}</Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                        {inq.age && (
                          <div>
                            <div className="text-muted-foreground">Age</div>
                            <div className="font-medium">{inq.age} years</div>
                          </div>
                        )}
                        {inq.occupation && (
                          <div>
                            <div className="text-muted-foreground">Occupation</div>
                            <div className="font-medium">{inq.occupation}</div>
                          </div>
                        )}
                        {inq.sharing_preference && (
                          <div>
                            <div className="text-muted-foreground">Sharing</div>
                            <div className="font-medium">{inq.sharing_preference}-share</div>
                          </div>
                        )}
                        {inq.move_in_date && (
                          <div>
                            <div className="text-muted-foreground">Move-in</div>
                            <div className="font-medium flex items-center gap-1">
                              <Calendar className="size-3" />
                              {new Date(inq.move_in_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        {inq.city_of_origin && <span>From: {inq.city_of_origin}</span>}
                        {inq.duration_value && inq.duration_unit && (
                          <span>Duration: {inq.duration_value} {inq.duration_unit}</span>
                        )}
                        <span>Inquired: {new Date(inq.created_at).toLocaleDateString('en-IN')}</span>
                      </div>

                      {inq.message && (
                        <div className="mt-3 p-3 bg-muted/50 rounded-lg text-sm">
                          <MessageSquare className="size-3 inline mr-1 text-muted-foreground" />
                          {inq.message}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Empty className="border-dashed">
              <EmptyMedia variant="icon"><MessageSquare /></EmptyMedia>
              <EmptyTitle>No inquiries yet</EmptyTitle>
              <EmptyDescription>This seeker hasn't made any inquiries</EmptyDescription>
            </Empty>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
