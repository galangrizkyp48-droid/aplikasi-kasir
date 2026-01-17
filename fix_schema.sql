-- Fix missing columns in shifts table
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS start_cash NUMERIC DEFAULT 0;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS end_cash NUMERIC DEFAULT 0;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS total_sales NUMERIC DEFAULT 0;

-- Ensure other tables have necessary columns (Just in case)
ALTER TABLE shopping_items ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'pcs';
ALTER TABLE shopping_lists ADD COLUMN IF NOT EXISTS total_estimated NUMERIC DEFAULT 0;

-- Force schema cache reload
NOTIFY pgrst, 'reload config';
