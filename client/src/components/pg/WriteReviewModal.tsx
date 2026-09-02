import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Star } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import { useMutation } from '@tanstack/react-query'

interface WriteReviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pgId: string
  onSuccess?: () => void
}

export function WriteReviewModal({ open, onOpenChange, pgId, onSuccess }: WriteReviewModalProps) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')
  const { session } = useAuth()

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!rating) throw new Error('Please select a rating')
      if (!comment.trim()) throw new Error('Please write a review comment')
      
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://swiftpg-backend.onrender.com'}/api/seeker/reviews/${pgId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ rating, comment })
      })
      
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit review')
      return data
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Review submitted successfully.')
      setRating(0)
      setComment('')
      onOpenChange(false)
      if (onSuccess) onSuccess()
    },
    onError: (err: any) => {
      toast.error(err.message)
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Write a Review</DialogTitle>
          <DialogDescription>
            Share your experience with others. Your review will be visible to everyone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Rating</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  onMouseEnter={() => setHoverRating(value)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="focus:outline-none transition-transform hover:scale-110"
                >
                  <Star 
                    className={`size-8 ${(hoverRating || rating) >= value ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Review Comment</label>
            <Textarea 
              placeholder="Write your honest feedback here..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitMutation.isPending}>
            Cancel
          </Button>
          <Button 
            onClick={() => submitMutation.mutate()} 
            disabled={submitMutation.isPending || !rating || !comment.trim()}
          >
            {submitMutation.isPending ? 'Submitting...' : 'Submit Review'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
