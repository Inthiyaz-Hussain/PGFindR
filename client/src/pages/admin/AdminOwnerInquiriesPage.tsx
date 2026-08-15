import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  FileText,
  Search,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Loader2,
  Mail,
  Phone,
  Building,
  MapPin,
  Calendar,
  RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'

const STATUS_CONFIG: Record<string, { label: string; class: string }> = {
  pending_admin_review: { label: 'Pending Review', class: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400' },
  approved: { label: 'Approved', class: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400' },
  rejected: { label: 'Rejected', class: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400' },
  password_sent: { label: 'Password Sent', class: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400' },
  onboarded: { label: 'Onboarded', class: 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400' },
}

interface OwnerInquiry {
  id: string
  full_name: string
  mobile: string
  email: string
  google_uid: string | null
  pg_name: string
  pg_city: string
  pg_address: string
  room_count: number
  bed_count: number
  referral_source: string | null
  status: string
  admin_notes: string | null
  created_at: string
  reviewed_at: string | null
  reviewed_by: string | null
  reset_token: string | null
  reset_token_expires_at: string | null
  reset_token_used: boolean
  password_set_at: string | null
  owner_user_id: string | null
}

const ITEMS_PER_PAGE = 10

export function AdminOwnerInquiriesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  
  const [selectedInquiry, setSelectedInquiry] = useState<OwnerInquiry | null>(null)
  const [adminNotes, setAdminNotes] = useState('')

  const page = Number(searchParams.get('page') || '1')
  const statusFilter = searchParams.get('status') || 'all'
  const cityFilter = searchParams.get('city') || 'all'
  const searchQuery = searchParams.get('search') || ''

  // Fetch Session from auth hook
  const { session } = useAuth()
  const sessionData = session

  // Fetch inquiries from backend
  const { data: inquiriesData, isLoading, refetch } = useQuery({
    queryKey: ['admin-owner-inquiries', page, statusFilter, cityFilter, searchQuery, sessionData?.access_token],
    queryFn: async () => {
      if (!sessionData?.access_token) return { data: [], total: 0 }
      
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: ITEMS_PER_PAGE.toString(),
        status: statusFilter,
        city: cityFilter
      })
      
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
      const response = await fetch(`${apiUrl}/api/admin/owner-inquiries?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${sessionData.access_token}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch inquiries')
      }
      return response.json()
    },
    enabled: !!sessionData?.access_token
  })

  // Approve inquiry mutation
  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
      const response = await fetch(`${apiUrl}/api/admin/owner-inquiries/${id}/approve`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${sessionData?.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      const resData = await response.json()
      if (!response.ok) {
        throw new Error(resData.error || 'Approval failed')
      }
      return resData
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-owner-inquiries'] })
      if (data.emailSent === false) {
        toast.warning('Approved, but email dispatch failed. Copy and share the link manually!', {
          duration: 8000,
        })
      } else {
        toast.success('Inquiry approved successfully!')
      }
      
      // Update selected modal details
      if (selectedInquiry) {
        setSelectedInquiry((prev) => prev ? { ...prev, status: 'approved', reset_token: data.token } : null)
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to approve inquiry')
    }
  })

  // Reject inquiry mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
      const response = await fetch(`${apiUrl}/api/admin/owner-inquiries/${id}/reject`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${sessionData?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ admin_notes: notes })
      })
      
      const resData = await response.json()
      if (!response.ok) {
        throw new Error(resData.error || 'Rejection failed')
      }
      return resData
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-owner-inquiries'] })
      toast.success('Inquiry rejected.')
      setSelectedInquiry(null)
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to reject inquiry')
    }
  })

  // Resend email mutation
  const resendEmailMutation = useMutation({
    mutationFn: async (id: string) => {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
      const response = await fetch(`${apiUrl}/api/admin/owner-inquiries/${id}/resend-email`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${sessionData?.access_token}`
        }
      })
      
      const resData = await response.json()
      if (!response.ok) {
        throw new Error(resData.error || 'Resend failed')
      }
      return resData
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-owner-inquiries'] })
      if (data.emailSent === false) {
        toast.warning('Token regenerated, but email dispatch failed. Copy and share the link manually!', {
          duration: 8000,
        })
      } else {
        toast.success('Set Password email resent successfully!')
      }
      if (selectedInquiry) {
        setSelectedInquiry((prev) => prev ? { ...prev, reset_token: data.token } : null)
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to resend email')
    }
  })

  // Handle filter changes
  function handleFilterChange(key: string, value: string) {
    const newParams = new URLSearchParams(searchParams)
    if (value === 'all' || !value) {
      newParams.delete(key)
    } else {
      newParams.set(key, value)
    }
    newParams.set('page', '1') // Reset to page 1 on filter
    setSearchParams(newParams)
  }

  const inquiries = inquiriesData?.data || []
  const totalItems = inquiriesData?.total || 0
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE)

  const hasNextPage = page < totalPages
  const hasPrevPage = page > 1

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="scroll-m-20 text-2xl font-bold tracking-tight">Owner Onboarding Inquiries</h1>
          <p className="text-muted-foreground mt-1">Review owner interest submissions and send password setup links.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="shrink-0">
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Filters Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, email, PG..."
                value={searchQuery}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-9 bg-background"
              />
            </div>

            {/* Status Filter */}
            <div>
              <Select value={statusFilter} onValueChange={(val) => handleFilterChange('status', val)}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending_admin_review">Pending Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="onboarded">Onboarded</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* City Filter */}
            <div>
              <Select value={cityFilter} onValueChange={(val) => handleFilterChange('city', val)}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Filter by City" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cities</SelectItem>
                  <SelectItem value="Bengaluru">Bengaluru</SelectItem>
                  <SelectItem value="Pune">Pune</SelectItem>
                  <SelectItem value="Mumbai">Mumbai</SelectItem>
                  <SelectItem value="Delhi">Delhi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : inquiries.length === 0 ? (
            <Empty className="py-12 border-none">
              <EmptyMedia variant="icon"><FileText className="h-10 w-10 text-slate-400" /></EmptyMedia>
              <EmptyTitle>No inquiries found</EmptyTitle>
              <EmptyDescription>Try adjusting your search query or filters.</EmptyDescription>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Owner Name</TableHead>
                  <TableHead>PG Name & City</TableHead>
                  <TableHead>Rooms / Beds</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Submitted Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inquiries.map((inq: OwnerInquiry) => {
                  const cfg = STATUS_CONFIG[inq.status] || { label: inq.status, class: 'bg-slate-100 text-slate-800' }
                  return (
                    <TableRow
                      key={inq.id}
                      className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-850"
                      onClick={() => {
                        setSelectedInquiry(inq)
                        setAdminNotes(inq.admin_notes || '')
                      }}
                    >
                      <TableCell className="font-semibold">{inq.full_name}</TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{inq.pg_name}</div>
                        <div className="text-xs text-muted-foreground">{inq.pg_city}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {inq.room_count} rooms / {inq.bed_count} beds
                      </TableCell>
                      <TableCell className="text-xs space-y-0.5">
                        <div className="flex items-center gap-1"><Mail className="h-3 w-3 text-indigo-500" /> {inq.email}</div>
                        <div className="flex items-center gap-1"><Phone className="h-3 w-3 text-indigo-500" /> {inq.mobile}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {new Date(inq.created_at).toLocaleDateString('en-IN')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs border-0 ${cfg.class}`}>
                          {cfg.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center pt-2">
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages} ({totalItems} total inquiries)
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!hasPrevPage}
              onClick={() => handleFilterChange('page', (page - 1).toString())}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasNextPage}
              onClick={() => handleFilterChange('page', (page + 1).toString())}
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Details Dialog */}
      <Dialog open={!!selectedInquiry} onOpenChange={(open) => !open && setSelectedInquiry(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Building className="h-5 w-5 text-indigo-600" /> Inquiry Details
            </DialogTitle>
            <DialogDescription>
              Review the owner details and listing interest inquiry below.
            </DialogDescription>
          </DialogHeader>

          {selectedInquiry && (
            <div className="flex flex-col gap-4">
              <div className="overflow-y-auto max-h-[50vh] pr-2 -mr-2 space-y-4 pt-1">
                {/* Owner Info Grid */}
                <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-100 dark:border-slate-800 p-4 bg-muted/20 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">Full Name</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedInquiry.full_name}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">Google Verified</span>
                    <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700 font-bold uppercase text-[10px] mt-0.5">YES</Badge>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">Email Address</span>
                    <span className="font-medium">{selectedInquiry.email}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">Mobile Number</span>
                    <span className="font-medium">{selectedInquiry.mobile}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">Google UID</span>
                    <code className="text-xs text-slate-500 block truncate">{selectedInquiry.google_uid || 'N/A'}</code>
                  </div>
                </div>

                {/* PG Details */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-indigo-500" /> PG Listing Target
                  </h3>
                  <div className="grid grid-cols-2 gap-4 border border-slate-100 dark:border-slate-800 p-4 rounded-xl text-sm">
                    <div>
                      <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">PG Name</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedInquiry.pg_name}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">PG City</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedInquiry.pg_city}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">PG Address</span>
                      <span className="text-slate-700 dark:text-slate-350">{selectedInquiry.pg_address}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">Rooms count</span>
                      <span className="font-medium">{selectedInquiry.room_count} rooms</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">Beds count</span>
                      <span className="font-medium">{selectedInquiry.bed_count} beds</span>
                    </div>
                    {selectedInquiry.referral_source && (
                      <div className="col-span-2">
                        <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">Referral Source</span>
                        <span className="font-medium">{selectedInquiry.referral_source}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Date & Token Tracker */}
                <div className="border border-slate-100 dark:border-slate-850 rounded-xl p-4 text-xs space-y-2 bg-muted/10">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1"><Calendar className="h-3.5 w-3.5 text-indigo-500" /> Submitted At:</span>
                    <span className="font-semibold">{new Date(selectedInquiry.created_at).toLocaleString('en-IN')}</span>
                  </div>
                  {selectedInquiry.reset_token && (
                    <div className="flex flex-col gap-1 border-t pt-2 mt-2">
                      <span className="text-muted-foreground font-semibold">Active Invitation Link:</span>
                      <code className="bg-muted px-2 py-1.5 rounded text-xs select-all text-indigo-650 dark:text-indigo-400 block break-all whitespace-normal">
                        {window.location.origin}/owner/set-password?token={selectedInquiry.reset_token}
                      </code>
                      <span className="text-[10px] text-muted-foreground">Expires: {new Date(selectedInquiry.reset_token_expires_at || '').toLocaleString('en-IN')}</span>
                    </div>
                  )}
                </div>

                {/* Admin Notes */}
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">Admin Review Notes</span>
                  <Textarea
                    placeholder="Add notes for internal reference, or rejection reasons..."
                    value={adminNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between border-t pt-4 gap-3">
                <span className="text-xs text-muted-foreground">
                  Current Status: <Badge className={`ml-1 capitalize text-[10px] py-0.5 border-0 ${STATUS_CONFIG[selectedInquiry.status]?.class}`}>{selectedInquiry.status.replace(/_/g, ' ')}</Badge>
                </span>
                
                <div className="flex gap-2">
                  {selectedInquiry.status === 'pending_admin_review' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive hover:bg-red-50"
                        onClick={() => rejectMutation.mutate({ id: selectedInquiry.id, notes: adminNotes })}
                        disabled={rejectMutation.isPending || approveMutation.isPending}
                      >
                        {rejectMutation.isPending ? <Loader2 className="size-3 animate-spin mr-1" /> : <XCircle className="size-3.5 mr-1" />}
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white font-medium"
                        onClick={() => approveMutation.mutate(selectedInquiry.id)}
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                      >
                        {approveMutation.isPending ? <Loader2 className="size-3 animate-spin mr-1" /> : <CheckCircle className="size-3.5 mr-1" />}
                        Approve & Send Email
                      </Button>
                    </>
                  )}
                  {selectedInquiry.status === 'approved' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => resendEmailMutation.mutate(selectedInquiry.id)}
                      disabled={resendEmailMutation.isPending}
                    >
                      {resendEmailMutation.isPending ? <Loader2 className="size-3 animate-spin mr-1" /> : <RefreshCw className="size-3.5 mr-1" />}
                      Resend Invitation Email
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
  
  // Internal helper to sync note changes
  function setFormNotes(val: string) {
    setAdminNotes(val)
    if (selectedInquiry) {
      selectedInquiry.admin_notes = val
    }
  }
}
