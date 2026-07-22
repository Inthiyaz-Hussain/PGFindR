import { useNavigate } from 'react-router-dom'
import { MessageSquare, ExternalLink, Calendar, Clock, Loader2, CreditCard, ChevronLeft, User, MapPin, Phone } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import type { Inquiry } from '@/types'

const STATUS_CONFIG: Record<string, { label: string; class: string }> = {
  pending: { label: 'Pending', class: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-900' },
  contacted: { label: 'Contacted', class: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900' },
  confirmed: { label: 'Confirmed', class: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-900' },
  cancelled: { label: 'Declined', class: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900' },
}

function SharingLabel(type: number | null): string {
  const map: Record<number, string> = { 1: 'Single', 2: 'Double', 3: 'Triple', 4: 'Dormitory' }
  return type ? map[type] || `${type}-share` : ''
}

export function MyInquiriesPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: inquiries, isLoading } = useQuery({
    queryKey: ['my-inquiries', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('inquiries')
        .select('*, pg:pg_listings(id, name, city, locality, monthly_rent_min)')
        .eq('seeker_id', user!.id)
        .order('created_at', { ascending: false })
      return (data || []) as Inquiry[]
    },
    enabled: !!user,
  })

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('inquiries') as any)
        .update({ status: 'cancelled' })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-inquiries'] })
      toast.success('Inquiry cancelled')
    },
  })

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6 flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ChevronLeft className="size-5" />
        </Button>
        <div>
          <h1 className="scroll-m-20 text-2xl font-bold tracking-tight">My Inquiries</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Track your inquiry status with PG owners</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-36 w-full rounded-xl" />)}
        </div>
      ) : inquiries && inquiries.length > 0 ? (
        <div className="space-y-4">
          {inquiries.map((inq) => {
            const cfg = STATUS_CONFIG[inq.status]
            const pg = inq.pg as { id: string; name: string; city: string; locality: string; monthly_rent_min: number } | null
            return (
              <Card key={inq.id}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{pg?.name || 'Unknown PG'}</span>
                        <Badge variant="outline" className={`text-xs ${cfg.class}`}>{cfg.label}</Badge>
                      </div>

                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="size-3" />
                        {pg?.locality}, {pg?.city}
                      </div>

                      {/* Inquiry details */}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {inq.sharing_preference && (
                          <div className="flex items-center gap-1">
                            <User className="size-3" />
                            {SharingLabel(inq.sharing_preference)} Sharing
                          </div>
                        )}
                        {inq.move_in_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="size-3" />
                            Move-in: {new Date(inq.move_in_date).toLocaleDateString('en-IN')}
                          </div>
                        )}
                        {inq.duration_value && inq.duration_unit && (
                          <div className="flex items-center gap-1">
                            <Clock className="size-3" />
                            {inq.duration_value} {inq.duration_unit}
                          </div>
                        )}
                        {inq.mobile && (
                          <div className="flex items-center gap-1">
                            <Phone className="size-3" />
                            {inq.mobile}
                          </div>
                        )}
                      </div>

                      {inq.owner_notes && (
                        <div className="mt-2 text-xs text-blue-700 bg-blue-50 dark:bg-blue-950 dark:text-blue-300 rounded px-2 py-1.5">
                          Owner: "{inq.owner_notes}"
                        </div>
                      )}

                      <div className="text-xs text-muted-foreground pt-1">
                        Sent {new Date(inq.created_at).toLocaleDateString('en-IN')}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 shrink-0">
                      <Button variant="outline" size="icon" onClick={() => navigate(`/pg/${pg?.id}`)}>
                        <ExternalLink className="size-3.5" />
                      </Button>
                      {inq.status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => cancelMutation.mutate(inq.id)}
                          disabled={cancelMutation.isPending}
                        >
                          {cancelMutation.isPending ? <Loader2 className="size-3 animate-spin" /> : 'Cancel'}
                        </Button>
                      )}
                      {inq.status === 'confirmed' && (
                        <Button size="sm" onClick={() => navigate('/seeker/bookings')}>
                          <CreditCard className="size-3.5 mr-1" />
                          Pay
                        </Button>
                      )}
                    </div>
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
