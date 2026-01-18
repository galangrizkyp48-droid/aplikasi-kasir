-- Fix RLS Policy for system_announcements
-- Run this in Supabase SQL Editor

-- Drop existing policies
DROP POLICY IF EXISTS "Everyone can read active announcements" ON public.system_announcements;
DROP POLICY IF EXISTS "Authenticated users can manage announcements" ON public.system_announcements;

-- Recreate policies with correct permissions
-- 1. Everyone can read active announcements
CREATE POLICY "Everyone can read active announcements"
ON public.system_announcements
FOR SELECT
USING (is_active = true);

-- 2. Allow INSERT for authenticated users (Super Admin check happens in app logic)
CREATE POLICY "Authenticated users can insert announcements"
ON public.system_announcements
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 3. Allow UPDATE for authenticated users
CREATE POLICY "Authenticated users can update announcements"
ON public.system_announcements
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 4. Allow DELETE for authenticated users
CREATE POLICY "Authenticated users can delete announcements"
ON public.system_announcements
FOR DELETE
TO authenticated
USING (true);
