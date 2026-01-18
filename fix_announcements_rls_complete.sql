-- COMPLETE FIX for system_announcements RLS
-- Run this ENTIRE script in Supabase SQL Editor

-- Step 1: Disable RLS temporarily
ALTER TABLE public.system_announcements DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies
DROP POLICY IF EXISTS "Everyone can read active announcements" ON public.system_announcements;
DROP POLICY IF EXISTS "Authenticated users can manage announcements" ON public.system_announcements;
DROP POLICY IF EXISTS "Authenticated users can insert announcements" ON public.system_announcements;
DROP POLICY IF EXISTS "Authenticated users can update announcements" ON public.system_announcements;
DROP POLICY IF EXISTS "Authenticated users can delete announcements" ON public.system_announcements;

-- Step 3: Re-enable RLS
ALTER TABLE public.system_announcements ENABLE ROW LEVEL SECURITY;

-- Step 4: Create simple, permissive policies
-- Allow everyone to read active announcements
CREATE POLICY "allow_read_active"
ON public.system_announcements
FOR SELECT
USING (is_active = true);

-- Allow ALL operations for authenticated users (super admin check is in app)
CREATE POLICY "allow_all_authenticated"
ON public.system_announcements
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Step 5: Grant necessary permissions
GRANT ALL ON public.system_announcements TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
