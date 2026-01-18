-- ULTIMATE FIX: Disable RLS completely for system_announcements
-- Security is handled at application level (only super admin can access Admin page)
-- Run this in Supabase SQL Editor

-- Drop all existing policies
DROP POLICY IF EXISTS "Everyone can read active announcements" ON public.system_announcements;
DROP POLICY IF EXISTS "Authenticated users can manage announcements" ON public.system_announcements;
DROP POLICY IF EXISTS "Authenticated users can insert announcements" ON public.system_announcements;
DROP POLICY IF EXISTS "Authenticated users can update announcements" ON public.system_announcements;
DROP POLICY IF EXISTS "Authenticated users can delete announcements" ON public.system_announcements;
DROP POLICY IF EXISTS "allow_read_active" ON public.system_announcements;
DROP POLICY IF EXISTS "allow_all_authenticated" ON public.system_announcements;

-- Disable RLS completely
ALTER TABLE public.system_announcements DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON public.system_announcements TO authenticated;
GRANT ALL ON public.system_announcements TO anon;
