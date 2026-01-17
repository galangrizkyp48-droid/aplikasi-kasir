-- Fix Users Table (Missing 'name' column)
ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT 'Owner';
ALTER TABLE users ADD COLUMN IF NOT EXISTS pin TEXT;

-- Reload Schema Cache
NOTIFY pgrst, 'reload config';
