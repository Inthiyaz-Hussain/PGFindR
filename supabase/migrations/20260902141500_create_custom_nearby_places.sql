-- Create custom_nearby_places table
CREATE TABLE IF NOT EXISTS public.custom_nearby_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pg_id UUID REFERENCES public.pg_listings(id) ON DELETE CASCADE NOT NULL,
  label VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.custom_nearby_places ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Public can read custom_nearby_places" ON public.custom_nearby_places FOR SELECT USING (true);

-- Allow PG owners to manage their custom nearby places
CREATE POLICY "Owners can manage custom_nearby_places" ON public.custom_nearby_places 
FOR ALL TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.pg_listings 
    WHERE public.pg_listings.id = custom_nearby_places.pg_id 
    AND public.pg_listings.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.pg_listings 
    WHERE public.pg_listings.id = custom_nearby_places.pg_id 
    AND public.pg_listings.owner_id = auth.uid()
  )
);

-- Optional: Add to realtime publication if needed
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.custom_nearby_places;
