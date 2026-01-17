-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Fix ID Default Value in Users Table
ALTER TABLE users ALTER COLUMN id SET DEFAULT uuid_generate_v4();

-- 3. Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable read access for all users" ON users;
DROP POLICY IF EXISTS "Enable insert for registration" ON users;
DROP POLICY IF EXISTS "Enable update for users based on id" ON users;

-- 5. Create Permissive Policies (Since custom auth is used)
-- Allow anyone to read users (needed for Login to check username/password)
-- Note: In a real production app with Supabase Auth, you'd restrict this. 
-- But since we manage auth manually in 'users' table, we need public read to validate credentials.
CREATE POLICY "Public Read Access" 
ON users FOR SELECT 
USING (true);

-- Allow anyone to insert (Register)
CREATE POLICY "Public Insert Access" 
ON users FOR INSERT 
WITH CHECK (true);

-- Allow users to update their own data (optional, good practice)
CREATE POLICY "Self Update Access" 
ON users FOR UPDATE 
USING (auth.uid() = id);

-- Reload Schema Cache
NOTIFY pgrst, 'reload config';
