-- Create specific invite for Christy
-- Run this after the main 4-stage migration setup

-- Create a new invite code specifically for Christy
INSERT INTO public.invitations (
    id,
    conversation_id,
    invite_code,
    created_by,
    expires_at
) VALUES (
    gen_random_uuid(),
    'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', -- Main welcome conversation
    'christy-2024',
    '12345678-1234-1234-1234-123456789012', -- Admin user
    NOW() + INTERVAL '7 days' -- 7 day expiry
) ON CONFLICT (invite_code) DO UPDATE SET
    expires_at = EXCLUDED.expires_at;

-- Verification
SELECT 
    'Christy Invite Created' as status,
    invite_code,
    expires_at,
    expires_at > NOW() as is_valid
FROM public.invitations 
WHERE invite_code = 'christy-2024';

-- Christy's invite link: http://localhost:3000/invite/christy-2024