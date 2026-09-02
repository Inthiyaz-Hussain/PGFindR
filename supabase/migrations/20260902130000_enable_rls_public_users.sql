-- Enable Row-Level Security on the public.users table
-- This resolves the "Table publicly accessible" warning from Supabase.
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;

-- Optional: If you need authenticated users to be able to read their own data,
-- you can uncomment the policy below, assuming the table has an 'id' column
-- that matches the auth.users id.
-- CREATE POLICY "Users can read their own data" ON public.users
--     FOR SELECT TO authenticated USING (auth.uid() = id);

-- If you are not using public.users and only use auth.users, this empty RLS
-- effectively denies all access, which is the most secure posture.
