-- Ensure shopping_lists table has the correct columns
ALTER TABLE shopping_lists ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE shopping_lists ADD COLUMN IF NOT EXISTS total_estimated NUMERIC DEFAULT 0;
ALTER TABLE shopping_lists ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Ensure transactions table has the correct columns
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS amount NUMERIC;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS shift_id BIGINT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload config';
