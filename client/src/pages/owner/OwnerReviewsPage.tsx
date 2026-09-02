import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Star } from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

export function OwnerReviewsPage() {
  const { session } = useAuth()

  const { data: reviewsData, isLoading } = useQuery({
    queryKey: ['owner-reviews'],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://swiftpg-backend.onrender.com'}/api/owner/reviews`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      })
      if (!res.ok) throw new Error('Failed to fetch reviews')
      return res.json()
    }
  })

  if (isLoading) return <div>Loading reviews...</div>

  const reviews = reviewsData?.data || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reviews Dashboard</h1>
        <p className="text-muted-foreground">Manage the reviews left by seekers on your properties.</p>
      </div>

      {reviews.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <Star className="size-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">No reviews yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reviews.map((review: any) => (
            <Card key={review.id} className="flex flex-col justify-between">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{review.pg?.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      By {review.reviewer?.full_name || 'Anonymous'} • {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-0.5 mb-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star 
                      key={star} 
                      className={cn('size-4', star <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30')} 
                    />
                  ))}
                </div>
                <p className="text-sm leading-relaxed">"{review.comment}"</p>

              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
