/*
# Extend bookings and payments for full payment + disbursement flow

1. Modified Tables
- `bookings`: Adds columns needed by the payment flow:
  - `amount` (integer, total chargeable amount = deposit by default)
  - `commission_pct` (numeric, platform commission percentage)
  - `commission_amount` (integer, calculated commission in rupees)
  - `owner_payout` (integer, amount to disburse to owner after commission)
  - `payment_id` (uuid, FK to payments.id, set after payment verification)
  - `confirmed_at` (timestamptz, when move-in was confirmed)
  - `disbursed_at` (timestamptz, when payout to owner was initiated)
  - `razorpay_payout_id` (text, Razorpay payout reference for owner disbursement)
- `payments`: Adds disbursement tracking:
  - `razorpay_payout_id` (text, payout reference)
  - `disbursed_at` (timestamptz, when payout was initiated)

2. Security
- No new RLS needed — existing policies cover both tables.
*/

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS amount INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_pct NUMERIC(5,2) DEFAULT 10.00,
  ADD COLUMN IF NOT EXISTS commission_amount INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS owner_payout INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES payments(id),
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS disbursed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS razorpay_payout_id TEXT;

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS razorpay_payout_id TEXT,
  ADD COLUMN IF NOT EXISTS disbursed_at TIMESTAMPTZ;
