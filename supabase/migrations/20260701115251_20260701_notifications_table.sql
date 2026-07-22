/*
# Create notifications table for payment flow + push notification storage

1. New Tables
- `notifications`: Stores in-app notifications for payment events, booking updates, and owner disbursements.
  - `id` (uuid, primary key)
  - `user_id` (uuid, nullable — null means broadcast/admin notification; references profiles)
  - `type` (text, notification category: payment_success, payment_failed, new_booking, move_in_confirmed, payout_initiated, payout_failed, refund_processed)
  - `title` (text, short notification title)
  - `body` (text, notification body/message)
  - `data` (jsonb, structured payload with booking_id, payment_id, etc.)
  - `read` (boolean, default false — whether the user has seen it)
  - `created_at` (timestamptz)

2. Security
- Enable RLS on `notifications`.
- Users can only read their own notifications (auth.uid() = user_id).
- Service role (backend) can insert/update — no INSERT/UPDATE policy needed for client.
- Users can mark their own notifications as read (update).
*/

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications"
  ON notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications"
  ON notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_notifications" ON notifications;
CREATE POLICY "delete_own_notifications"
  ON notifications FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications (user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications (created_at DESC);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
