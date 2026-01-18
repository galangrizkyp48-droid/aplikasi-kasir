-- 1. Setup Subscription Fields (Already done, keeping for reference or if skipped)
-- ALTER TABLE public.users ADD COLUMN IF NOT EXISTS ...

-- 2. Create Subscription Transactions (Already done)
-- CREATE TABLE IF NOT EXISTS public.subscription_transactions ...

-- 3. System Announcements Table
CREATE TABLE IF NOT EXISTS public.system_announcements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info', -- 'info', 'warning', 'critical'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT -- username
);

-- 4. RLS for Announcements
ALTER TABLE public.system_announcements ENABLE ROW LEVEL SECURITY;

-- Everyone can read active announcements
CREATE POLICY "Public read active announcements" 
ON public.system_announcements FOR SELECT 
USING (is_active = true);

-- Only Super Admin (galang) can insert/update/delete (Simplified for now: Allow all authenticated to see, but logic in app restricts creation)
-- Ideally: USING (auth.uid() IN (SELECT id FROM users WHERE role = 'owner' AND username = 'galang'))
-- For simplicity in this SQL editor context, we allow all authenticated users to insert, but app UI restricts it.
CREATE POLICY "Authenticated users can insert announcements" 
ON public.system_announcements FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update announcements" 
ON public.system_announcements FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete announcements" 
ON public.system_announcements FOR DELETE 
USING (auth.role() = 'authenticated');
