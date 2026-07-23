import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageSquare, ExternalLink, Calendar, Loader2, CreditCard } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Inquiry } from '@/types'
import { toast } from 'sonner'

const STATUS_CONFIG: Record<string, { label: string; class: string }> = {
  pending: { label: 'Pending', class: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  contacted: { label: 'Contacted', class: 'bg-blue-100 text-blue-800 border-blue-200' },
  confirmed: { label: 'Confirmed', class: 'bg-green-100 text-green-800 border-green-200' },
  cancelled: { label: 'Cancelled', class: 'bg-red-100 text-red-800 border-red-200' },
}

export function InquiriesPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [payingInqId, setPayingInqId] = useState<string | null>(null)

  const savedInquiryIds = JSON.parse(localStorage.getItem('pgr_saved_inquiries') || '[]')

  const { data: inquiries, isLoading } = useQuery({
    queryKey: ['seeker-inquiries-all', user?.id, savedInquiryIds],
    queryFn: async () => {
      if (user) {
        const { data } = await supabase
          .from('inquiries')
          .select('*, pg:pg_listings(id, name, city, locality, monthly_rent_min, owner_id), bed:beds(room_number, bed_label, monthly_rent)')
          .eq('seeker_id', user.id)
          .order('created_at', { ascending: false })
        return (data || []) as Inquiry[]
      } else {
        if (savedInquiryIds.length === 0) return []
        const { data } = await supabase
          .from('inquiries')
          .select('*, pg:pg_listings(id, name, city, locality, monthly_rent_min, owner_id), bed:beds(room_number, bed_label, monthly_rent)')
          .in('id', savedInquiryIds)
          .order('created_at', { ascending: false })
        return (data || []) as Inquiry[]
      }
    },
    enabled: !!user || savedInquiryIds.length > 0,
  })

  async function handlePay(inq: Inquiry) {
    setPayingInqId(inq.id)
    try {
      const sharingTypeMap: Record<number, string> = { 1: 'single', 2: 'double', 3: 'triple', 4: 'dormitory' }
      const prefStr = inq.sharing_preference ? sharingTypeMap[inq.sharing_preference] : 'single'

      const { data: beds } = await supabase
        .from('beds')
        .select('id, monthly_rent')
        .eq('pg_id', inq.pg_id)
        .eq('status', 'available')
        .eq('sharing_type', prefStr)
        .limit(1)

      const bedId = (beds as any)?.[0]?.id || null
      const monthlyRent = (beds as any)?.[0]?.monthly_rent || (inq.pg as any)?.monthly_rent_min || 5000

      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://swiftpg-backend.onrender.com'}/api/booking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inquiry_id: inq.id,
          pg_id: inq.pg_id,
          seeker_id: inq.seeker_id || localStorage.getItem('seeker_id'),
          owner_id: (inq.pg as any)?.owner_id,
          bed_id: bedId,
          monthly_rent: monthlyRent,
          move_in_date: inq.move_in_date || new Date().toISOString().split('T')[0]
        })
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to create booking')
      }

      const booking = await res.json()

      const savedBookings = JSON.parse(localStorage.getItem('pgr_saved_bookings') || '[]')
      if (!savedBookings.includes(booking.id)) {
        savedBookings.push(booking.id)
        localStorage.setItem('pgr_saved_bookings', JSON.stringify(savedBookings))
      }

      toast.success('Booking initialized! Redirecting to payment...')
      navigate(`/payment/${booking.id}`)
    } catch (err: any) {
      toast.error(err.message || 'Payment initiation failed')
    } finally {
      setPayingInqId(null)
    }
  }

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('inquiries') as any).update({ status: 'cancelled' }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seeker-inquiries-all'] })
      toast.success('Inquiry cancelled')
    },
  })

  return (
    <div className="p-4 md:p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="scroll-m-20 text-2xl font-bold tracking-tight">My Inquiries</h1>
        <p className="text-muted-foreground mt-1">Track your inquiry status with PG owners</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </div>
      ) : inquiries && inquiries.length > 0 ? (
        <div className="space-y-4">
          {inquiries.map((inq) => {
            const cfg = STATUS_CONFIG[inq.status]
            const pg = inq.pg as { id: string; name: string; city: string; locality: string; monthly_rent_min: number }
            const bed = inq.bed as { room_number: string; bed_label: string; monthly_rent: number } | null
            return (
              <Card key={inq.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-semibold">{pg?.name}</span>
                        <Badge variant="outline" className={`text-xs ${cfg.class}`}>{cfg.label}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">
                        {pg?.locality}, {pg?.city}
                      </div>
                      {bed && (
                        <div className="text-sm">Room {bed.room_number} · {bed.bed_label} · ₹{bed.monthly_rent.toLocaleString('en-IN')}/mo</div>
                      )}
                      {inq.move_in_date && (
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Calendar className="size-3" />
                          Move-in: {new Date(inq.move_in_date).toLocaleDateString('en-IN')}
                        </div>
                      )}
                      {inq.message && (
                        <div className="mt-2 text-xs text-muted-foreground bg-muted rounded px-2 py-1.5 line-clamp-2">
                          "{inq.message}"
                        </div>
                      )}
                      {inq.owner_notes && (
                        <div className="mt-2 text-xs text-blue-700 bg-blue-50 rounded px-2 py-1.5">
                          Owner: "{inq.owner_notes}"
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button variant="outline" size="icon-sm" onClick={() => navigate(`/pg/${pg?.id}`)}>
                        <ExternalLink className="size-3.5" />
                      </Button>
                      {inq.status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="xs"
                          className="text-destructive"
                          onClick={() => cancelMutation.mutate(inq.id)}
                          disabled={cancelMutation.isPending}
                        >
                          {cancelMutation.isPending ? <Loader2 className="size-3 animate-spin" /> : 'Cancel'}
                        </Button>
                      )}
                      {inq.status === 'confirmed' && (
                        <Button
                          size="sm"
                          disabled={payingInqId === inq.id}
                          onClick={() => handlePay(inq)}
                        >
                          {payingInqId === inq.id ? (
                            <Loader2 className="size-3 animate-spin mr-1" />
                          ) : (
                            <CreditCard className="size-3 mr-1" />
                          )}
                          Pay
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Sent {new Date(inq.created_at).toLocaleDateString('en-IN')}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Empty className="border-dashed">
          <EmptyMedia variant="icon">
            <MessageSquare />
          </EmptyMedia>
          <EmptyTitle>No inquiries yet</EmptyTitle>
          <EmptyDescription>Browse PGs and send inquiries to get started.</EmptyDescription>
          <Button onClick={() => navigate('/search')}>Find PGs</Button>
        </Empty>
      )}
    </div>
  )
}
