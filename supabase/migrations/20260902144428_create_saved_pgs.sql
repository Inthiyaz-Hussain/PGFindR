-- Create saved_pgs table
CREATE TABLE IF NOT EXISTS public.saved_pgs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  pg_id UUID REFERENCES public.pg_listings(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, pg_id)
);

-- Enable RLS
ALTER TABLE public.saved_pgs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own saved PGs
CREATE POLICY "Users can view own saved_pgs" ON public.saved_pgs 
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own saved PGs
CREATE POLICY "Users can insert own saved_pgs" ON public.saved_pgs 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own saved PGs
CREATE POLICY "Users can delete own saved_pgs" ON public.saved_pgs 
  FOR DELETE USING (auth.uid() = user_id);
