-- Add activated_at column to usuarios_pms table
-- This field tracks when a user actually completed their account setup (set their password)
-- Unlike email_confirmed_at (which Supabase sets when invite link is clicked),
-- this field is only set when the user successfully submits their password

ALTER TABLE usuarios_pms
ADD COLUMN activated_at TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN usuarios_pms.activated_at IS 'Timestamp when user completed account activation by setting their password. NULL means account setup is pending.';

-- Backfill: For existing users who already have email_confirmed_at set in auth.users,
-- we assume they completed setup. This is a one-time migration for existing data.
-- New users will have this set explicitly when they complete password setup.
UPDATE usuarios_pms u
SET activated_at = au.email_confirmed_at
FROM auth.users au
WHERE u.id = au.id
AND au.email_confirmed_at IS NOT NULL;
