-- Add missing 'tax' column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax NUMERIC DEFAULT 0;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload config';
