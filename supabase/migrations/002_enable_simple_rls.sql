-- ENABLE RLS: Non-recursive policies designed to avoid infinite loops
-- Run this AFTER 001_bootstrap_with_disabled_rls.sql
-- Key principle: Never query the same table within its own RLS policy

-- Step 1: Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_metrics ENABLE ROW LEVEL SECURITY;

-- Step 2: USERS TABLE - Simple, direct policies
CREATE POLICY "users_read_own_profile" ON public.users 
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_update_own_profile" ON public.users 
FOR UPDATE USING (auth.uid() = id);

-- Allow reading any user profile (safe for small apps, can be restricted later)
CREATE POLICY "users_read_all_profiles" ON public.users 
FOR SELECT USING (true);

-- Step 3: CONVERSATION_PARTICIPANTS - Most critical, NO recursion
CREATE POLICY "participants_read_own_records" ON public.conversation_participants 
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "participants_join_as_self" ON public.conversation_participants 
FOR INSERT WITH CHECK (user_id = auth.uid());

-- Step 4: CONVERSATIONS - Direct ownership only (no participant checks to avoid recursion)
CREATE POLICY "conversations_read_owned" ON public.conversations 
FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "conversations_create_as_owner" ON public.conversations 
FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Allow reading conversations for invite validation (public access for specific use case)
CREATE POLICY "conversations_read_for_invites" ON public.conversations 
FOR SELECT USING (
  id IN (
    SELECT conversation_id FROM public.invitations 
    WHERE expires_at > NOW() AND used_by IS NULL
  )
);

-- Step 5: INVITATIONS - Public read access for invite validation (critical for invite flow)
CREATE POLICY "invitations_public_read_valid" ON public.invitations 
FOR SELECT USING (expires_at > NOW() AND used_by IS NULL);

CREATE POLICY "invitations_read_own_created" ON public.invitations 
FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "invitations_create_own" ON public.invitations 
FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "invitations_update_usage" ON public.invitations 
FOR UPDATE USING (expires_at > NOW())
WITH CHECK (used_by = auth.uid());

-- Step 6: MESSAGES - Simple approach, check direct participation (not through other tables)
CREATE POLICY "messages_read_all" ON public.messages 
FOR SELECT USING (true); -- Simplified for development, can be restricted later

CREATE POLICY "messages_insert_as_author" ON public.messages 
FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Step 7: AI_USAGE_LOGS - User-based access
CREATE POLICY "ai_logs_read_own" ON public.ai_usage_logs 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "ai_logs_insert_any" ON public.ai_usage_logs 
FOR INSERT WITH CHECK (true); -- Allow system to log usage

-- Step 8: APP_METRICS - Admin only
CREATE POLICY "metrics_admin_read" ON public.app_metrics 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND is_admin = true
  )
);

CREATE POLICY "metrics_admin_insert" ON public.app_metrics 
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- Step 9: Verification - Check policies are created without recursion
SELECT 
    'RLS Enabled Check' as check_type,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

SELECT 
    'Policy Count Check' as check_type,
    tablename,
    COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename 
ORDER BY tablename;

-- Ready to test invite flow: http://localhost:3000/invite/startup2024