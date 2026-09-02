-- Add status to reviews table
ALTER TABLE public.reviews
ADD COLUMN status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));

-- Index for querying by status
CREATE INDEX idx_reviews_status ON public.reviews(status);
