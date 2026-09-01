import { useNavigate } from 'react-router-dom'
import { Building2, BedDouble, ChevronRight, TrendingUp, MessageSquare, IndianRupee, Clock, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useQuery } from '@tanstack/react-query'
import { supabaseUntyped } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { PGListing, Inquiry } from '@/types'

export function OwnerDashboard() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const { data: listings, isLoading: loadingListings } = useQuery({
    queryKey: ['owner-listings', user?.id],
    queryFn: async () => {
      const { data } = await supabaseUntyped
        .from('pg_listings')
        .select('*')
        .eq('owner_id', user!.id)
        .order('created_at', { ascending: false })
      return (data || []) as PGListing[]
    },
    enabled: !!user,
  })

  const { data: inquiries, isLoading: loadingInq } = useQuery({
    queryKey: ['owner-inquiries', user?.id],
    queryFn: async () => {
      const { data } = await supabaseUntyped
        .from('inquiries')
        .select('*, pg:pg_listings!inner(owner_id, name), seeker:profiles!inquiries_seeker_id_fkey(full_name)')
        .eq('pg.owner_id', user!.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5)
      return (data || []) as Inquiry[]
    },
    enabled: !!user,
  })

  const { data: payments, isLoading: loadingPayments } = useQuery({
    queryKey: ['owner-payments', user?.id],
    queryFn: async () => {
      const { data: bookings } = await supabaseUntyped
        .from('bookings')
        .select('id')
        .eq('owner_id', user!.id)
      const bookingIds = (bookings || []).map((b: { id: string }) => b.id)
      if (bookingIds.length === 0) return []
      const { data } = await supabaseUntyped
        .from('payments')
        .select('*, booking:bookings!payments_booking_id_fkey!inner(id)')
        .in('booking_id', bookingIds)
        .eq('status', 'completed')
      return (data || []) as { owner_payout?: number; created_at?: string }[]
    },
    enabled: !!user,
  })

  const totalBeds = listings?.reduce((sum, l) => sum + l.total_beds, 0) || 0
  const occupiedBeds = listings?.reduce((sum, l) => sum + (l.total_beds - l.available_beds), 0) || 0
  const pendingInquiries = inquiries?.length || 0
  const thisMonthEarnings = payments?.reduce((sum, p) => {
    const date = new Date(p.created_at || '')
    const now = new Date()
    if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
      return sum + (p.owner_payout || 0)
    }
    return sum
  }, 0) || 0

  const availableBeds = totalBeds - occupiedBeds

  const pgStatusColor: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    inactive: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="scroll-m-20 text-2xl font-bold tracking-tight">
            Welcome, {profile?.full_name?.split(' ')[0]}!
          </h1>
          <p className="text-muted-foreground mt-1">Manage your PG listings and inquiries</p>
        </div>
      </div>
      
      {/* KYC Status Banners */}
      {profile?.kyc_status === 'submitted' && (
        <div className="mb-6 flex gap-3 rounded-xl border border-yellow-250 bg-yellow-50/20 p-4 text-yellow-800 dark:text-yellow-400">
          <Clock className="size-5 text-yellow-600 shrink-0" />
          <div>
            <div className="font-semibold">KYC Verification Pending Approval</div>
            <div className="text-sm opacity-90">Your profile and bank details are under review. We will notify you via email as soon as your listing is approved and goes live.</div>
          </div>
        </div>
      )}

      {profile?.kyc_status === 'resubmission_requested' && (
        <div className="mb-6 flex gap-3 rounded-xl border border-orange-250 bg-orange-50/20 p-4 text-orange-850 dark:text-orange-400">
          <AlertCircle className="size-5 text-orange-650 shrink-0 animate-pulse" />
          <div>
            <div className="font-semibold">KYC Action Required: Please Resubmit Documents</div>
            <div className="text-sm opacity-90 mt-0.5">Reason: <span className="italic font-medium">{profile?.kyc_notes || 'Some documents were rejected.'}</span></div>
            <Button size="sm" variant="outline" onClick={() => navigate('/owner/kyc')} className="mt-2 text-xs border-orange-250 hover:bg-orange-50 dark:hover:bg-slate-800">
              Resubmit Documents
            </Button>
          </div>
        </div>
      )}

      {/* Onboarding Checklist Gates (if not fully active/verified) */}
      {profile?.kyc_status !== 'approved' && (
        <Card className="mb-8 border-indigo-100 dark:border-indigo-900/30 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">🚀 Onboarding Completion Gates</CardTitle>
            <CardDescription>Complete these two milestones to take your PG listing live and unlock inquiries/payouts.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Gate 1: PG Details */}
            <div className={cn(
              'p-4 rounded-xl border transition-all',
              listings && listings.length > 0 ? 'border-green-200 bg-green-50/10' : 'border-slate-200 bg-background'
            )}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-bold flex items-center gap-1.5 text-sm">
                    {listings && listings.length > 0 ? '✅ Step 1: PG Details Added' : '⬜ Step 1: Add PG Details'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Provide description, rules, rooms, bed types, pricing, and amenities.</p>
                </div>
                {(!listings || listings.length === 0) && (
                  <Button size="sm" onClick={() => navigate('/owner/pgs/new')} className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 ml-2">Configure PG</Button>
                )}
              </div>
            </div>
            
            {/* Gate 2: Submit KYC */}
            <div className={cn(
              'p-4 rounded-xl border transition-all',
              ['submitted', 'approved'].includes(profile?.kyc_status || '') ? 'border-green-200 bg-green-50/10' : 'border-slate-200 bg-background'
            )}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-bold flex items-center gap-1.5 text-sm">
                    {['submitted', 'approved'].includes(profile?.kyc_status || '') ? '✅ Step 2: KYC Submitted' : '⬜ Step 2: Submit KYC Documents'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Upload Identity, Address, Property proofs and enter bank payout details.</p>
                </div>
                {!['submitted', 'approved'].includes(profile?.kyc_status || '') && (
                  <Button size="sm" onClick={() => navigate('/owner/kyc')} className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 ml-2">Verify KYC</Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
        {[
          { label: 'Total PGs', value: listings?.length || 0, icon: Building2, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400', link: '/owner/pgs' },
          { label: 'Total Beds', value: totalBeds, icon: BedDouble, color: 'text-violet-600 bg-violet-50 dark:bg-violet-950/30 dark:text-violet-400', link: '/owner/pgs' },
          { label: 'Available Beds', value: availableBeds, icon: BedDouble, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30 dark:text-indigo-400', link: '/owner/pgs' },
          { label: 'Occupied Beds', value: occupiedBeds, icon: TrendingUp, color: 'text-green-600 bg-green-50 dark:bg-green-950/30 dark:text-green-400', link: '/owner/pgs' },
          { label: 'Pending Inquiries', value: pendingInquiries, icon: MessageSquare, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400', link: '/owner/inquiries' },
          { label: 'This Month Earnings', value: `¥${thisMonthEarnings.toLocaleString('en-IN')}`, icon: IndianRupee, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400', isString: true },
        ].map(({ label, value, icon: Icon, color, isString, link }) => (
          <Card 
            key={label} 
            className={cn(link && "cursor-pointer hover:border-primary/50 transition-colors")}
            onClick={() => link && navigate(link)}
          >
            <CardContent className="pt-5 px-4 pb-4">
              <div className="flex flex-col gap-2">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${color}`}>
                  <Icon className="size-5" />
                </div>
                <div>
                  {loadingListings || loadingPayments ? (
                    <Skeleton className="h-7 w-16 mb-1" />
                  ) : (
                    <div className="text-xl font-bold">{isString ? value : value}</div>
                  )}
                  <div className="text-xs text-muted-foreground whitespace-nowrap">{label}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate('/owner/pgs')}>
          <CardContent className="pt-5 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="size-6 text-primary" />
            </div>
            <div className="flex-1">
              <div className="font-semibold">Manage PGs</div>
              <div className="text-sm text-muted-foreground">View, edit, and manage your property listings</div>
            </div>
            <ChevronRight className="size-5 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate('/owner/inquiries')}>
          <CardContent className="pt-5 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <MessageSquare className="size-6 text-primary" />
            </div>
            <div className="flex-1">
              <div className="font-semibold">View Inquiries</div>
              <div className="text-sm text-muted-foreground">Respond to seeker inquiries and confirm availability</div>
            </div>
            {pendingInquiries > 0 && (
              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">{pendingInquiries} new</Badge>
            )}
            <ChevronRight className="size-5 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Listings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">My Listings</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/owner/pgs')}>
              View all <ChevronRight className="size-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {loadingListings ? (
              <div className="space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-14" />)}</div>
            ) : listings && listings.length > 0 ? (
              <div className="space-y-3">
                {listings.slice(0, 3).map((l) => (
                  <div key={l.id} className="flex items-center justify-between rounded-md border p-3 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate(`/owner/pgs/${l.id}/availability`)}>
                    <div className="flex-1">
                      <div className="font-medium text-sm flex items-center gap-2">
                        {l.name}
                        <Badge className={`text-[10px] h-4 px-1.5 border-0 ${pgStatusColor[l.status]}`}>{l.status}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{l.locality}, {l.city}</div>
                      <div className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mt-1">
                        {l.available_beds} Available / {l.total_beds} Total Beds
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 ml-2">
                      <Button size="sm" variant="secondary" className="h-7 text-xs bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400">
                        Update Beds
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground bg-slate-50/50 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-6">
                <div className="max-w-md mx-auto space-y-4">
                  <p className="font-semibold text-slate-700 dark:text-slate-300">Get started by listing your PG accommodation!</p>
                  <p className="text-xs text-slate-500">List single/sharing rooms, specify AC/Non-AC types, add pricing, and reach thousands of seekers looking for coliving spaces in real-time.</p>
                  <div className="grid grid-cols-3 gap-3 pt-2">
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-lg shadow-2xs border border-slate-100 dark:border-slate-750 text-center">
                      <span className="text-xl block mb-1">📝</span>
                      <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase">1. Fill Details</span>
                    </div>
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-lg shadow-2xs border border-slate-100 dark:border-slate-750 text-center">
                      <span className="text-xl block mb-1">📸</span>
                      <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase">2. Add Photos</span>
                    </div>
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-lg shadow-2xs border border-slate-100 dark:border-slate-750 text-center">
                      <span className="text-xl block mb-1">✨</span>
                      <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase">3. Go Live</span>
                    </div>
                  </div>
                  <Button onClick={() => navigate('/owner/pgs/new')} className="mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl px-5">
                    Add Your First PG
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Inquiries */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Pending Inquiries</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/owner/inquiries')}>
              View all <ChevronRight className="size-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {loadingInq ? (
              <div className="space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-14" />)}</div>
            ) : inquiries && inquiries.length > 0 ? (
              <div className="space-y-3">
                {inquiries.map((inq) => {
                  const pg = inq.pg as { name?: string } | null
                  const seeker = inq.seeker as { full_name?: string } | null
                  return (
                    <div key={inq.id} className="flex items-center justify-between rounded-md border p-3 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate('/owner/inquiries')}>
                      <div>
                        <div className="font-medium text-sm">{inq.full_name || seeker?.full_name || 'Seeker'}</div>
                        <div className="text-xs text-muted-foreground">{pg?.name || 'PG'}</div>
                      </div>
                      {inq.move_in_date && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="size-3" />
                          {new Date(inq.move_in_date).toLocaleDateString('en-IN')}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground bg-slate-50/50 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-6">
                <div className="max-w-md mx-auto space-y-3">
                  <p className="font-semibold text-slate-700 dark:text-slate-300">No pending inquiries right now.</p>
                  <p className="text-xs text-slate-500">When seekers find your PG listing and request details, they will appear here. Keep your pricing competitive and upload high-quality pictures to stand out!</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
