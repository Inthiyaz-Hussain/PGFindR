import { Building2, Users, TrendingUp, ShieldCheck, UserCheck, CreditCard, IndianRupee, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useQuery } from '@tanstack/react-query'
import { supabaseUntyped } from '@/lib/supabase'
import { useNavigate } from 'react-router-dom'

export function AdminDashboard() {
  const navigate = useNavigate()

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats-full'],
    queryFn: async () => {
      const [
        listingsAll,
        listingsPending,
        listingsApproved,
        listingsInactive,
        seekersCount,
        ownersCount,
        bookingsAll,
        bookingsCompleted,
        bookingsPending,
        paymentsThisMonth,
      ] = await Promise.all([
        supabaseUntyped.from('pg_listings').select('id', { count: 'exact', head: true }),
        supabaseUntyped.from('pg_listings').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabaseUntyped.from('pg_listings').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
        supabaseUntyped.from('pg_listings').select('id', { count: 'exact', head: true }).eq('status', 'inactive'),
        supabaseUntyped.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'seeker'),
        supabaseUntyped.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'owner'),
        supabaseUntyped.from('bookings').select('id', { count: 'exact', head: true }),
        supabaseUntyped.from('bookings').select('id', { count: 'exact', head: true }).in('status', ['active', 'completed']),
        supabaseUntyped.from('bookings').select('id', { count: 'exact', head: true }).in('status', ['pending_payment', 'payment_done']),
        supabaseUntyped.from('payments').select('commission_amount').eq('status', 'completed').gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      ])

      const thisMonthRevenue = (paymentsThisMonth.data || []).reduce((sum: number, p: { commission_amount: number }) => sum + (p.commission_amount || 0), 0)

      return {
        totalPGs: listingsAll.count || 0,
        pendingPGs: listingsPending.count || 0,
        approvedPGs: listingsApproved.count || 0,
        inactivePGs: listingsInactive.count || 0,
        totalSeekers: seekersCount.count || 0,
        totalOwners: ownersCount.count || 0,
        totalBookings: bookingsAll.count || 0,
        completedBookings: bookingsCompleted.count || 0,
        pendingBookings: bookingsPending.count || 0,
        thisMonthRevenue,
      }
    },
  })

  return (
    <div className="p-4 md:p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="scroll-m-20 text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">Platform overview and management</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {[
          { label: 'Total PGs', value: stats?.totalPGs, icon: Building2, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30' },
          { label: 'Active PGs', value: stats?.approvedPGs, icon: ShieldCheck, color: 'text-green-600 bg-green-50 dark:bg-green-950/30' },
          { label: 'Seekers', value: stats?.totalSeekers, icon: Users, color: 'text-violet-600 bg-violet-50 dark:bg-violet-950/30' },
          { label: 'Owners', value: stats?.totalOwners, icon: UserCheck, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30' },
          { label: 'This Month Revenue', value: `¥${(stats?.thisMonthRevenue || 0).toLocaleString('en-IN')}`, icon: IndianRupee, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30', isString: true },
        ].map(({ label, value, icon: Icon, color, isString }) => (
          <Card key={label}>
            <CardContent className="pt-5">
              <div className="flex items-start gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${color}`}>
                  <Icon className="size-5" />
                </div>
                <div>
                  {isLoading ? (
                    <Skeleton className="h-7 w-16 mb-1" />
                  ) : (
                    <div className="text-xl font-bold">{isString ? value : value}</div>
                  )}
                  <div className="text-xs text-muted-foreground">{label}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-50 dark:bg-yellow-950/30">
                  <Clock className="size-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{isLoading ? '—' : stats?.pendingPGs}</div>
                  <div className="text-xs text-muted-foreground">PGs Pending Approval</div>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate('/admin/pgs?status=pending')}>
                Review
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/30">
                  <CreditCard className="size-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{isLoading ? '—' : stats?.pendingBookings}</div>
                  <div className="text-xs text-muted-foreground">Bookings Pending</div>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate('/admin/transactions')}>
                View
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 dark:bg-green-950/30">
                  <TrendingUp className="size-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{isLoading ? '—' : stats?.completedBookings}</div>
                  <div className="text-xs text-muted-foreground">Completed Bookings</div>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate('/admin/transactions')}>
                View
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button onClick={() => navigate('/admin/pgs')} className="flex flex-col items-center gap-2 p-4 rounded-lg border hover:bg-muted/50 transition-colors">
              <Building2 className="size-6 text-blue-600" />
              <span className="text-sm font-medium">Manage PGs</span>
            </button>
            <button onClick={() => navigate('/admin/owners')} className="flex flex-col items-center gap-2 p-4 rounded-lg border hover:bg-muted/50 transition-colors">
              <UserCheck className="size-6 text-amber-600" />
              <span className="text-sm font-medium">View Owners</span>
            </button>
            <button onClick={() => navigate('/admin/transactions')} className="flex flex-col items-center gap-2 p-4 rounded-lg border hover:bg-muted/50 transition-colors">
              <CreditCard className="size-6 text-green-600" />
              <span className="text-sm font-medium">Transactions</span>
            </button>
            <button onClick={() => navigate('/admin/users')} className="flex flex-col items-center gap-2 p-4 rounded-lg border hover:bg-muted/50 transition-colors">
              <Users className="size-6 text-violet-600" />
              <span className="text-sm font-medium">View Seekers</span>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
