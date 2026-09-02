import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Star, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

export function OwnerReviewsPage() {
  const { session } = useAuth()
  const queryClient = useQueryClient()

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

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: 'approved' | 'rejected' }) => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://swiftpg-backend.onrender.com'}/api/owner/reviews/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ status })
      })
      if (!res.ok) throw new Error('Failed to update review status')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-reviews'] })
      toast.success('Review status updated')
    },
    onError: (err: any) => toast.error(err.message)
  })

  if (isLoading) return <div className="p-6 md:p-8">Loading reviews...</div>

  const reviews = reviewsData?.data || []

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
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
                  <Badge variant={review.status === 'approved' ? 'default' : review.status === 'rejected' ? 'destructive' : 'secondary'} className={cn(
                    review.status === 'approved' && 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900 dark:text-emerald-200'
                  )}>
                    {review.status ? review.status.charAt(0).toUpperCase() + review.status.slice(1) : 'Pending'}
                  </Badge>
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

                {(review.status === 'pending' || !review.status) && (
                  <div className="flex gap-2 mt-4 pt-4 border-t">
                    <Button 
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700" 
                      size="sm" 
                      onClick={() => statusMutation.mutate({ id: review.id, status: 'approved' })}
                      disabled={statusMutation.isPending}
                    >
                      <CheckCircle className="size-4 mr-2" />
                      Approve
                    </Button>
                    <Button 
                      variant="destructive" 
                      className="flex-1" 
                      size="sm" 
                      onClick={() => statusMutation.mutate({ id: review.id, status: 'rejected' })}
                      disabled={statusMutation.isPending}
                    >
                      <XCircle className="size-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
