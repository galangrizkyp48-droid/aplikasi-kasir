-- Add shift_id to expenses table
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS shift_id BIGINT;

-- Reload Schema
NOTIFY pgrst, 'reload config';
