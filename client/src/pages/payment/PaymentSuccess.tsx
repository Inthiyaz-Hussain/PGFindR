import { useParams, useNavigate } from 'react-router-dom'
import { CheckCircle2, ClipboardList, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export function PaymentSuccess() {
  const { id: bookingId } = useParams<{ id: string }>()
  const navigate = useNavigate()

  return (
    <div className="container mx-auto max-w-lg px-4 py-12">
      <Card className="text-center">
        <CardContent className="pt-8 pb-8 space-y-6">
          <div className="flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-950">
              <CheckCircle2 className="size-10 text-green-600 dark:text-green-400" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="scroll-m-20 text-2xl font-bold tracking-tight">
              Payment Successful!
            </h1>
            <p className="text-muted-foreground text-sm">
              Your booking is confirmed. The PG owner will contact you to arrange your move-in.
            </p>
          </div>

          <div className="rounded-lg bg-muted p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Booking ID
            </div>
            <div className="font-mono text-lg font-semibold">{bookingId}</div>
          </div>

          <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            Your payment is held securely by PGFindR. The owner receives payout
            only after your move-in is confirmed.
          </div>

          <div className="flex flex-col gap-3">
            <Button onClick={() => navigate('/seeker/bookings')} className="w-full">
              <ClipboardList className="size-4 mr-1.5" />
              View My Bookings
            </Button>
            <Button variant="outline" onClick={() => navigate('/')} className="w-full">
              <Home className="size-4 mr-1.5" />
              Back to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
