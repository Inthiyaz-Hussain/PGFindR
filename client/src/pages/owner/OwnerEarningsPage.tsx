import { TrendingUp, DollarSign, IndianRupee, ArrowUpRight, Receipt } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useQuery } from '@tanstack/react-query'
import { supabaseUntyped } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
import { useNavigate } from 'react-router-dom'

export function OwnerEarningsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const { data: payments, isLoading } = useQuery({
    queryKey: ['owner-earnings', user?.id],
    queryFn: async () => {
      const { data: bookings } = await supabaseUntyped
        .from('bookings')
        .select('id')
        .eq('owner_id', user!.id)
      const bookingIds = (bookings || []).map((b: { id: string }) => b.id)
      if (bookingIds.length === 0) return []

      const { data } = await supabaseUntyped
        .from('payments')
        .select(`
          id,
          amount,
          commission_rate,
          commission_amount,
          owner_payout,
          status,
          payment_type,
          created_at,
          booking:bookings(
            id,
            monthly_rent,
            move_in_date,
            pg:pg_listings(name, city),
            seeker:profiles(full_name)
          )
        `)
        .in('booking_id', bookingIds)
        .order('created_at', { ascending: false })
      return (data || []) as unknown as {
        id: string
        amount: number
        commission_rate: number
        commission_amount: number
        owner_payout: number
        status: string
        payment_type: string
        created_at: string
        booking?: {
          id: string
          monthly_rent: number
          move_in_date: string
          pg?: { name: string; city: string }
          seeker?: { full_name: string }
        }
      }[]
    },
    enabled: !!user,
  })

  const totalEarnings = payments?.reduce((sum, p) => sum + (p.owner_payout || 0), 0) || 0
  const totalCommission = payments?.reduce((sum, p) => sum + (p.commission_amount || 0), 0) || 0

  // This month calculations
  const now = new Date()
  const thisMonthPayments = payments?.filter((p) => {
    const date = new Date(p.created_at)
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
  }) || []
  const thisMonthEarnings = thisMonthPayments.reduce((sum, p) => sum + (p.owner_payout || 0), 0)

  const completedPayments = payments?.filter((p) => p.status === 'completed') || []

  return (
    <div className="p-4 md:p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="scroll-m-20 text-2xl font-bold tracking-tight">Earnings</h1>
        <p className="text-muted-foreground mt-1">Payment history and payout details</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Earnings', value: totalEarnings, icon: IndianRupee, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400', prefix: '¥' },
          { label: 'This Month', value: thisMonthEarnings, icon: TrendingUp, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400', prefix: '¥' },
          { label: 'Commission Paid', value: totalCommission, icon: ArrowUpRight, color: 'text-violet-600 bg-violet-50 dark:bg-violet-950/30 dark:text-violet-400', prefix: '¥' },
          { label: 'Transactions', value: completedPayments.length, icon: Receipt, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400' },
        ].map(({ label, value, icon: Icon, color, prefix }) => (
          <Card key={label}>
            <CardContent className="pt-5">
              <div className="flex items-start gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${color}`}>
                  <Icon className="size-5" />
                </div>
                <div>
                  {isLoading ? (
                    <Skeleton className="h-7 w-20 mb-1" />
                  ) : (
                    <div className="text-xl font-bold">
                      {prefix && prefix}{typeof value === 'number' && prefix ? value.toLocaleString('en-IN') : value}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">{label}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment History</CardTitle>
          <CardDescription>All transactions for your PG bookings</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
            </div>
          ) : payments && payments.length > 0 ? (
            <div className="space-y-3">
              {payments.map((payment) => {
                const pg = payment.booking?.pg as { name?: string; city?: string } | undefined
                const seeker = payment.booking?.seeker as { full_name?: string } | undefined

                return (
                  <div key={payment.id} className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                          <DollarSign className="size-4 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium text-sm truncate max-w-[200px]">
                            {pg?.name || 'PG Listing'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {seeker?.full_name || 'Seeker'} - {payment.payment_type === 'deposit' ? 'Deposit' : 'Monthly Rent'}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-4">
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-semibold text-sm">
                            ¥{payment.owner_payout?.toLocaleString('en-IN') || 0}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            of ¥{payment.amount?.toLocaleString('en-IN') || 0}
                          </div>
                          <div className="text-xs text-violet-600 dark:text-violet-400">
                            Commission: ¥{payment.commission_amount?.toLocaleString('en-IN') || 0}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge
                            variant="outline"
                            className={
                              payment.status === 'completed'
                                ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400'
                                : payment.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400'
                                : 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400'
                            }
                          >
                            {payment.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(payment.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <Empty className="border-dashed">
              <EmptyMedia variant="icon"><IndianRupee /></EmptyMedia>
              <EmptyTitle>No payments yet</EmptyTitle>
              <EmptyDescription>
                Payment transactions will appear here once seekers book your PGs.
              </EmptyDescription>
              <Button variant="outline" onClick={() => navigate('/owner/pgs')}>
                View My Listings
              </Button>
            </Empty>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
