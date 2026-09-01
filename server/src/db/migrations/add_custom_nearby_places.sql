CREATE TABLE IF NOT EXISTS public.custom_nearby_places (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pg_id UUID REFERENCES public.pg_listings(id) ON DELETE CASCADE,
  label VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.custom_nearby_places ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "Enable read access for all users" ON public.custom_nearby_places
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.custom_nearby_places
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for users based on user_id" ON public.custom_nearby_places
    FOR UPDATE USING (auth.uid() IN (SELECT owner_id FROM public.pg_listings WHERE id = pg_id));

CREATE POLICY "Enable delete for users based on user_id" ON public.custom_nearby_places
    FOR DELETE USING (auth.uid() IN (SELECT owner_id FROM public.pg_listings WHERE id = pg_id));
