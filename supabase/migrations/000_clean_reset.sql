-- CLEAN RESET: Complete RLS Policy Cleanup
-- Run this FIRST to completely reset all RLS policies and prepare for bootstrap

-- Step 1: Drop ALL existing RLS policies (comprehensive cleanup)
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    -- Drop all policies on all public tables
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

-- Step 2: Disable RLS on all tables temporarily for bootstrap
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_metrics DISABLE ROW LEVEL SECURITY;

-- Step 3: Clean up any existing data (optional - comment out if you want to keep data)
-- TRUNCATE public.messages CASCADE;
-- TRUNCATE public.conversation_participants CASCADE;  
-- TRUNCATE public.invitations CASCADE;
-- TRUNCATE public.conversations CASCADE;
-- TRUNCATE public.users CASCADE;
-- TRUNCATE public.ai_usage_logs CASCADE;
-- TRUNCATE public.app_metrics CASCADE;

-- Step 4: Drop any functions that might cause issues
DROP FUNCTION IF EXISTS public.user_is_conversation_participant(UUID, UUID);
DROP FUNCTION IF EXISTS public.get_user_conversation_ids(UUID);

-- Step 5: Verify cleanup
SELECT 
    'RLS Status Check' as check_type,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

SELECT 
    'Policy Cleanup Check' as check_type,
    COUNT(*) as remaining_policies
FROM pg_policies 
WHERE schemaname = 'public';

-- Expected result: All tables should have rls_enabled = false, remaining_policies = 0
-- Now ready for bootstrap script