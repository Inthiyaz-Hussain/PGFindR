-- Run this in your Supabase SQL Editor

-- Add room_id column to inquiries table
ALTER TABLE inquiries 
ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES rooms(id) ON DELETE SET NULL;

-- Create an index to speed up lookups
CREATE INDEX IF NOT EXISTS idx_inquiries_room_id ON inquiries(room_id);
