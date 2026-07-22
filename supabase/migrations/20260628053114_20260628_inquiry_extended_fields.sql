/*
# Extend inquiries table for full inquiry submission flow

1. Modified Tables
- `inquiries`: Adds fields for the complete inquiry submission form:
  - `age` (integer, 18-60)
  - `occupation` (text: Student / Working Professional / Other)
  - `city_of_origin` (text)
  - `duration_value` (integer)
  - `duration_unit` (text: days / months)
  - `sharing_preference` (integer: 1, 2, 3, 4)
  - `mobile` (text, 10 digits)
  - `full_name` (text, pre-filled from profile)

2. Security
- No new RLS needed — existing policies cover the table.
*/

ALTER TABLE inquiries
  ADD COLUMN IF NOT EXISTS age INTEGER CHECK (age >= 18 AND age <= 60),
  ADD COLUMN IF NOT EXISTS occupation TEXT CHECK (occupation IN ('Student', 'Working Professional', 'Other')),
  ADD COLUMN IF NOT EXISTS city_of_origin TEXT,
  ADD COLUMN IF NOT EXISTS duration_value INTEGER,
  ADD COLUMN IF NOT EXISTS duration_unit TEXT CHECK (duration_unit IN ('days', 'months')),
  ADD COLUMN IF NOT EXISTS sharing_preference INTEGER CHECK (sharing_preference IN (1, 2, 3, 4)),
  ADD COLUMN IF NOT EXISTS mobile TEXT,
  ADD COLUMN IF NOT EXISTS full_name TEXT;
