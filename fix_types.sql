-- FIX ID TYPES to support string-based IDs from Application Code

-- 1. Shifts Table
-- cashier_id should be TEXT (because user.id might be 'admin' or UUID)
ALTER TABLE shifts ALTER COLUMN cashier_id TYPE TEXT; 

-- 2. Orders Table
-- customer_name is already TEXT
-- shift_id is BIGINT (matches shifts.id)
-- store_id is TEXT (matches user.storeId)

-- 3. Transactions Table
-- payment_method is TEXT
-- shift_id is BIGINT (matches shifts.id)

-- 4. Users Table (Just to be safe)
ALTER TABLE users ALTER COLUMN id TYPE UUID USING (uuid_generate_v4());
-- If you are using simple string IDs like 'admin', allow TEXT as primary key if needed (but UUID is better)
-- But the error was specifically about "admin" being put into a bigint column.

-- The error "invalid input syntax for type bigint: "admin"" 
-- suggests that somewhere 'admin' is being treated as a Foreign Key to a BigInt column OR inserted into a BigInt column.

-- If users.id is UUID, but you are inserting 'admin', that fails validation for UUID too, but the error said "bigint".
-- If you manually created users with ID 'admin', then users.id must be TEXT.

-- Let's assume you want to allow TEXT IDs for everything to be safe and flexible.

-- WARNING: Changing Primary Keys is hard if they are referenced.
-- Let's focus on the likely culprit: 
-- Did you try to insert 'admin' into 'cashier_id' (which is TEXT in my schema)? -> Should be fine.
-- Did you try to insert 'admin' into 'shift_id' (BIGINT)? -> Fails.
-- Did you try to insert 'admin' into 'id' of users table (UUID)? -> Fails.

-- CRITICAL FIX: Ensure 'users.id' is TEXT to support legacy/manual IDs like 'admin'
ALTER TABLE users ALTER COLUMN id TYPE TEXT;

-- Reload Schema Cache
NOTIFY pgrst, 'reload config';
