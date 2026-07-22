import { TrendingUp, DollarSign, Building2, ArrowUpRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

const COMMISSION_RATE = 0.1

export function EarningsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-earnings'],
    queryFn: async () => {
      const { data: payments } = await supabase
        .from('payments')
        .select('*, booking:bookings(*, pg:pg_listings(name, city), bed:beds(room_number))')
        .order('created_at', { ascending: false })
      return (payments || []) as any[]
    },
  })

  const totalCollected = data?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0
  const platformEarnings = totalCollected * COMMISSION_RATE
  const ownerPayouts = totalCollected - platformEarnings
  const successfulPayments = data?.filter((p) => p.status === 'completed') || []

  return (
    <div className="p-4 md:p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="scroll-m-20 text-2xl font-bold tracking-tight">Platform Earnings</h1>
        <p className="text-muted-foreground mt-1">Commission revenue and payment overview</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Collected', value: totalCollected, icon: DollarSign, color: 'text-blue-600 bg-blue-50', prefix: '₹' },
          { label: 'Platform Earnings', value: platformEarnings, icon: TrendingUp, color: 'text-green-600 bg-green-50', prefix: '₹', note: '10% commission' },
          { label: 'Owner Payouts', value: ownerPayouts, icon: ArrowUpRight, color: 'text-violet-600 bg-violet-50', prefix: '₹' },
          { label: 'Transactions', value: successfulPayments.length, icon: Building2, color: 'text-yellow-600 bg-yellow-50', prefix: '' },
        ].map(({ label, value, icon: Icon, color, prefix, note }) => (
          <Card key={label}>
            <CardContent className="pt-5">
              <div className="flex items-start gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${color}`}>
                  <Icon className="size-5" />
                </div>
                <div>
                  {isLoading ? (
                    <Skeleton className="h-8 w-20 mb-1" />
                  ) : (
                    <div className="text-2xl font-bold">
                      {prefix}{typeof value === 'number' && prefix === '₹' ? value.toLocaleString('en-IN') : value}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">{label}</div>
                  {note && <div className="text-xs text-green-600 mt-0.5">{note}</div>}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
            </div>
          ) : data && data.length > 0 ? (
            <div className="space-y-2">
              {data.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <div className="font-medium text-sm">
                      {payment.booking?.pg?.name || 'PG Listing'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {payment.booking?.pg?.city} ·
                      Room {payment.booking?.bed?.room_number || '—'} ·
                      {new Date(payment.created_at).toLocaleDateString('en-IN')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-sm">₹{(payment.amount || 0).toLocaleString('en-IN')}</div>
                    <div className="text-xs text-green-600">Commission: ₹{((payment.amount || 0) * COMMISSION_RATE).toLocaleString('en-IN')}</div>
                    <Badge
                      variant="outline"
                      className={`text-xs mt-1 ${
                        payment.status === 'completed'
                          ? 'bg-green-100 text-green-800 border-green-200'
                          : payment.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                          : 'bg-red-100 text-red-800 border-red-200'
                      }`}
                    >
                      {payment.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center text-muted-foreground text-sm">
              No transactions yet. Payments will appear here once seekers book PGs.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
