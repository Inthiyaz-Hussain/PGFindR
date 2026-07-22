// ReviewsList
import { Star, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { Review } from '@/types'

interface ReviewsListProps {
  reviews: Review[]
  total: number
  isLoading: boolean
  onLoadMore: () => void
  hasMore: boolean
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={
            i < rating
              ? 'size-3.5 fill-amber-400 text-amber-400'
              : 'size-3.5 text-muted-foreground/30'
          }
        />
      ))}
    </div>
  )
}

function anonymizeName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 0) return 'Anonymous'
  return parts[0]
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function ReviewsList({ reviews, total, isLoading, onLoadMore, hasMore }: ReviewsListProps) {
  if (isLoading && reviews.length === 0) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        ))}
      </div>
    )
  }

  if (reviews.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-4">
        No reviews yet. Be the first to review this PG!
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <div key={review.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {(review.reviewer?.full_name || 'A').charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-sm font-medium">
                  {anonymizeName(review.reviewer?.full_name || 'Anonymous')}
                </div>
                <div className="text-xs text-muted-foreground">{formatDate(review.created_at)}</div>
              </div>
            </div>
            <StarRating rating={review.rating} />
          </div>
          {review.comment && (
            <p className="text-sm text-muted-foreground leading-relaxed">{review.comment}</p>
          )}
        </div>
      ))}

      {hasMore && (
        <Button variant="ghost" size="sm" onClick={onLoadMore} disabled={isLoading} className="w-full">
          {isLoading ? (
            <Skeleton className="h-4 w-24 mx-auto" />
          ) : (
            <>
              <ChevronDown className="size-4 mr-1" />
              Load more reviews ({reviews.length} of {total})
            </>
          )}
        </Button>
      )}
    </div>
  )
}
