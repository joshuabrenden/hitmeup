-- COMPLETE SETUP: Nuclear reset + schema + bootstrap + users
-- Run this ONE script to set up everything from scratch

-- ======================================
-- PART 1: NUCLEAR CLEANUP
-- ======================================

-- Drop all triggers first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop all functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.generate_invite_code() CASCADE;
DROP FUNCTION IF EXISTS public.user_is_conversation_participant(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_conversation_ids(UUID) CASCADE;

-- Drop all tables with CASCADE to remove dependencies
DROP TABLE IF EXISTS public.app_metrics CASCADE;
DROP TABLE IF EXISTS public.ai_usage_logs CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversation_participants CASCADE;
DROP TABLE IF EXISTS public.invitations CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Clean auth users completely
DELETE FROM auth.users;

-- Drop any remaining policies
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
    ) 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
            r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- ======================================
-- PART 2: CREATE SCHEMA
-- ======================================

-- Create users table that extends auth.users
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  invited_by UUID REFERENCES public.users(id)
);

-- Create conversations table
CREATE TABLE public.conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_by UUID REFERENCES public.users(id) NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id),
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'user' CHECK (message_type IN ('user', 'ai')),
  ai_response_to UUID REFERENCES public.messages(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create conversation participants table
CREATE TABLE public.conversation_participants (
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

-- Create invitations table
CREATE TABLE public.invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES public.users(id) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_by UUID REFERENCES public.users(id),
  used_at TIMESTAMP WITH TIME ZONE
);

-- Create AI usage logs table
CREATE TABLE public.ai_usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  tokens_input INTEGER NOT NULL,
  tokens_output INTEGER NOT NULL,
  cost_cents INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create app metrics table
CREATE TABLE public.app_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metadata JSONB,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX idx_messages_ai_response ON public.messages(ai_response_to);
CREATE INDEX idx_participants_conversation_id ON public.conversation_participants(conversation_id);
CREATE INDEX idx_participants_user_id ON public.conversation_participants(user_id);
CREATE INDEX idx_ai_usage_user_id ON public.ai_usage_logs(user_id);
CREATE INDEX idx_ai_usage_created_at ON public.ai_usage_logs(created_at DESC);
CREATE INDEX idx_invitations_code ON public.invitations(invite_code);
CREATE INDEX idx_invitations_expires ON public.invitations(expires_at);

-- Function to handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to generate invite codes
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS TEXT AS $$
BEGIN
  RETURN lower(
    substring(encode(gen_random_bytes(6), 'base64') from 1 for 8) ||
    substring(encode(gen_random_bytes(6), 'base64') from 1 for 8)
  );
END;
$$ LANGUAGE plpgsql;

-- ======================================
-- PART 3: DISABLE RLS (FOR SIMPLICITY)
-- ======================================

ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_metrics DISABLE ROW LEVEL SECURITY;

-- ======================================
-- PART 4: BOOTSTRAP USERS AND DATA
-- ======================================

-- Create JJ user (admin) in auth.users
INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    role,
    aud
) VALUES (
    '12345678-1234-1234-1234-123456789012', -- JJ's UUID
    '00000000-0000-0000-0000-000000000000',
    'joshuabrenden@gmail.com',
    crypt('jj123!', gen_salt('bf')), 
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"JJ"}',
    false,
    'authenticated',
    'authenticated'
) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    updated_at = NOW();

-- Create CC user in auth.users  
INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    role,
    aud
) VALUES (
    'cccccccc-1234-1234-1234-123456789012', -- CC's UUID
    '00000000-0000-0000-0000-000000000000',
    'christym90@gmail.com',
    crypt('cc123!', gen_salt('bf')), 
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"CC"}',
    false,
    'authenticated',
    'authenticated'
) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    updated_at = NOW();

-- Create JJ in public.users
INSERT INTO public.users (id, email, display_name, is_admin, created_at)
VALUES (
    '12345678-1234-1234-1234-123456789012',
    'joshuabrenden@gmail.com',
    'JJ',
    true,
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = EXCLUDED.display_name,
    is_admin = true;

-- Create CC in public.users
INSERT INTO public.users (id, email, display_name, is_admin, created_at)
VALUES (
    'cccccccc-1234-1234-1234-123456789012',
    'christym90@gmail.com',
    'CC',
    false,
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = EXCLUDED.display_name;

-- Create initial conversation
INSERT INTO public.conversations (id, name, created_by, invite_code, created_at)
VALUES (
    'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    'JJ & CC Chat 🎉',
    '12345678-1234-1234-1234-123456789012',
    'main-chat',
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    invite_code = EXCLUDED.invite_code;

-- Add both JJ and CC as participants
INSERT INTO public.conversation_participants (conversation_id, user_id, joined_at)
VALUES 
    ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', '12345678-1234-1234-1234-123456789012', NOW()),
    ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'cccccccc-1234-1234-1234-123456789012', NOW())
ON CONFLICT (conversation_id, user_id) DO NOTHING;

-- Create direct access links for both users
INSERT INTO public.invitations (
    id,
    conversation_id,
    invite_code,
    created_by,
    expires_at,
    used_by,
    used_at
) VALUES 
    ('bbbbbbbb-cccc-dddd-eeee-ffffffffffff', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'jj-direct', '12345678-1234-1234-1234-123456789012', NOW() + INTERVAL '30 days', '12345678-1234-1234-1234-123456789012', NOW()),
    ('cccccccc-cccc-dddd-eeee-ffffffffffff', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'cc-direct', '12345678-1234-1234-1234-123456789012', NOW() + INTERVAL '30 days', 'cccccccc-1234-1234-1234-123456789012', NOW())
ON CONFLICT (invite_code) DO UPDATE SET
    expires_at = EXCLUDED.expires_at;

-- Create welcome message
INSERT INTO public.messages (
    conversation_id,
    user_id,
    content,
    message_type,
    created_at
) VALUES (
    'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    '12345678-1234-1234-1234-123456789012',
    'Welcome JJ and CC! 🎉 This is your private chat room. Try mentioning @jimmy to test the AI assistant!',
    'user',
    NOW()
) ON CONFLICT DO NOTHING;

-- ======================================
-- PART 5: VERIFICATION
-- ======================================

SELECT 'SETUP COMPLETE!' as status;
SELECT 'Users Created' as check, COUNT(*) as count FROM public.users;
SELECT 'Conversation Created' as check, name FROM public.conversations;
SELECT 'Participants Added' as check, COUNT(*) as count FROM public.conversation_participants;
SELECT 'Invites Ready' as check, invite_code, used_by IS NOT NULL as is_used FROM public.invitations;

-- ======================================
-- READY TO TEST!
-- ======================================
-- JJ Link: http://localhost:3000/invite/jj-direct
-- CC Link: http://localhost:3000/invite/cc-direct
-- Both redirect to: /chat/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee