-- Create buckets if they don't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('pg-images', 'pg-images', true), 
       ('owner-documents', 'owner-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for pg-images
CREATE POLICY "Public Access for pg-images"
ON storage.objects FOR SELECT
USING ( bucket_id = 'pg-images' );

CREATE POLICY "Allow authenticated uploads to pg-images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'pg-images' );

CREATE POLICY "Allow authenticated updates to pg-images"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'pg-images' );

CREATE POLICY "Allow authenticated deletes to pg-images"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'pg-images' );

-- Policies for owner-documents
CREATE POLICY "Public Access for owner-documents"
ON storage.objects FOR SELECT
USING ( bucket_id = 'owner-documents' );

CREATE POLICY "Allow authenticated uploads to owner-documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'owner-documents' );

CREATE POLICY "Allow authenticated updates to owner-documents"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'owner-documents' );

CREATE POLICY "Allow authenticated deletes to owner-documents"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'owner-documents' );
