import { useState } from 'react'
import {
  Users,
  Calendar,
  Loader2,
  CheckCircle,
  XCircle,
  Phone,
  Mail,
  User,
  MapPin,
  Clock,
  Briefcase,
  Layers,
  Search,
  ArrowUpRight,
  Eye,
  Bookmark
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabaseUntyped } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

const SHARING_LABELS: Record<number, string> = {
  1: 'Single',
  2: 'Double',
  3: 'Triple',
  4: 'Dormitory',
}

export function MyTenantsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'current' | 'pending' | 'confirmed' | 'past' | 'declined'>('current')
  
  // Selected tenant details drawer state
  const [selectedTenant, setSelectedTenant] = useState<any | null>(null)
  const [selectedStage, setSelectedStage] = useState<'inquiry' | 'booked'>('inquiry')

  // 1. Query all PGs owned by this owner
  const { data: pgs } = useQuery({
    queryKey: ['owner-pgs-list', user?.id],
    queryFn: async () => {
      const { data } = await supabaseUntyped.from('pg_listings').select('id, name').eq('owner_id', user!.id)
      return data || []
    },
    enabled: !!user
  })

  // 2. Query bookings
  const { data: bookings, isLoading: loadingBookings } = useQuery({
    queryKey: ['owner-bookings', user?.id],
    queryFn: async () => {
      const { data } = await supabaseUntyped
        .from('bookings')
        .select(`
          *,
          pg:pg_listings(name, city),
          seeker:profiles!bookings_seeker_id_fkey(full_name, phone, email),
          bed:beds(*)
        `)
        .eq('owner_id', user!.id)
        .order('created_at', { ascending: false })
      return data || []
    },
    enabled: !!user
  })

  // 3. Query inquiries
  const { data: inquiries, isLoading: loadingInquiries } = useQuery({
    queryKey: ['owner-inquiries', user?.id],
    queryFn: async () => {
      if (!pgs || pgs.length === 0) return []
      const pgIds = pgs.map(p => p.id)
      const { data } = await supabaseUntyped
        .from('inquiries')
        .select(`
          *,
          pg:pg_listings(name, city),
          seeker:profiles!inquiries_seeker_id_fkey(full_name, phone)
        `)
        .in('pg_id', pgIds)
        .order('created_at', { ascending: false })
      return data || []
    },
    enabled: !!pgs
  })

  // Invalidate and trigger mutations
  const confirmInquiryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabaseUntyped
        .from('inquiries')
        .update({ status: 'confirmed', updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-inquiries'] })
      toast.success('Inquiry availability confirmed! Seeker notified for payment.')
    },
    onError: () => toast.error('Failed to confirm availability')
  })

  const declineInquiryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabaseUntyped
        .from('inquiries')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-inquiries'] })
      toast.success('Inquiry declined.')
    },
    onError: () => toast.error('Failed to decline inquiry')
  })

  const confirmMoveInMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
      const { data: { session } } = await supabaseUntyped.auth.getSession()
      const response = await fetch(`${apiUrl}/api/booking/${bookingId}/confirm-movein`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        }
      })
      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || 'Confirm move-in failed')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-bookings'] })
      toast.success('Move-in confirmed! Tenant marked occupied.')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to confirm move-in')
  })

  // Filter lists based on tab counts
  // Current Tenants: status is completed/active and bed status is occupied
  const currentTenants = bookings?.filter(b => b.status === 'active' && b.bed?.status === 'occupied') || []
  
  // Pending Inquiries: status is pending
  const pendingInquiries = inquiries?.filter(i => i.status === 'pending') || []
  
  // Confirmed / Reserved: status is payment_done/paid, move-in not confirmed yet, bed status is reserved
  const reservedTenants = bookings?.filter(b => (b.status === 'payment_done' || b.status === 'paid') && b.bed?.status === 'reserved') || []
  
  // Past Tenants: completed bookings or beds that have moved out
  const pastTenants = bookings?.filter(b => b.status === 'completed') || []
  
  // Declined: cancelled/declined inquiries this month
  const declinedInquiries = inquiries?.filter(i => {
    if (i.status !== 'cancelled') return false
    const date = new Date(i.updated_at || i.created_at)
    const now = new Date()
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
  }) || []

  const tabCounts = {
    current: currentTenants.length,
    pending: pendingInquiries.length,
    confirmed: reservedTenants.length,
    past: pastTenants.length,
    declined: declinedInquiries.length,
  }

  // Calculate months stayed
  function getMonthsStayed(dateString: string) {
    const start = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    const months = Math.floor(diffDays / 30)
    return months === 0 ? 'Less than a month' : `${months} month${months > 1 ? 's' : ''}`
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Tenants</h1>
          <p className="text-muted-foreground mt-1">Manage and track your digital PG occupancy register.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as any)} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted p-1 border">
          <TabsTrigger value="current" className="text-xs">
            Current Tenants <Badge className="ml-1.5 h-5 bg-indigo-50 text-indigo-700 font-semibold border-0 shrink-0">{tabCounts.current}</Badge>
          </TabsTrigger>
          <TabsTrigger value="pending" className="text-xs">
            Pending Inquiries <Badge className="ml-1.5 h-5 bg-amber-50 text-amber-700 font-semibold border-0 shrink-0">{tabCounts.pending}</Badge>
          </TabsTrigger>
          <TabsTrigger value="confirmed" className="text-xs">
            Confirmed / Reserved <Badge className="ml-1.5 h-5 bg-emerald-50 text-emerald-700 font-semibold border-0 shrink-0">{tabCounts.confirmed}</Badge>
          </TabsTrigger>
          <TabsTrigger value="past" className="text-xs">
            Past Tenants <Badge className="ml-1.5 h-5 bg-slate-100 text-slate-700 font-semibold border-0 shrink-0">{tabCounts.past}</Badge>
          </TabsTrigger>
          <TabsTrigger value="declined" className="text-xs">
            Declined <Badge className="ml-1.5 h-5 bg-red-50 text-red-700 font-semibold border-0 shrink-0">{tabCounts.declined}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* Tab Contents: Current Tenants */}
        {activeTab === 'current' && (
          <div className="space-y-3">
            {loadingBookings ? (
              <SkeletonRows />
            ) : currentTenants.length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {currentTenants.map(b => (
                  <Card key={b.id} className="border-slate-200/80 dark:border-slate-800/80 shadow-xs">
                    <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                          <User className="size-5" />
                        </div>
                        <div>
                          <div className="font-semibold text-sm">{b.seeker?.full_name || 'Guest Tenant'}</div>
                          <div className="text-xs text-muted-foreground">{b.pg?.name} • Room {b.bed?.room_number || '101'} - {b.bed?.bed_label}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                        <div>
                          <div className="text-muted-foreground font-medium">Move-In Date</div>
                          <div className="font-semibold">{new Date(b.move_in_date).toLocaleDateString()}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground font-medium">Months Stayed</div>
                          <div className="font-semibold">{getMonthsStayed(b.move_in_date)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground font-medium">Expected Vacate</div>
                          <div className="font-semibold">{b.bed?.expected_vacate ? new Date(b.bed.expected_vacate).toLocaleDateString() : 'Not Specified'}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground font-medium">Amount Paid</div>
                          <div className="font-semibold text-indigo-600 dark:text-indigo-400">₹{b.monthly_rent}/mo</div>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs shrink-0"
                        onClick={() => {
                          setSelectedTenant(b)
                          setSelectedStage('booked')
                        }}
                      >
                        <Eye className="size-3.5 mr-1" /> View Profile
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState title="No active tenants" desc="When tenants complete payment and check in, they will be listed here." />
            )}
          </div>
        )}

        {/* Tab Contents: Pending Inquiries */}
        {activeTab === 'pending' && (
          <div className="space-y-3">
            {loadingInquiries ? (
              <SkeletonRows />
            ) : pendingInquiries.length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {pendingInquiries.map(inq => (
                  <Card key={inq.id} className="border-slate-200/80 dark:border-slate-800/80 shadow-xs">
                    <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                          <Bookmark className="size-5" />
                        </div>
                        <div>
                          <div className="font-semibold text-sm">{inq.full_name || inq.seeker?.full_name || 'Anonymous Seeker'}</div>
                          <div className="text-xs text-muted-foreground">{inq.pg?.name} • {SHARING_LABELS[inq.sharing_preference || 1]} Share Preferred</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                        <div>
                          <div className="text-muted-foreground font-medium">Preferred Move-In</div>
                          <div className="font-semibold">{inq.move_in_date ? new Date(inq.move_in_date).toLocaleDateString() : 'Flexible'}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground font-medium">Occupation</div>
                          <div className="font-semibold">{inq.occupation || 'Student'}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground font-medium">Origin City</div>
                          <div className="font-semibold">{inq.city_of_origin || 'Not Specified'}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground font-medium">Stay Duration</div>
                          <div className="font-semibold">{inq.duration_value} {inq.duration_unit || 'months'}</div>
                        </div>
                      </div>

                      <div className="flex gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="xs"
                          className="h-8 text-xs"
                          onClick={() => {
                            setSelectedTenant(inq)
                            setSelectedStage('inquiry')
                          }}
                        >
                          Details
                        </Button>
                        <Button
                          size="xs"
                          className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                          disabled={confirmInquiryMutation.isPending}
                          onClick={() => confirmInquiryMutation.mutate(inq.id)}
                        >
                          {confirmInquiryMutation.isPending ? <Loader2 className="size-3 animate-spin" /> : 'Confirm'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="xs"
                          className="h-8 text-xs text-red-500 hover:bg-red-50"
                          disabled={declineInquiryMutation.isPending}
                          onClick={() => declineInquiryMutation.mutate(inq.id)}
                        >
                          Decline
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState title="No pending inquiries" desc="New booking inquiries from seekers will show up here." />
            )}
          </div>
        )}

        {/* Tab Contents: Confirmed / Reserved */}
        {activeTab === 'confirmed' && (
          <div className="space-y-3">
            {loadingBookings ? (
              <SkeletonRows />
            ) : reservedTenants.length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {reservedTenants.map(b => (
                  <Card key={b.id} className="border-slate-200/80 dark:border-slate-800/80 shadow-xs">
                    <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                          <CheckCircle className="size-5" />
                        </div>
                        <div>
                          <div className="font-semibold text-sm">{b.seeker?.full_name || 'Guest Tenant'}</div>
                          <div className="text-xs text-muted-foreground">{b.pg?.name} • Room {b.bed?.room_number || '101'} - {b.bed?.bed_label} (Reserved)</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                        <div>
                          <div className="text-muted-foreground font-medium">Expected Arrival</div>
                          <div className="font-semibold">{new Date(b.move_in_date).toLocaleDateString()}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground font-medium">Deposit Paid</div>
                          <div className="font-semibold text-green-600">₹{b.deposit_amount}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground font-medium">Rent Paid</div>
                          <div className="font-semibold text-green-600">₹{b.monthly_rent}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground font-medium">Status</div>
                          <div className="font-semibold text-amber-600 flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span> Reserved
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => {
                            setSelectedTenant(b)
                            setSelectedStage('booked')
                          }}
                        >
                          Profile
                        </Button>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold"
                          disabled={confirmMoveInMutation.isPending}
                          onClick={() => confirmMoveInMutation.mutate(b.id)}
                        >
                          {confirmMoveInMutation.isPending ? <Loader2 className="size-3 animate-spin mr-1" /> : null}
                          Confirm Move-In
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState title="No reserved beds" desc="When seekers complete booking payment, they appear here for check-in." />
            )}
          </div>
        )}

        {/* Tab Contents: Past Tenants */}
        {activeTab === 'past' && (
          <div className="space-y-3">
            {loadingBookings ? (
              <SkeletonRows />
            ) : pastTenants.length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {pastTenants.map(b => (
                  <Card key={b.id} className="border-slate-200/80 dark:border-slate-800/80 shadow-xs">
                    <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                          <XCircle className="size-5" />
                        </div>
                        <div>
                          <div className="font-semibold text-sm">{b.seeker?.full_name || 'Past Guest'}</div>
                          <div className="text-xs text-muted-foreground">{b.pg?.name} • Room {b.bed?.room_number || '101'} - {b.bed?.bed_label}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                        <div>
                          <div className="text-muted-foreground font-medium">Move-In Date</div>
                          <div className="font-semibold">{new Date(b.move_in_date).toLocaleDateString()}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground font-medium">Stay Duration</div>
                          <div className="font-semibold">{getMonthsStayed(b.move_in_date)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground font-medium">Booking Reference</div>
                          <div className="font-mono text-[10px] truncate max-w-[80px]">{b.id}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground font-medium">Total Amount</div>
                          <div className="font-semibold">₹{b.amount}</div>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs shrink-0"
                        onClick={() => {
                          setSelectedTenant(b)
                          setSelectedStage('booked')
                        }}
                      >
                        Profile
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState title="No historical tenants" desc="Your past occupant digital records will accumulate here." />
            )}
          </div>
        )}

        {/* Tab Contents: Declined */}
        {activeTab === 'declined' && (
          <div className="space-y-3">
            {loadingInquiries ? (
              <SkeletonRows />
            ) : declinedInquiries.length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {declinedInquiries.map(inq => (
                  <Card key={inq.id} className="border-slate-200/80 dark:border-slate-800/80 shadow-xs">
                    <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500">
                          <XCircle className="size-5" />
                        </div>
                        <div>
                          <div className="font-semibold text-sm">{inq.full_name || inq.seeker?.full_name || 'Anonymous Seeker'}</div>
                          <div className="text-xs text-muted-foreground">{inq.pg?.name} • Declined Inquiry</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                        <div>
                          <div className="text-muted-foreground font-medium">Inquiry Date</div>
                          <div className="font-semibold">{new Date(inq.created_at).toLocaleDateString()}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground font-medium">Preferred sharing</div>
                          <div className="font-semibold">{SHARING_LABELS[inq.sharing_preference || 1]}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground font-medium">Reason/Notes</div>
                          <div className="font-semibold truncate max-w-[150px]">{inq.owner_notes || 'Owner Declined'}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState title="No declined inquiries" desc="Inquiries you declined this calendar month will be listed here." />
            )}
          </div>
        )}
      </Tabs>

      {/* Seeker Profile Dialog */}
      <Dialog open={selectedTenant !== null} onOpenChange={open => !open && setSelectedTenant(null)}>
        <DialogContent className="max-w-md border-slate-200 dark:border-slate-800 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="size-5 text-indigo-600 dark:text-indigo-400" />
              Tenant Profile
            </DialogTitle>
            <DialogDescription>
              {selectedStage === 'inquiry' ? 'Inquiry-level seeker profile details.' : 'Confirmed tenant account details.'}
            </DialogDescription>
          </DialogHeader>

          {selectedTenant && (
            <div className="space-y-4 pt-2 text-sm">
              <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900 p-3.5 rounded-xl border">
                <div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold text-lg">
                  {selectedStage === 'inquiry' 
                    ? (selectedTenant.full_name || selectedTenant.seeker?.full_name || '?')[0].toUpperCase()
                    : (selectedTenant.seeker?.full_name || '?')[0].toUpperCase()}
                </div>
                <div>
                  <div className="font-bold text-base">
                    {selectedStage === 'inquiry' 
                      ? (selectedTenant.full_name || selectedTenant.seeker?.full_name) 
                      : selectedTenant.seeker?.full_name}
                  </div>
                  <div className="text-xs text-muted-foreground">Seeker Profile • PGFindR Sourced</div>
                </div>
              </div>

              {/* Data points grid */}
              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                    <Phone className="size-3" /> Mobile Number
                  </div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedStage === 'inquiry' ? selectedTenant.mobile : selectedTenant.seeker?.phone || 'Not Shared'}
                  </div>
                </div>

                {selectedStage === 'booked' && (
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                      <Mail className="size-3" /> Email Address
                    </div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {selectedTenant.seeker?.email || 'Not Shared'}
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                    <Clock className="size-3" /> Age
                  </div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedStage === 'inquiry' ? selectedTenant.age : selectedTenant.inquiry_id ? 'Refer to inquiry' : 'N/A'} Years
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                    <Briefcase className="size-3" /> Occupation
                  </div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedStage === 'inquiry' ? selectedTenant.occupation : 'Working Professional'}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                    <MapPin className="size-3" /> Origin City
                  </div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedStage === 'inquiry' ? selectedTenant.city_of_origin : 'Not Specified'}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                    <Layers className="size-3" /> Accommodation
                  </div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedStage === 'inquiry' 
                      ? `${SHARING_LABELS[selectedTenant.sharing_preference || 1]} Share` 
                      : `Room ${selectedTenant.bed?.room_number || '101'} - ${selectedTenant.bed?.bed_label}`}
                  </div>
                </div>
              </div>

              {selectedStage === 'booked' && (
                <div className="border-t pt-3 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Booking ID:</span>
                    <span className="font-mono font-semibold">{selectedTenant.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount Paid (Deposit + Rent):</span>
                    <span className="font-semibold text-green-600">₹{selectedTenant.amount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expected Arrival:</span>
                    <span className="font-semibold">{new Date(selectedTenant.move_in_date).toLocaleDateString()}</span>
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

function EmptyState({ title, desc }: { title: string; desc: string }) {
  return (
    <Empty className="py-12 border border-dashed rounded-2xl bg-slate-50/20">
      <EmptyMedia>
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
          <Users className="size-7 text-slate-400" />
        </div>
      </EmptyMedia>
      <EmptyTitle className="text-base font-bold mt-3">{title}</EmptyTitle>
      <EmptyDescription className="text-xs text-slate-500 max-w-[280px] text-center mt-1">{desc}</EmptyDescription>
    </Empty>
  )
}

function SkeletonRows() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <Skeleton key={i} className="h-16 w-full rounded-xl" />
      ))}
    </div>
  )
}
