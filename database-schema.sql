-- HitMeUp Chat Application Database Schema
-- Stage 1.2: Complete database setup with all required tables

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    avatar_url TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create chats table
CREATE TABLE IF NOT EXISTS chats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT, -- NULL for one-on-one chats
    is_group BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create chat_participants table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS chat_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(chat_id, user_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- NULL for AI messages
    content TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'ai')),
    is_ai BOOLEAN DEFAULT FALSE,
    reply_to UUID REFERENCES messages(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create invites table
CREATE TABLE IF NOT EXISTS invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    used_by UUID REFERENCES users(id) ON DELETE SET NULL,
    chat_id UUID REFERENCES chats(id) ON DELETE CASCADE, -- Optional: specific chat invite
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    used_at TIMESTAMPTZ
);

-- Create user_typing table (for real-time typing indicators)
CREATE TABLE IF NOT EXISTS user_typing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_typed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(chat_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_participants_chat_id ON chat_participants(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON chat_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_created_by ON chats(created_by);
CREATE INDEX IF NOT EXISTS idx_invites_code ON invites(code);
CREATE INDEX IF NOT EXISTS idx_invites_created_by ON invites(created_by);
CREATE INDEX IF NOT EXISTS idx_user_typing_chat_id ON user_typing(chat_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_chats_updated_at ON chats;
CREATE TRIGGER update_chats_updated_at BEFORE UPDATE ON chats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_typing ENABLE ROW LEVEL SECURITY;

-- Users can see their own profile and profiles of users in their chats
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
CREATE POLICY "Users can view their own profile" ON users 
FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON users;
CREATE POLICY "Users can update their own profile" ON users 
FOR UPDATE USING (auth.uid() = id);

-- Users can see chats they participate in
DROP POLICY IF EXISTS "Users can view chats they participate in" ON chats;
CREATE POLICY "Users can view chats they participate in" ON chats
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM chat_participants 
        WHERE chat_participants.chat_id = chats.id 
        AND chat_participants.user_id = auth.uid()
    )
);

-- Users can create chats
DROP POLICY IF EXISTS "Users can create chats" ON chats;
CREATE POLICY "Users can create chats" ON chats
FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Chat participants policies
DROP POLICY IF EXISTS "Users can view chat participants for their chats" ON chat_participants;
CREATE POLICY "Users can view chat participants for their chats" ON chat_participants
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM chat_participants cp 
        WHERE cp.chat_id = chat_participants.chat_id 
        AND cp.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can add participants to chats they're in" ON chat_participants;
CREATE POLICY "Users can add participants to chats they're in" ON chat_participants
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM chat_participants 
        WHERE chat_participants.chat_id = chat_participants.chat_id 
        AND chat_participants.user_id = auth.uid()
    )
);

-- Messages policies
DROP POLICY IF EXISTS "Users can view messages in their chats" ON messages;
CREATE POLICY "Users can view messages in their chats" ON messages
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM chat_participants 
        WHERE chat_participants.chat_id = messages.chat_id 
        AND chat_participants.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can create messages in their chats" ON messages;
CREATE POLICY "Users can create messages in their chats" ON messages
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM chat_participants 
        WHERE chat_participants.chat_id = messages.chat_id 
        AND chat_participants.user_id = auth.uid()
    )
    AND user_id = auth.uid()
);

-- Invites policies
DROP POLICY IF EXISTS "Users can view invites they created" ON invites;
CREATE POLICY "Users can view invites they created" ON invites
FOR SELECT USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can create invites" ON invites;
CREATE POLICY "Users can create invites" ON invites
FOR INSERT WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Anyone can view invites by code" ON invites;
CREATE POLICY "Anyone can view invites by code" ON invites
FOR SELECT USING (true); -- Public read for invite redemption

-- User typing policies
DROP POLICY IF EXISTS "Users can manage typing indicators in their chats" ON user_typing;
CREATE POLICY "Users can manage typing indicators in their chats" ON user_typing
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM chat_participants 
        WHERE chat_participants.chat_id = user_typing.chat_id 
        AND chat_participants.user_id = auth.uid()
    )
);

-- Insert initial test data
DO $$
DECLARE
    admin_user_id UUID;
    test_user_id UUID;
    test_chat_id UUID;
BEGIN
    -- Insert admin user (if not exists)
    INSERT INTO users (id, email, name, is_admin) 
    VALUES (
        '00000000-0000-0000-0000-000000000001',
        'admin@test.com', 
        'Admin User', 
        true
    ) ON CONFLICT (email) DO NOTHING
    RETURNING id INTO admin_user_id;
    
    -- Get admin user id if it already exists
    IF admin_user_id IS NULL THEN
        SELECT id INTO admin_user_id FROM users WHERE email = 'admin@test.com';
    END IF;

    -- Insert test user (if not exists)
    INSERT INTO users (id, email, name, is_admin) 
    VALUES (
        '00000000-0000-0000-0000-000000000002',
        'test@test.com', 
        'Test User', 
        false
    ) ON CONFLICT (email) DO NOTHING
    RETURNING id INTO test_user_id;
    
    -- Get test user id if it already exists
    IF test_user_id IS NULL THEN
        SELECT id INTO test_user_id FROM users WHERE email = 'test@test.com';
    END IF;

    -- Create test chat between admin and test user (if not exists)
    INSERT INTO chats (id, name, is_group, created_by)
    VALUES (
        '00000000-0000-0000-0000-000000000003',
        NULL, -- one-on-one chat
        false,
        admin_user_id
    ) ON CONFLICT DO NOTHING
    RETURNING id INTO test_chat_id;
    
    -- Get chat id if it already exists
    IF test_chat_id IS NULL THEN
        SELECT id INTO test_chat_id FROM chats WHERE id = '00000000-0000-0000-0000-000000000003';
    END IF;

    -- Add participants to test chat
    INSERT INTO chat_participants (chat_id, user_id, role)
    VALUES 
        (test_chat_id, admin_user_id, 'admin'),
        (test_chat_id, test_user_id, 'member')
    ON CONFLICT (chat_id, user_id) DO NOTHING;

    -- Insert sample messages
    INSERT INTO messages (chat_id, user_id, content, message_type, is_ai)
    VALUES 
        (test_chat_id, admin_user_id, 'Welcome to HitMeUp! This is a test chat.', 'text', false),
        (test_chat_id, test_user_id, 'Thanks! This looks great.', 'text', false),
        (test_chat_id, admin_user_id, 'Try mentioning @jimmy to test the AI assistant!', 'text', false),
        (test_chat_id, NULL, 'Hello! I''m Jimmy, your AI assistant. Mention me with @jimmy and I''ll help you out!', 'ai', true)
    ON CONFLICT DO NOTHING;

END $$;