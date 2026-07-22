import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CreditCard, Download, Search, ChevronLeft, ChevronRight, IndianRupee, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
import { useQuery } from '@tanstack/react-query'
import { supabaseUntyped } from '@/lib/supabase'
import { toast } from 'sonner'
import type { PaymentStatus } from '@/types'

const STATUS_CONFIG: Record<PaymentStatus, { label: string; class: string }> = {
  pending: { label: 'Pending', class: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400' },
  completed: { label: 'Completed', class: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400' },
  failed: { label: 'Failed', class: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400' },
  refunded: { label: 'Refunded', class: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400' },
}

const ITEMS_PER_PAGE = 15

interface PaymentRow {
  id: string
  booking_id: string
  amount: number
  commission_rate: number
  commission_amount: number
  owner_payout: number
  status: PaymentStatus
  payment_type: string
  created_at: string
  razorpay_payment_id: string | null
  booking: {
    pg: { name: string }
    seeker: { full_name: string }
    owner: { full_name: string }
  } | null
}

export function AdminTransactionsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [exporting, setExporting] = useState(false)

  const page = Number(searchParams.get('page') || '1')
  const statusFilter = searchParams.get('status') || 'all'
  const dateFrom = searchParams.get('dateFrom') || ''
  const dateTo = searchParams.get('dateTo') || ''
  const searchQuery = searchParams.get('search') || ''

  const { data: txData, isLoading } = useQuery({
    queryKey: ['admin-transactions', page, statusFilter, dateFrom, dateTo, searchQuery],
    queryFn: async () => {
      let query = supabaseUntyped
        .from('payments')
        .select(`
          id,
          booking_id,
          amount,
          commission_rate,
          commission_amount,
          owner_payout,
          status,
          payment_type,
          created_at,
          razorpay_payment_id,
          booking:bookings(
            pg:pg_listings(name),
            seeker:profiles!bookings_seeker_id_fkey(full_name),
            owner:profiles!bookings_owner_id_fkey(full_name)
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE - 1)

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }
      if (dateFrom) {
        query = query.gte('created_at', new Date(dateFrom).toISOString())
      }
      if (dateTo) {
        query = query.lte('created_at', new Date(dateTo + 'T23:59:59').toISOString())
      }

      const { data, count } = await query
      // Transform nested selects from arrays to objects (Supabase returns them as arrays for joins)
      const payments = ((data || []) as unknown[]).map((p: unknown) => {
        const row = p as Record<string, unknown>
        const booking = row.booking as unknown
        let bookingData = null
        if (booking && typeof booking === 'object' && !Array.isArray(booking)) {
          const b = booking as Record<string, unknown>
          const pgArr = b.pg as unknown[]
          const seekerArr = b.seeker as unknown[]
          const ownerArr = b.owner as unknown[]
          bookingData = {
            pg: pgArr?.[0] || { name: '—' },
            seeker: seekerArr?.[0] || { full_name: '—' },
            owner: ownerArr?.[0] || { full_name: '—' },
          }
        }
        return { ...row, booking: bookingData } as PaymentRow
      })
      return { payments, total: count || 0 }
    },
  })

  const totalPages = Math.ceil((txData?.total || 0) / ITEMS_PER_PAGE)

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams)
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.set('page', '1')
    setSearchParams(params)
  }

  const exportToCSV = async () => {
    setExporting(true)
    try {
      // Fetch all matching records (no pagination)
      let query = supabaseUntyped
        .from('payments')
        .select(`
          id,
          booking_id,
          amount,
          commission_rate,
          commission_amount,
          owner_payout,
          status,
          payment_type,
          created_at,
          razorpay_payment_id,
          booking:bookings(
            pg:pg_listings(name),
            seeker:profiles!bookings_seeker_id_fkey(full_name),
            owner:profiles!bookings_owner_id_fkey(full_name)
          )
        `)
        .order('created_at', { ascending: false })

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }
      if (dateFrom) {
        query = query.gte('created_at', new Date(dateFrom).toISOString())
      }
      if (dateTo) {
        query = query.lte('created_at', new Date(dateTo + 'T23:59:59').toISOString())
      }

      const { data } = await query
      // Transform nested selects from arrays to objects
      const payments = ((data || []) as unknown[]).map((p: unknown) => {
        const row = p as Record<string, unknown>
        const booking = row.booking as unknown
        let bookingData = null
        if (booking && typeof booking === 'object' && !Array.isArray(booking)) {
          const b = booking as Record<string, unknown>
          const pgArr = b.pg as unknown[]
          const seekerArr = b.seeker as unknown[]
          const ownerArr = b.owner as unknown[]
          bookingData = {
            pg: pgArr?.[0] || { name: '—' },
            seeker: seekerArr?.[0] || { full_name: '—' },
            owner: ownerArr?.[0] || { full_name: '—' },
          }
        }
        return { ...row, booking: bookingData } as PaymentRow
      })

      // Build CSV
      const headers = ['Date', 'Payment ID', 'Booking ID', 'Seeker', 'PG', 'Owner', 'Amount', 'Commission Rate', 'Commission', 'Owner Payout', 'Status', 'Payment Type', 'Razorpay ID']
      const rows = payments.map(p => [
        new Date(p.created_at).toLocaleDateString('en-IN'),
        p.id,
        p.booking_id,
        p.booking?.seeker?.full_name || '—',
        p.booking?.pg?.name || '—',
        p.booking?.owner?.full_name || '—',
        p.amount,
        `${p.commission_rate}%`,
        p.commission_amount,
        p.owner_payout,
        p.status,
        p.payment_type,
        p.razorpay_payment_id || '—'
      ])

      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')

      // Download
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)

      toast.success(`Exported ${payments.length} transactions`)
    } catch (err) {
      console.error(err)
      toast.error('Failed to export transactions')
    } finally {
      setExporting(false)
    }
  }

  // Calculate totals
  const totalAmount = txData?.payments?.reduce((sum, p) => sum + p.amount, 0) || 0
  const totalCommission = txData?.payments?.reduce((sum, p) => sum + p.commission_amount, 0) || 0
  const totalPayout = txData?.payments?.reduce((sum, p) => sum + p.owner_payout, 0) || 0

  return (
    <div className="p-4 md:p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="scroll-m-20 text-2xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground mt-1">All platform payments and payouts</p>
        </div>
        <Button variant="outline" onClick={exportToCSV} disabled={exporting || !txData?.payments?.length}>
          <Download className="size-4" /> {exporting ? 'Exporting...' : 'Export CSV'}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/30">
                <IndianRupee className="size-5 text-blue-600" />
              </div>
              <div>
                <div className="text-xl font-bold">{totalAmount.toLocaleString('en-IN')}</div>
                <div className="text-xs text-muted-foreground">Total Transaction Value</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 dark:bg-green-950/30">
                <IndianRupee className="size-5 text-green-600" />
              </div>
              <div>
                <div className="text-xl font-bold">{totalCommission.toLocaleString('en-IN')}</div>
                <div className="text-xs text-muted-foreground">Platform Commission</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-950/30">
                <IndianRupee className="size-5 text-violet-600" />
              </div>
              <div>
                <div className="text-xl font-bold">{totalPayout.toLocaleString('en-IN')}</div>
                <div className="text-xs text-muted-foreground">Owner Payouts</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-5">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search by Payment ID..."
                  value={searchQuery}
                  onChange={(e) => updateFilter('search', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={(v) => updateFilter('status', v)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-muted-foreground" />
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => updateFilter('dateFrom', e.target.value)}
                className="w-[140px]"
                placeholder="From"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => updateFilter('dateTo', e.target.value)}
                className="w-[140px]"
                placeholder="To"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Transactions ({txData?.total || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14" />)}</div>
          ) : txData?.payments && txData.payments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Payment ID</TableHead>
                  <TableHead>Seeker</TableHead>
                  <TableHead>PG</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Payout</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {txData.payments.map((tx) => {
                  const cfg = STATUS_CONFIG[tx.status]
                  return (
                    <TableRow key={tx.id}>
                      <TableCell className="text-sm">
                        {new Date(tx.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{tx.id.slice(0, 8)}...</TableCell>
                      <TableCell>{tx.booking?.seeker?.full_name || '—'}</TableCell>
                      <TableCell>{tx.booking?.pg?.name || '—'}</TableCell>
                      <TableCell>{tx.booking?.owner?.full_name || '—'}</TableCell>
                      <TableCell className="font-medium">{tx.amount.toLocaleString('en-IN')}</TableCell>
                      <TableCell className="text-green-600">{tx.commission_amount.toLocaleString('en-IN')}</TableCell>
                      <TableCell>{tx.owner_payout.toLocaleString('en-IN')}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cfg.class}>{cfg.label}</Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <Empty className="border-dashed">
              <EmptyMedia variant="icon"><CreditCard /></EmptyMedia>
              <EmptyTitle>No transactions found</EmptyTitle>
              <EmptyDescription>Try adjusting your filters</EmptyDescription>
            </Empty>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            Showing {((page - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(page * ITEMS_PER_PAGE, txData?.total || 0)} of {txData?.total || 0}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setSearchParams({ ...Object.fromEntries(searchParams), page: String(page - 1) })}>
              <ChevronLeft className="size-4" /> Previous
            </Button>
            <div className="text-sm text-muted-foreground">Page {page} of {totalPages}</div>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setSearchParams({ ...Object.fromEntries(searchParams), page: String(page + 1) })}>
              Next <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
