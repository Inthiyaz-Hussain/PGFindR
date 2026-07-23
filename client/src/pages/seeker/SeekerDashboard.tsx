import { useNavigate } from 'react-router-dom'
import { Search, MessageSquare, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Inquiry, Booking } from '@/types'

export function SeekerDashboard() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const savedInquiryIds = JSON.parse(localStorage.getItem('pgr_saved_inquiries') || '[]')
  const savedBookingIds = JSON.parse(localStorage.getItem('pgr_saved_bookings') || '[]')

  const { data: inquiries, isLoading: loadingInq } = useQuery({
    queryKey: ['seeker-inquiries', user?.id, savedInquiryIds],
    queryFn: async () => {
      if (user) {
        const { data } = await supabase
          .from('inquiries')
          .select('*, pg:pg_listings(name, city, locality)')
          .eq('seeker_id', user.id)
          .order('created_at', { ascending: false })
          .limit(3)
        return (data || []) as Inquiry[]
      } else {
        if (savedInquiryIds.length === 0) return []
        const { data } = await supabase
          .from('inquiries')
          .select('*, pg:pg_listings(name, city, locality)')
          .in('id', savedInquiryIds)
          .order('created_at', { ascending: false })
          .limit(3)
        return (data || []) as Inquiry[]
      }
    },
    enabled: !!user || savedInquiryIds.length > 0,
  })

  const { data: bookings, isLoading: loadingBook } = useQuery({
    queryKey: ['seeker-bookings', user?.id, savedBookingIds],
    queryFn: async () => {
      if (user) {
        const { data } = await supabase
          .from('bookings')
          .select('*, pg:pg_listings(name, city, locality), bed:beds(room_number, bed_label)')
          .eq('seeker_id', user.id)
          .order('created_at', { ascending: false })
          .limit(3)
        return (data || []) as Booking[]
      } else {
        if (savedBookingIds.length === 0) return []
        const { data } = await supabase
          .from('bookings')
          .select('*, pg:pg_listings(name, city, locality), bed:beds(room_number, bed_label)')
          .in('id', savedBookingIds)
          .order('created_at', { ascending: false })
          .limit(3)
        return (data || []) as Booking[]
      }
    },
    enabled: !!user || savedBookingIds.length > 0,
  })

  const inquiryStatusColor: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    contacted: 'bg-blue-100 text-blue-800',
    confirmed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  }

  const bookingStatusColor: Record<string, string> = {
    pending_payment: 'bg-yellow-100 text-yellow-800',
    payment_done: 'bg-blue-100 text-blue-800',
    active: 'bg-green-100 text-green-800',
    completed: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-red-100 text-red-800',
  }

  const seekerName = profile?.full_name || localStorage.getItem('seeker_fullName')

  return (
    <div className="p-4 md:p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="scroll-m-20 text-2xl font-bold tracking-tight">
          Welcome back, {seekerName?.split(' ')[0] || 'there'}!
        </h1>
        <p className="text-muted-foreground mt-1">Find your perfect paying guest accommodation</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/search')}>
          <CardContent className="pt-5 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Search className="size-6 text-primary" />
            </div>
            <div>
              <div className="font-semibold">Find PGs</div>
              <div className="text-sm text-muted-foreground">Search available PGs near you</div>
            </div>
            <ChevronRight className="size-4 text-muted-foreground ml-auto" />
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/seeker/inquiries')}>
          <CardContent className="pt-5 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
              <MessageSquare className="size-6 text-blue-600" />
            </div>
            <div>
              <div className="font-semibold">My Inquiries</div>
              <div className="text-sm text-muted-foreground">Track your inquiry status</div>
            </div>
            <ChevronRight className="size-4 text-muted-foreground ml-auto" />
          </CardContent>
        </Card>
      </div>

      {/* Recent Inquiries */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Recent Inquiries</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate('/seeker/inquiries')}>
            View all <ChevronRight className="size-3.5" />
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          {loadingInq ? (
            <div className="space-y-3">
              {[1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : inquiries && inquiries.length > 0 ? (
            <div className="space-y-3">
              {inquiries.map((inq) => (
                <div key={inq.id} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <div className="font-medium text-sm">{(inq.pg as { name: string })?.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {(inq.pg as { city: string; locality: string })?.locality}, {(inq.pg as { city: string })?.city}
                    </div>
                  </div>
                  <Badge className={`text-xs border-0 ${inquiryStatusColor[inq.status]}`}>
                    {inq.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground bg-slate-50/50 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-6">
              <div className="max-w-md mx-auto space-y-4">
                <p className="font-semibold text-slate-700 dark:text-slate-300">You haven't submitted any inquiries yet.</p>
                <p className="text-xs text-slate-500">Explore premium paying guest accommodations near you with zero brokerage. Select a PG, customize your sharing preference, and send an inquiry directly to the owner.</p>
                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-lg shadow-2xs border border-slate-100 dark:border-slate-750 text-center">
                    <span className="text-xl block mb-1">📍</span>
                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase">1. Pick Location</span>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-lg shadow-2xs border border-slate-100 dark:border-slate-750 text-center">
                    <span className="text-xl block mb-1">🎯</span>
                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase">2. Select Sharing</span>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-lg shadow-2xs border border-slate-100 dark:border-slate-750 text-center">
                    <span className="text-xl block mb-1">💬</span>
                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase">3. Talk to Owner</span>
                  </div>
                </div>
                <Button onClick={() => navigate('/search')} className="mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl px-5">
                  Find a PG Now
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Bookings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">My Bookings</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate('/seeker/bookings')}>
            View all <ChevronRight className="size-3.5" />
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          {loadingBook ? (
            <div className="space-y-3">
              {[1].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : bookings && bookings.length > 0 ? (
            <div className="space-y-3">
              {bookings.map((b) => (
                <div key={b.id} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <div className="font-medium text-sm">{(b.pg as { name: string })?.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Move in: {new Date(b.move_in_date).toLocaleDateString('en-IN')}
                    </div>
                  </div>
                  <Badge className={`text-xs border-0 ${bookingStatusColor[b.status]}`}>
                    {b.status.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground bg-slate-50/50 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-6">
              <div className="max-w-md mx-auto space-y-4">
                <p className="font-semibold text-slate-700 dark:text-slate-300">No active bookings yet.</p>
                <p className="text-xs text-slate-500">Secure your dream room instantly! Once the owner accepts your inquiry, you can make a safe online deposit payment to confirm your booking.</p>
                <Button onClick={() => navigate('/search')} variant="outline" className="mt-2 rounded-xl">
                  Browse PG Properties
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
