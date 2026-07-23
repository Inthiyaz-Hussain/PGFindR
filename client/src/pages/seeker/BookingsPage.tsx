import { BedDouble, Calendar, IndianRupee, CreditCard } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
import { Button } from '@/components/ui/button'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Booking } from '@/types'
import { useNavigate } from 'react-router-dom'

const STATUS_CONFIG: Record<string, { label: string; class: string }> = {
  pending_payment: { label: 'Pending Payment', class: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  payment_done: { label: 'Payment Done', class: 'bg-blue-100 text-blue-800 border-blue-200' },
  active: { label: 'Active', class: 'bg-green-100 text-green-800 border-green-200' },
  completed: { label: 'Completed', class: 'bg-gray-100 text-gray-700 border-gray-200' },
  cancelled: { label: 'Cancelled', class: 'bg-red-100 text-red-800 border-red-200' },
}

export function BookingsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const savedBookingIds = JSON.parse(localStorage.getItem('pgr_saved_bookings') || '[]')

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['seeker-bookings-all', user?.id, savedBookingIds],
    queryFn: async () => {
      if (user) {
        const { data } = await supabase
          .from('bookings')
          .select('*, pg:pg_listings(id, name, city, locality), bed:beds(room_number, bed_label, sharing_type)')
          .eq('seeker_id', user.id)
          .order('created_at', { ascending: false })
        return (data || []) as Booking[]
      } else {
        if (savedBookingIds.length === 0) return []
        const { data } = await supabase
          .from('bookings')
          .select('*, pg:pg_listings(id, name, city, locality), bed:beds(room_number, bed_label, sharing_type)')
          .in('id', savedBookingIds)
          .order('created_at', { ascending: false })
        return (data || []) as Booking[]
      }
    },
    enabled: !!user || savedBookingIds.length > 0,
  })

  return (
    <div className="p-4 md:p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="scroll-m-20 text-2xl font-bold tracking-tight">My Bookings</h1>
        <p className="text-muted-foreground mt-1">Your PG booking history and status</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
      ) : bookings && bookings.length > 0 ? (
        <div className="space-y-4">
          {bookings.map((b) => {
            const cfg = STATUS_CONFIG[b.status]
            const pg = b.pg as { id: string; name: string; city: string; locality: string }
            const bed = b.bed as { room_number: string; bed_label: string; sharing_type: string } | null
            return (
              <Card key={b.id}>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="font-semibold">{pg?.name}</div>
                      <div className="text-sm text-muted-foreground">{pg?.locality}, {pg?.city}</div>
                    </div>
                    <Badge variant="outline" className={`text-xs ${cfg.class}`}>{cfg.label}</Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {bed && (
                      <div className="flex items-center gap-1.5 text-sm">
                        <BedDouble className="size-4 text-muted-foreground" />
                        <span>Room {bed.room_number} · {bed.bed_label}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-sm">
                      <Calendar className="size-4 text-muted-foreground" />
                      <span>{new Date(b.move_in_date).toLocaleDateString('en-IN')}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm font-medium">
                      <IndianRupee className="size-4 text-muted-foreground" />
                      <span>₹{b.monthly_rent.toLocaleString('en-IN')}/mo</span>
                    </div>
                  </div>

                  {b.deposit_amount > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Deposit: ₹{b.deposit_amount.toLocaleString('en-IN')}
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground">
                    Booked on {new Date(b.created_at).toLocaleDateString('en-IN')}
                  </div>

                  {b.status === 'pending_payment' && (
                    <Button
                      size="sm"
                      className="w-full mt-1"
                      onClick={() => navigate(`/payment/${b.id}`)}
                    >
                      <CreditCard className="size-4 mr-1.5" />
                      Pay ₹{b.deposit_amount.toLocaleString('en-IN')} Now
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Empty className="border-dashed">
          <EmptyMedia variant="icon">
            <BedDouble />
          </EmptyMedia>
          <EmptyTitle>No bookings yet</EmptyTitle>
          <EmptyDescription>Once a PG owner confirms your inquiry and you complete payment, your booking will appear here.</EmptyDescription>
          <Button onClick={() => navigate('/seeker/inquiries')}>View Inquiries</Button>
        </Empty>
      )}
    </div>
  )
}
