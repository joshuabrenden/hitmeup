-- Temporarily disable RLS on invitations table to allow public invite access
ALTER TABLE public.invitations DISABLE ROW LEVEL SECURITY;

-- Or keep RLS but create a simple policy for invites
-- ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "Anyone can read valid invitations by code" ON public.invitations;
-- CREATE POLICY "Public can read unexpired invitations" ON public.invitations 
-- FOR SELECT USING (expires_at > NOW() AND used_by IS NULL);

-- Also temporarily disable RLS on conversations for the invite flow
ALTER TABLE public.conversations DISABLE ROW LEVEL SECURITY;

-- Keep users table RLS simple - just allow reading your own profile
DROP POLICY IF EXISTS "Users can read their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can read other participants" ON public.users;
CREATE POLICY "Users can read their own profile" ON public.users 
FOR SELECT USING (auth.uid() = id);

-- Simplify conversation_participants - allow reading and inserting for authenticated users
DROP POLICY IF EXISTS "Users can read conversation participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can join conversations" ON public.conversation_participants;
ALTER TABLE public.conversation_participants DISABLE ROW LEVEL SECURITY;