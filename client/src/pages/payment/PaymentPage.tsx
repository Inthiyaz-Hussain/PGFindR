import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, Shield, CheckCircle2, Loader2, Home, IndianRupee } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

declare global {
  interface Window {
    Cashfree: any
  }
}

interface BookingDetail {
  id: string
  monthly_rent: number
  deposit_amount: number
  amount: number
  commission_pct: number
  commission_amount: number
  owner_payout: number
  move_in_date: string
  status: string
  pg: { id: string; name: string; city: string; locality: string }
  bed: { room_number: string; bed_label: string; sharing_type: string } | null
  seeker: { full_name: string }
  platform_fee?: number
  service_charge?: number
}

const CASHFREE_SCRIPT = 'https://sdk.cashfree.com/js/v3/cashfree.js'

export function PaymentPage() {
  const { id: bookingId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [initiating, setInitiating] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const [includeRent, setIncludeRent] = useState(false)

  const isCallback = searchParams.get('cashfree_callback') === 'true'

  // Load Cashfree checkout SDK v3 script
  useEffect(() => {
    if (document.getElementById('cashfree-script')) {
      setScriptLoaded(true)
      return
    }
    const script = document.createElement('script')
    script.id = 'cashfree-script'
    script.src = CASHFREE_SCRIPT
    script.onload = () => setScriptLoaded(true)
    script.onerror = () => {
      toast.error('Failed to load payment gateway. Please check your connection.')
    }
    document.head.appendChild(script)
  }, [])

  const { data: booking, isLoading } = useQuery<BookingDetail>({
    queryKey: ['booking-payment', bookingId],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://swiftpg-backend.onrender.com'}/api/booking/${bookingId}`)
      if (!res.ok) throw new Error('Failed to load booking')
      return res.json()
    },
    enabled: !!bookingId,
  })

  // Callback Verification logic
  const verifyPayment = useCallback(async () => {
    if (!bookingId) return
    setVerifying(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://swiftpg-backend.onrender.com'}/api/payment/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: bookingId }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        navigate(`/payment/failed/${bookingId}`, { state: { error: err.error || 'Payment verification failed' } })
        return
      }

      toast.success('Payment completed successfully!')
      navigate(`/payment/success/${bookingId}`)
    } catch (err: any) {
      navigate(`/payment/failed/${bookingId}`, { state: { error: err.message || 'Payment verification failed' } })
    } finally {
      setVerifying(false)
    }
  }, [bookingId, navigate])

  useEffect(() => {
    if (isCallback && bookingId) {
      verifyPayment()
    }
  }, [isCallback, bookingId, verifyPayment])

  const handlePayment = useCallback(async () => {
    if (!booking || !scriptLoaded) return

    setInitiating(true)

    try {
      // Step 1: Initiate payment — create Cashfree order on backend with selected rent option
      const initiateRes = await fetch(`${import.meta.env.VITE_API_URL || 'https://swiftpg-backend.onrender.com'}/api/payment/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: booking.id, include_rent: includeRent }),
      })

      if (!initiateRes.ok) {
        const err = await initiateRes.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to initiate payment')
      }

      const order = await initiateRes.json()

      // Step 2: Open Cashfree checkout if we are not in mock/demo mode
      if (order.payment_session_id && !order.is_demo_mode) {
        const cashfree = window.Cashfree({
          mode: import.meta.env.VITE_CASHFREE_ENV === 'PRODUCTION' ? 'production' : 'sandbox'
        })
        cashfree.checkout({
          paymentSessionId: order.payment_session_id,
          redirectTarget: '_self'
        })
      } else {
        // Fallback mock payment path
        toast.info('Initiated demo payment. Redirecting to verify...')
        navigate(`/payment/${booking.id}?cashfree_callback=true`)
      }
    } catch (err) {
      toast.error((err as Error).message)
      setInitiating(false)
    }
  }, [booking, scriptLoaded, navigate, includeRent])

  const handleDemoPayment = useCallback(async () => {
    if (!booking) return

    setInitiating(true)

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://swiftpg-backend.onrender.com'}/api/payment/demo-confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: booking.id, include_rent: includeRent }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Demo payment failed')
      }

      toast.success('Payment completed successfully (Demo Mode)!')
      navigate(`/payment/success/${booking.id}`)
    } catch (err) {
      toast.error((err as Error).message)
      setInitiating(false)
    }
  }, [booking, navigate, includeRent])

  if (isLoading || verifying) {
    return (
      <div className="container mx-auto max-w-lg px-4 py-12 text-center">
        <Loader2 className="size-8 animate-spin mx-auto text-indigo-600 mb-4" />
        <p className="text-muted-foreground">
          {verifying ? 'Verifying payment status, please wait...' : 'Loading booking details...'}
        </p>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="container mx-auto max-w-lg px-4 py-8 text-center text-muted-foreground">
        <p className="text-lg font-medium mb-2">Booking not found</p>
        <Button variant="outline" onClick={() => navigate('/seeker/bookings')}>
          <ChevronLeft className="size-4 mr-1" /> Back to Bookings
        </Button>
      </div>
    )
  }

  const alreadyPaid = booking.status === 'payment_done' || booking.status === 'active' || booking.status === 'completed'

  const platformFee = booking.platform_fee ?? 200
  const serviceCharge = booking.service_charge ?? 100
  const depositAmount = booking.deposit_amount || 0
  const monthlyRent = booking.monthly_rent || 0
  const totalPayable = depositAmount + (includeRent ? monthlyRent : 0) + platformFee + serviceCharge

  return (
    <div className="container mx-auto max-w-lg px-4 py-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/seeker/bookings')} className="mb-4 -ml-2">
        <ChevronLeft className="size-4 mr-1" /> Back to Bookings
      </Button>

      <h1 className="scroll-m-20 text-2xl font-bold tracking-tight mb-6">Complete Payment</h1>

      {/* Booking Summary */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Booking Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <div className="font-semibold">{booking.pg?.name}</div>
            <div className="text-sm text-muted-foreground">
              {booking.pg?.locality}, {booking.pg?.city}
            </div>
          </div>

          {booking.bed && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Room / Bed</span>
              <span className="font-medium">Room {booking.bed.room_number} — {booking.bed.bed_label}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Move-in Date</span>
            <span className="font-medium">
              {new Date(booking.move_in_date).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Option Selector */}
      {!alreadyPaid && (
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Select Payment Plan</CardTitle>
            <CardDescription>Choose how much you want to pay upfront.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="grid grid-cols-1 gap-3">
              <div
                onClick={() => setIncludeRent(false)}
                className={`p-3 border rounded-xl cursor-pointer transition ${
                  !includeRent
                    ? 'border-indigo-600 bg-indigo-50/20 dark:bg-indigo-950/10'
                    : 'hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={!includeRent}
                      onChange={() => setIncludeRent(false)}
                      className="accent-indigo-600"
                    />
                    <span className="font-semibold text-sm">Security Deposit (Advance) Only</span>
                  </div>
                  <span className="text-sm font-bold flex items-center">
                    <IndianRupee className="size-3" />
                    {(depositAmount + platformFee + serviceCharge).toLocaleString('en-IN')}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 ml-5">
                  Pay only the advance amount along with platform fees. Rent will be due on move-in.
                </p>
              </div>

              <div
                onClick={() => setIncludeRent(true)}
                className={`p-3 border rounded-xl cursor-pointer transition ${
                  includeRent
                    ? 'border-indigo-600 bg-indigo-50/20 dark:bg-indigo-950/10'
                    : 'hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={includeRent}
                      onChange={() => setIncludeRent(true)}
                      className="accent-indigo-600"
                    />
                    <span className="font-semibold text-sm">Security Deposit + 1 Month Rent</span>
                  </div>
                  <span className="text-sm font-bold flex items-center">
                    <IndianRupee className="size-3" />
                    {(depositAmount + monthlyRent + platformFee + serviceCharge).toLocaleString('en-IN')}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 ml-5">
                  Secure your bed and pay your first month's rent upfront to save time on move-in.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bill Breakdown */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Bill Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Security Deposit (Advance)</span>
              <span className="font-medium flex items-center">
                <IndianRupee className="size-3" />{depositAmount.toLocaleString('en-IN')}
              </span>
            </div>

            {includeRent && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">First Month's Rent</span>
                <span className="font-medium flex items-center">
                  <IndianRupee className="size-3" />{monthlyRent.toLocaleString('en-IN')}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Platform Fee</span>
              <span className="font-medium flex items-center">
                <IndianRupee className="size-3" />{platformFee.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Service Charge</span>
              <span className="font-medium flex items-center">
                <IndianRupee className="size-3" />{serviceCharge.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <Separator />

          {/* Total payable now */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Total Payable Now</span>
            <span className="text-2xl font-bold flex items-center">
              <IndianRupee className="size-5" />{totalPayable.toLocaleString('en-IN')}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Platform trust note */}
      <div className="rounded-xl bg-muted p-4 mb-4 flex items-start gap-3">
        <Shield className="size-5 text-green-600 shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-0.5">Secured by PGFindR</p>
          <p>
            Your payment is held securely by the platform. The owner receives payout
            only after your move-in is confirmed.
          </p>
        </div>
      </div>

      {/* Pay button or status */}
      {alreadyPaid ? (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-900">
          <CardContent className="pt-4 flex items-center gap-3">
            <CheckCircle2 className="size-6 text-green-600 dark:text-green-400" />
            <div>
              <div className="font-semibold text-sm">Payment Already Completed</div>
              <div className="text-xs text-muted-foreground">
                Your booking is {booking.status === 'active' ? 'active' : 'confirmed'}.
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            size="lg"
            onClick={handleDemoPayment}
            disabled={initiating}
          >
            {initiating ? (
              <Loader2 className="size-4 animate-spin mr-2" />
            ) : (
              <CheckCircle2 className="size-4 mr-1.5" />
            )}
            {initiating ? 'Processing...' : `Pay ₹${totalPayable.toLocaleString('en-IN')} (Demo / Test Mode)`}
          </Button>

          <Button
            className="w-full"
            variant="outline"
            size="lg"
            onClick={handlePayment}
            disabled={initiating || !scriptLoaded}
          >
            {initiating ? (
              <Loader2 className="size-4 animate-spin mr-2" />
            ) : (
              <IndianRupee className="size-4 mr-1.5" />
            )}
            {!scriptLoaded ? 'Loading Cashfree...' : 'Pay via Cashfree Gateway'}
          </Button>
        </div>
      )}

      <Button variant="ghost" size="sm" onClick={() => navigate('/seeker/bookings')} className="w-full mt-3">
        <Home className="size-4 mr-1.5" /> Back to Bookings
      </Button>
    </div>
  )
}
