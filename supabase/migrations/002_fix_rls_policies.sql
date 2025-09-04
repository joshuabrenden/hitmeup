-- Fix RLS policies to prevent infinite recursion
-- Drop and recreate the problematic policies

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Users can read participants in their conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can read their own profile and participants in their conversations" ON public.users;

-- Create simpler, non-recursive policies

-- Users policy - allow reading own profile and any user in conversations they're in
CREATE POLICY "Users can read their own profile" ON public.users 
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can read other participants" ON public.users 
FOR SELECT USING (
  id IN (
    SELECT DISTINCT cp.user_id 
    FROM public.conversation_participants cp
    WHERE cp.conversation_id IN (
      SELECT conversation_id 
      FROM public.conversation_participants 
      WHERE user_id = auth.uid()
    )
  )
);

-- Conversation participants policy - simplified
CREATE POLICY "Users can read conversation participants" ON public.conversation_participants 
FOR SELECT USING (
  user_id = auth.uid() OR 
  conversation_id IN (
    SELECT cp2.conversation_id 
    FROM public.conversation_participants cp2 
    WHERE cp2.user_id = auth.uid()
  )
);

-- Allow inserting yourself into conversations (for invite flow)
CREATE POLICY "Users can join conversations" ON public.conversation_participants 
FOR INSERT WITH CHECK (user_id = auth.uid());

-- Invitations policy - allow reading invitations by code (for public invite links)
DROP POLICY IF EXISTS "Users can read invitations for their conversations" ON public.invitations;
CREATE POLICY "Anyone can read valid invitations by code" ON public.invitations 
FOR SELECT USING (expires_at > NOW() AND used_by IS NULL);

-- Allow reading invitations for conversations you're in
CREATE POLICY "Users can read invitations for their conversations" ON public.invitations 
FOR SELECT USING (
  conversation_id IN (
    SELECT cp.conversation_id 
    FROM public.conversation_participants cp 
    WHERE cp.user_id = auth.uid()
  )
);