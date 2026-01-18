-- Add is_suspended column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false;

-- Policy to prevent suspended users from doing things (Optional, but good practice)
-- You might want to update your RLS policies to check for is_suspended = false
-- For example:
-- CREATE POLICY "Suspended users cannot access" ON public.some_table 
-- FOR ALL USING (auth.uid() = user_id AND (SELECT is_suspended FROM public.users WHERE id = auth.uid()) = false);
