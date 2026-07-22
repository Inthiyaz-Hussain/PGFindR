import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { XCircle, RotateCcw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export function PaymentFailed() {
  const { id: bookingId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const errorMsg = (location.state as { error?: string })?.error

  return (
    <div className="container mx-auto max-w-lg px-4 py-12">
      <Card className="text-center">
        <CardContent className="pt-8 pb-8 space-y-6">
          <div className="flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-950">
              <XCircle className="size-10 text-red-600 dark:text-red-400" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="scroll-m-20 text-2xl font-bold tracking-tight">
              Payment Failed
            </h1>
            <p className="text-muted-foreground text-sm">
              {errorMsg || 'Your payment could not be processed. Please try again.'}
            </p>
          </div>

          <div className="rounded-lg bg-muted p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Booking ID
            </div>
            <div className="font-mono text-lg font-semibold">{bookingId}</div>
          </div>

          <div className="flex flex-col gap-3">
            <Button onClick={() => navigate(`/payment/${bookingId}`)} className="w-full">
              <RotateCcw className="size-4 mr-1.5" />
              Try Again
            </Button>
            <Button variant="outline" onClick={() => navigate('/seeker/bookings')} className="w-full">
              <Home className="size-4 mr-1.5" />
              Back to Bookings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
