-- Migration to rename Razorpay columns to Cashfree columns

-- Update payments table
ALTER TABLE payments RENAME COLUMN razorpay_order_id TO cashfree_order_id;
ALTER TABLE payments RENAME COLUMN razorpay_payment_id TO cashfree_payment_id;
ALTER TABLE payments RENAME COLUMN razorpay_payout_id TO cashfree_payout_id;

-- Update bookings table
ALTER TABLE bookings RENAME COLUMN razorpay_payout_id TO cashfree_payout_id;
