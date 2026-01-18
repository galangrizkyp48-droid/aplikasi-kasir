-- Create system_announcements table
CREATE TABLE IF NOT EXISTS public.system_announcements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info' CHECK (type IN ('info', 'warning', 'critical')),
    is_active BOOLEAN DEFAULT true,
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.system_announcements ENABLE ROW LEVEL SECURITY;

-- Policies
-- Everyone can read active announcements
CREATE POLICY "Everyone can read active announcements" 
ON public.system_announcements FOR SELECT 
USING (is_active = true);

-- Only super admins can insert/update/delete (You might need to adjust this depending on how you handle super admins in RLS)
-- For now, allowing authenticated users to insert if they are admins (checked in frontend, but ideally enforced here too)

-- Allow full access to authenticated users for now to unblock (Production should be stricter)
CREATE POLICY "Authenticated users can manage announcements" 
ON public.system_announcements FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);
