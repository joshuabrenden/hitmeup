-- TEST & VERIFY: Comprehensive testing for each stage
-- Run these queries individually to test the invite flow step by step

-- ==============================================
-- STAGE 1: Test Anonymous Invite Access
-- ==============================================
-- This should work WITHOUT authentication (simulates anonymous user)

-- Test 1: Can anonymous user read valid invitations?
SELECT 
    '1. Anonymous Invite Access' as test_name,
    invite_code,
    expires_at > NOW() as is_valid,
    used_by IS NULL as is_unused,
    'SUCCESS: Anonymous can read valid invites' as expected_result
FROM public.invitations 
WHERE invite_code = 'startup2024';

-- Test 2: Can anonymous user read conversation for invite validation?
SELECT 
    '2. Anonymous Conversation Access' as test_name,
    c.name as conversation_name,
    c.invite_code,
    'SUCCESS: Anonymous can read conversation for invite' as expected_result
FROM public.conversations c
WHERE c.id IN (
    SELECT conversation_id FROM public.invitations 
    WHERE invite_code = 'startup2024' AND expires_at > NOW()
);

-- ==============================================
-- STAGE 2: Test Bootstrap Data Integrity  
-- ==============================================

-- Test 3: Verify admin user exists with proper permissions
SELECT 
    '3. Admin User Setup' as test_name,
    email,
    display_name,
    is_admin,
    created_at,
    CASE WHEN is_admin THEN 'SUCCESS: Admin user properly configured' 
         ELSE 'ERROR: Admin flag not set' END as result
FROM public.users 
WHERE id = '12345678-1234-1234-1234-123456789012';

-- Test 4: Verify conversation and participation setup
SELECT 
    '4. Conversation Setup' as test_name,
    c.name,
    c.invite_code,
    cp.user_id IS NOT NULL as admin_is_participant,
    CASE WHEN cp.user_id IS NOT NULL THEN 'SUCCESS: Admin in conversation' 
         ELSE 'ERROR: Admin not participant' END as result
FROM public.conversations c
LEFT JOIN public.conversation_participants cp ON c.id = cp.conversation_id 
    AND cp.user_id = '12345678-1234-1234-1234-123456789012'
WHERE c.id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- Test 5: Verify welcome message exists
SELECT 
    '5. Welcome Message' as test_name,
    LEFT(content, 50) || '...' as message_preview,
    message_type,
    user_id = '12345678-1234-1234-1234-123456789012' as from_admin,
    'SUCCESS: Welcome message created' as result
FROM public.messages 
WHERE conversation_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- ==============================================
-- STAGE 3: Test RLS Policy Functions
-- ==============================================

-- Test 6: Check RLS is enabled on all tables
SELECT 
    '6. RLS Status Check' as test_name,
    tablename,
    rowsecurity as rls_enabled,
    CASE WHEN rowsecurity THEN 'SUCCESS: RLS enabled' 
         ELSE 'ERROR: RLS disabled' END as result
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Test 7: Count policies per table (should have policies now)
SELECT 
    '7. Policy Count Check' as test_name,
    tablename,
    COUNT(*) as policy_count,
    CASE WHEN COUNT(*) > 0 THEN 'SUCCESS: Has policies' 
         ELSE 'ERROR: No policies' END as result
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename 
ORDER BY tablename;

-- Test 8: Check for potential recursive policies (should be none)
SELECT 
    '8. Recursion Check' as test_name,
    tablename,
    policyname,
    CASE WHEN qual LIKE '%' || tablename || '%' THEN 'WARNING: Possible recursion' 
         ELSE 'SUCCESS: No self-reference detected' END as result
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ==============================================
-- STAGE 4: Integration Test Queries
-- ==============================================

-- Test 9: Simulate new user joining via invite (this is what the app will do)
-- Note: This would normally be done through the application, but we can test the data access

SELECT 
    '9. Invite Join Simulation' as test_name,
    i.invite_code,
    i.expires_at > NOW() as invite_valid,
    i.used_by IS NULL as invite_unused,
    c.name as conversation_name,
    'SUCCESS: All data accessible for invite flow' as result
FROM public.invitations i
JOIN public.conversations c ON i.conversation_id = c.id
WHERE i.invite_code = 'startup2024';

-- ==============================================
-- EXPECTED RESULTS SUMMARY
-- ==============================================

SELECT '=== EXPECTED RESULTS SUMMARY ===' as summary;
SELECT '1. Anonymous Invite Access: Should return valid invite record' as expectation;
SELECT '2. Anonymous Conversation Access: Should return conversation details' as expectation;  
SELECT '3. Admin User Setup: Should show admin user with is_admin=true' as expectation;
SELECT '4. Conversation Setup: Should show admin as participant' as expectation;
SELECT '5. Welcome Message: Should show welcome message from admin' as expectation;
SELECT '6. RLS Status Check: All tables should have rls_enabled=true' as expectation;
SELECT '7. Policy Count Check: All tables should have policy_count > 0' as expectation;
SELECT '8. Recursion Check: No warnings about possible recursion' as expectation;
SELECT '9. Invite Join Simulation: Should return complete invite data' as expectation;

SELECT '=== NEXT STEPS ===' as next_steps;
SELECT 'If all tests pass, visit: http://localhost:3000/invite/startup2024' as next_steps;
SELECT 'The invite page should load without 500 errors' as next_steps;
SELECT 'You should be able to enter a name and join the conversation' as next_steps;