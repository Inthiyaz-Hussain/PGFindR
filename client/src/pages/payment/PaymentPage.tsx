import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, Shield, CheckCircle2, Loader2, Home, IndianRupee } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

declare global {
  interface Window {
    Razorpay: any
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
}

const RAZORPAY_SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js'

export function PaymentPage() {
  const { id: bookingId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [initiating, setInitiating] = useState(false)
  const [scriptLoaded, setScriptLoaded] = useState(false)

  // Load Razorpay checkout script
  useEffect(() => {
    if (document.getElementById('razorpay-script')) {
      setScriptLoaded(true)
      return
    }
    const script = document.createElement('script')
    script.id = 'razorpay-script'
    script.src = RAZORPAY_SCRIPT
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

  const handlePayment = useCallback(async () => {
    if (!booking || !user || !scriptLoaded) return

    setInitiating(true)

    try {
      // Step 1: Initiate payment — create Razorpay order on backend
      const initiateRes = await fetch(`${import.meta.env.VITE_API_URL || 'https://swiftpg-backend.onrender.com'}/api/payment/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: booking.id }),
      })

      if (!initiateRes.ok) {
        const err = await initiateRes.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to initiate payment')
      }

      const order = await initiateRes.json()

      // Step 2: Open Razorpay checkout
      const options = {
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        order_id: order.razorpay_order_id,
        name: 'PGFindR',
        description: `Booking: ${booking.pg?.name || 'PG'}`,
        image: '/vite.svg',
        prefill: {
          name: booking.seeker?.full_name || user?.email || '',
          email: user?.email || '',
        },
        theme: {
          color: '#0f172a',
        },
        handler: async (response: any) => {
          // Step 3: Verify payment on backend
          try {
            const verifyRes = await fetch(`${import.meta.env.VITE_API_URL || 'https://swiftpg-backend.onrender.com'}/api/payment/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                booking_id: booking.id,
              }),
            })

            if (!verifyRes.ok) {
              const err = await verifyRes.json().catch(() => ({}))
              navigate(`/payment/failed/${booking.id}`, { state: { error: err.error } })
              return
            }

            navigate(`/payment/success/${booking.id}`)
          } catch {
            navigate(`/payment/failed/${booking.id}`, { state: { error: 'Payment verification failed' } })
          }
        },
        modal: {
          ondismiss: () => {
            setInitiating(false)
            toast.info('Payment cancelled. You can retry anytime.')
          },
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', (response: any) => {
        const errMsg = response.error?.description || 'Payment failed'
        navigate(`/payment/failed/${booking.id}`, { state: { error: errMsg } })
      })
      rzp.open()
    } catch (err) {
      toast.error((err as Error).message)
      setInitiating(false)
    }
  }, [booking, user, scriptLoaded, navigate])

  const handleDemoPayment = useCallback(async () => {
    if (!booking || !user) return

    setInitiating(true)

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://swiftpg-backend.onrender.com'}/api/payment/demo-confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: booking.id }),
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
  }, [booking, user, navigate])

if (isLoading) {
  return (
    <div className="container mx-auto max-w-lg px-4 py-6">
      <Skeleton className="h-8 w-32 mb-4" />
      <Skeleton className="h-48 w-full rounded-xl" />
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

        <Separator />

        {/* Price breakdown */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Monthly Rent</span>
            <span className="font-medium flex items-center">
              <IndianRupee className="size-3" />{booking.monthly_rent.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Security Deposit</span>
            <span className="font-medium flex items-center">
              <IndianRupee className="size-3" />{booking.deposit_amount.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        <Separator />

        {/* Total payable now */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Total Payable Now</span>
          <span className="text-2xl font-bold flex items-center">
            <IndianRupee className="size-5" />{booking.amount.toLocaleString('en-IN')}
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
          only after your move-in is confirmed. Commission: {booking.commission_pct}%.
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
          {initiating ? 'Processing...' : `Pay ₹${booking.amount.toLocaleString('en-IN')} (Demo / Test Mode)`}
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
          {!scriptLoaded ? 'Loading Razorpay...' : 'Pay via Razorpay Gateway'}
        </Button>
      </div>
    )}

    <Button variant="ghost" size="sm" onClick={() => navigate('/seeker/bookings')} className="w-full mt-3">
      <Home className="size-4 mr-1.5" /> Back to Bookings
    </Button>
  </div>
)
}
