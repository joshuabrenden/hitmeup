-- Bootstrap Script: Create First Admin User and Initial Setup
-- Run this ONCE to set up your first admin user and test conversation

-- Step 1: Create admin user in auth.users
-- Replace 'admin@hitmeup.local' with your actual admin email
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
    '12345678-1234-1234-1234-123456789012', -- Fixed admin UUID
    '00000000-0000-0000-0000-000000000000',
    'admin@hitmeup.local', -- Change this to your email
    crypt('admin123', gen_salt('bf')), -- Temporary password
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Admin User"}',
    false,
    'authenticated',
    'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- Step 2: Create corresponding user in public.users (will be created by trigger, but let's ensure it)
INSERT INTO public.users (id, email, display_name, is_admin)
VALUES (
    '12345678-1234-1234-1234-123456789012',
    'admin@hitmeup.local',
    'Admin User',
    true
) ON CONFLICT (id) DO UPDATE SET
    is_admin = true,
    display_name = EXCLUDED.display_name;

-- Step 3: Create initial test conversation
INSERT INTO public.conversations (id, name, created_by, invite_code)
VALUES (
    'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    'Welcome to HitMeUp!',
    '12345678-1234-1234-1234-123456789012',
    'welcome2024'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    invite_code = EXCLUDED.invite_code;

-- Step 4: Add admin as participant in the conversation
INSERT INTO public.conversation_participants (conversation_id, user_id)
VALUES (
    'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    '12345678-1234-1234-1234-123456789012'
) ON CONFLICT DO NOTHING;

-- Step 5: Create initial invitation
INSERT INTO public.invitations (
    conversation_id,
    invite_code,
    created_by,
    expires_at
) VALUES (
    'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    'startup2024',
    '12345678-1234-1234-1234-123456789012',
    NOW() + INTERVAL '30 days'
) ON CONFLICT (invite_code) DO UPDATE SET
    expires_at = EXCLUDED.expires_at;

-- Step 6: Create a welcome message
INSERT INTO public.messages (
    conversation_id,
    user_id,
    content,
    message_type
) VALUES (
    'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    '12345678-1234-1234-1234-123456789012',
    'Welcome to HitMeUp! This is your first conversation. Try mentioning @jimmy to test the AI assistant!',
    'user'
) ON CONFLICT DO NOTHING;

-- Verification queries (run separately to check setup)
-- SELECT 'Admin user created' as status, email, display_name, is_admin FROM public.users WHERE id = '12345678-1234-1234-1234-123456789012';
-- SELECT 'Conversation created' as status, name, invite_code FROM public.conversations WHERE id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';  
-- SELECT 'Invitation ready' as status, invite_code, expires_at FROM public.invitations WHERE invite_code = 'startup2024';

-- Your invite link will be: http://localhost:3000/invite/startup2024