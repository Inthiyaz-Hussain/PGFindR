-- Enable RLS policies for reviews table
CREATE POLICY "select_reviews" ON public.reviews FOR SELECT USING (true);

CREATE POLICY "insert_reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_reviews" ON public.reviews FOR UPDATE USING (
  auth.uid() = user_id 
  OR 
  auth.uid() IN (SELECT owner_id FROM public.pg_listings WHERE id = pg_id)
);

CREATE POLICY "delete_reviews" ON public.reviews FOR DELETE USING (
  auth.uid() = user_id 
  OR 
  auth.uid() IN (SELECT owner_id FROM public.pg_listings WHERE id = pg_id)
);
