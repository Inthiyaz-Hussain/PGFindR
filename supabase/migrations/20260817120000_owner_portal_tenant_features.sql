-- Migration: Owner Portal & Tenant Features Schema
-- 1. Stored function for safe, race-condition-free bed reservation
CREATE OR REPLACE FUNCTION public.reserve_bed_safely(p_bed_id UUID, p_pg_id UUID, p_num_beds INT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_bed_status TEXT;
  v_bed_ids UUID[];
BEGIN
  -- 1. Lock the primary bed and check status
  SELECT status INTO v_bed_status
  FROM public.beds
  WHERE id = p_bed_id
  FOR UPDATE;

  IF v_bed_status IS DISTINCT FROM 'available' THEN
    RETURN FALSE;
  END IF;

  -- 2. If num_beds > 1, lock and select other available beds in the PG
  IF p_num_beds > 1 THEN
    SELECT ARRAY(
      SELECT id 
      FROM public.beds 
      WHERE pg_id = p_pg_id AND status = 'available' AND id <> p_bed_id
      LIMIT (p_num_beds - 1)
      FOR UPDATE
    ) INTO v_bed_ids;

    IF COALESCE(array_length(v_bed_ids, 1), 0) < (p_num_beds - 1) THEN
      RETURN FALSE;
    END IF;

    v_bed_ids := array_append(v_bed_ids, p_bed_id);
  ELSE
    v_bed_ids := ARRAY[p_bed_id];
  END IF;

  -- 3. Mark beds as reserved
  UPDATE public.beds
  SET status = 'reserved', updated_at = NOW()
  WHERE id = ANY(v_bed_ids);

  RETURN TRUE;
END;
$$;

-- 2. Create invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  seeker_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  invoice_number TEXT UNIQUE NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'cancelled')),
  due_date DATE NOT NULL,
  billing_period_start DATE,
  billing_period_end DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on invoices
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- 3. Create tenant_documents table
CREATE TABLE IF NOT EXISTS public.tenant_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  seeker_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  doc_type TEXT NOT NULL DEFAULT 'id_proof' CHECK (doc_type IN ('id_proof', 'address_proof')),
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on tenant_documents
ALTER TABLE public.tenant_documents ENABLE ROW LEVEL SECURITY;

-- 4. Invoices RLS Policies
DROP POLICY IF EXISTS "Select invoices for admin" ON public.invoices;
CREATE POLICY "Select invoices for admin" ON public.invoices FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Select own invoices as seeker" ON public.invoices;
CREATE POLICY "Select own invoices as seeker" ON public.invoices FOR SELECT TO authenticated USING (seeker_id = auth.uid());

DROP POLICY IF EXISTS "Invoices access for owner" ON public.invoices;
CREATE POLICY "Invoices access for owner" ON public.invoices FOR ALL TO authenticated 
USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- 5. Tenant Documents RLS Policies
DROP POLICY IF EXISTS "Tenant documents access for admin" ON public.tenant_documents;
CREATE POLICY "Tenant documents access for admin" ON public.tenant_documents FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Tenant documents access for seeker" ON public.tenant_documents;
CREATE POLICY "Tenant documents access for seeker" ON public.tenant_documents FOR ALL TO authenticated 
USING (seeker_id = auth.uid()) WITH CHECK (seeker_id = auth.uid());

DROP POLICY IF EXISTS "Tenant documents access for owner" ON public.tenant_documents;
CREATE POLICY "Tenant documents access for owner" ON public.tenant_documents FOR ALL TO authenticated 
USING (EXISTS (
  SELECT 1 FROM public.bookings b 
  WHERE b.id = booking_id AND b.owner_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.bookings b 
  WHERE b.id = booking_id AND b.owner_id = auth.uid()
));

-- 6. Add real-time replication for invoices and tenant_documents
ALTER PUBLICATION supabase_realtime ADD TABLE public.invoices;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tenant_documents;
