-- Test Queries to Verify Invite Flow Setup
-- Run these individually to test each step

-- 1. Verify admin user was created
SELECT 
    'Admin User Check' as test,
    id, 
    email, 
    display_name, 
    is_admin,
    created_at
FROM public.users 
WHERE id = '12345678-1234-1234-1234-123456789012';

-- 2. Verify conversation exists
SELECT 
    'Conversation Check' as test,
    id,
    name,
    created_by,
    invite_code,
    created_at
FROM public.conversations 
WHERE id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- 3. Verify invitation is active
SELECT 
    'Invitation Check' as test,
    id,
    invite_code,
    expires_at,
    expires_at > NOW() as is_valid,
    used_by,
    used_at
FROM public.invitations 
WHERE invite_code = 'startup2024';

-- 4. Verify admin is participant in conversation
SELECT 
    'Participation Check' as test,
    conversation_id,
    user_id,
    joined_at
FROM public.conversation_participants 
WHERE conversation_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
  AND user_id = '12345678-1234-1234-1234-123456789012';

-- 5. Check welcome message exists
SELECT 
    'Welcome Message Check' as test,
    id,
    content,
    message_type,
    created_at
FROM public.messages 
WHERE conversation_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- 6. Test invite access policy (simulates anonymous access)
-- This should work without authentication
SELECT 
    'Anonymous Invite Access Test' as test,
    invite_code,
    expires_at > NOW() as valid,
    used_by IS NULL as unused
FROM public.invitations 
WHERE invite_code = 'startup2024';

-- 7. Verify all RLS policies exist
SELECT 
    'RLS Policies Check' as test,
    tablename,
    policyname,
    cmd as operation,
    CASE WHEN roles = '{}'::name[] THEN 'all' ELSE array_to_string(roles, ', ') END as applies_to
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;

-- Expected Results Summary:
-- - Admin user exists with is_admin = true
-- - Conversation 'Welcome to HitMeUp!' exists  
-- - Invitation 'startup2024' is valid and unused
-- - Admin is participant in conversation
-- - Welcome message exists
-- - Anonymous can read valid invitations
-- - All RLS policies are in place without recursion

-- INVITE LINK TO TEST: http://localhost:3000/invite/startup2024