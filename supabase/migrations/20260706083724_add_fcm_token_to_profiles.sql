-- Add FCM token column to profiles table
ALTER TABLE profiles ADD COLUMN fcm_token text NULL;

-- Create index for quick token lookups
CREATE INDEX idx_profiles_fcm_token ON profiles(fcm_token) WHERE fcm_token IS NOT NULL;

-- Comment
COMMENT ON COLUMN profiles.fcm_token IS 'Firebase Cloud Messaging token for push notifications';