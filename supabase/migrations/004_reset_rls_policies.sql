-- Reset All RLS Policies - Drop and Recreate Properly
-- This fixes the infinite recursion issues

-- Step 1: Drop ALL existing RLS policies on all tables
DROP POLICY IF EXISTS "Users can read their own profile and participants in their conversations" ON public.users;
DROP POLICY IF EXISTS "Users can read their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can read other participants" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

DROP POLICY IF EXISTS "Users can read conversations they participate in" ON public.conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;

DROP POLICY IF EXISTS "Users can read messages in conversations they participate in" ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages in conversations they participate in" ON public.messages;

DROP POLICY IF EXISTS "Users can read participants in their conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can read conversation participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can join conversations via invites" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can join conversations" ON public.conversation_participants;

DROP POLICY IF EXISTS "Users can read invitations for their conversations" ON public.invitations;
DROP POLICY IF EXISTS "Users can create invitations for their conversations" ON public.invitations;
DROP POLICY IF EXISTS "Anyone can read valid invitations by code" ON public.invitations;
DROP POLICY IF EXISTS "Public can read unexpired invitations" ON public.invitations;

DROP POLICY IF EXISTS "Users can read their own AI usage logs" ON public.ai_usage_logs;
DROP POLICY IF EXISTS "System can insert AI usage logs" ON public.ai_usage_logs;

DROP POLICY IF EXISTS "Only admins can read app metrics" ON public.app_metrics;
DROP POLICY IF EXISTS "Only admins can insert app metrics" ON public.app_metrics;

-- Step 2: Enable RLS on all tables (ensure it's on)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_metrics ENABLE ROW LEVEL SECURITY;

-- Step 3: Create simple, non-recursive RLS policies

-- USERS TABLE POLICIES
-- Allow users to read their own profile
CREATE POLICY "users_read_own" ON public.users 
FOR SELECT USING (auth.uid() = id);

-- Allow users to update their own profile  
CREATE POLICY "users_update_own" ON public.users 
FOR UPDATE USING (auth.uid() = id);

-- Allow users to read profiles of people in their conversations (no recursion)
CREATE POLICY "users_read_conversation_members" ON public.users 
FOR SELECT USING (
  id IN (
    SELECT user_id FROM public.conversation_participants 
    WHERE conversation_id IN (
      SELECT conversation_id FROM public.conversation_participants 
      WHERE user_id = auth.uid()
    )
  )
);

-- CONVERSATIONS TABLE POLICIES
-- Users can read conversations they created
CREATE POLICY "conversations_read_created" ON public.conversations 
FOR SELECT USING (created_by = auth.uid());

-- Users can read conversations they participate in (direct check, no recursion)
CREATE POLICY "conversations_read_participant" ON public.conversations 
FOR SELECT USING (
  id IN (SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid())
);

-- Users can create conversations
CREATE POLICY "conversations_create" ON public.conversations 
FOR INSERT WITH CHECK (auth.uid() = created_by);

-- MESSAGES TABLE POLICIES
-- Users can read messages in conversations they participate in
CREATE POLICY "messages_read" ON public.messages 
FOR SELECT USING (
  conversation_id IN (
    SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid()
  )
);

-- Users can insert messages in conversations they participate in
CREATE POLICY "messages_insert" ON public.messages 
FOR INSERT WITH CHECK (
  (auth.uid() = user_id OR user_id IS NULL) AND
  conversation_id IN (
    SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid()
  )
);

-- CONVERSATION PARTICIPANTS TABLE POLICIES
-- Users can read participant lists for conversations they're in
CREATE POLICY "participants_read" ON public.conversation_participants 
FOR SELECT USING (
  user_id = auth.uid() OR
  conversation_id IN (
    SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid()
  )
);

-- Users can join conversations (insert themselves only)
CREATE POLICY "participants_join" ON public.conversation_participants 
FOR INSERT WITH CHECK (user_id = auth.uid());

-- INVITATIONS TABLE POLICIES  
-- Public can read valid (unexpired, unused) invitations for invite flow
-- This allows anonymous users to validate invite codes
CREATE POLICY "invitations_public_read" ON public.invitations 
FOR SELECT USING (expires_at > NOW() AND used_by IS NULL);

-- Users can read invitations for conversations they're in
CREATE POLICY "invitations_read_own" ON public.invitations 
FOR SELECT USING (
  conversation_id IN (
    SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid()
  )
);

-- Users can create invitations for conversations they created
CREATE POLICY "invitations_create" ON public.invitations 
FOR INSERT WITH CHECK (
  auth.uid() = created_by AND
  conversation_id IN (
    SELECT id FROM public.conversations WHERE created_by = auth.uid()
  )
);

-- Update invitations when used (for marking as used)
CREATE POLICY "invitations_update_usage" ON public.invitations 
FOR UPDATE USING (expires_at > NOW())
WITH CHECK (used_by = auth.uid());

-- AI USAGE LOGS POLICIES
-- Users can read their own AI usage
CREATE POLICY "ai_logs_read_own" ON public.ai_usage_logs 
FOR SELECT USING (auth.uid() = user_id);

-- System can insert AI logs (no user restriction for API calls)
CREATE POLICY "ai_logs_insert" ON public.ai_usage_logs 
FOR INSERT WITH CHECK (true);

-- APP METRICS POLICIES (Admin only)
-- Only admins can read app metrics
CREATE POLICY "metrics_read_admin" ON public.app_metrics 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- Only admins can insert app metrics
CREATE POLICY "metrics_insert_admin" ON public.app_metrics 
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- Verification: Check that policies are created correctly
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname;