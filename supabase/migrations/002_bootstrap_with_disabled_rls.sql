-- BOOTSTRAP: Create Admin User and Initial Data (with RLS disabled)
-- Run this AFTER 000_clean_reset.sql and 001_create_schema.sql
-- This works because RLS is disabled, avoiding all recursion issues

-- Step 1: Create JJ user (admin) in auth.users
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

-- Step 2: Create CC user in auth.users  
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

-- Step 3: Create JJ in public.users
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

-- Step 4: Create CC in public.users
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

-- Step 5: Create initial conversation
INSERT INTO public.conversations (id, name, created_by, invite_code, created_at)
VALUES (
    'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    'Welcome to HitMeUp! 🎉',
    '12345678-1234-1234-1234-123456789012',
    'welcome2024',
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    invite_code = EXCLUDED.invite_code;

-- Step 6: Add both JJ and CC as participants
INSERT INTO public.conversation_participants (conversation_id, user_id, joined_at)
VALUES 
    ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', '12345678-1234-1234-1234-123456789012', NOW()),
    ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'cccccccc-1234-1234-1234-123456789012', NOW())
ON CONFLICT (conversation_id, user_id) DO NOTHING;

-- Step 7: Create direct access links for both users
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

-- Step 8: Create welcome message
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

-- Step 7: Verification queries
SELECT 'Bootstrap Check' as status, 'Admin User' as item, email, display_name, is_admin 
FROM public.users WHERE id = '12345678-1234-1234-1234-123456789012';

SELECT 'Bootstrap Check' as status, 'Conversation' as item, name, invite_code 
FROM public.conversations WHERE id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

SELECT 'Bootstrap Check' as status, 'Invitation' as item, invite_code, expires_at > NOW() as valid
FROM public.invitations WHERE invite_code = 'startup2024';

SELECT 'Bootstrap Check' as status, 'Participation' as item, COUNT(*) as participant_count
FROM public.conversation_participants WHERE conversation_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- Ready for next step: Enable RLS with proper policies
-- Your invite link: http://localhost:3000/invite/startup2024