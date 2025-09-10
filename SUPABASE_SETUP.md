# Supabase Database Setup Instructions

## Step 1: Copy and Execute Schema

1. Open your Supabase dashboard: https://supabase.com/dashboard
2. Navigate to your project: `cwrukvjtckajyisedmlu`
3. Go to SQL Editor
4. Create a new query
5. Copy the entire contents of `database-schema.sql` and paste it
6. Click "Run" to execute the schema

## Step 2: Verify Tables Created

After running the schema, verify these tables exist in the Table Editor:

- ✅ `users` - User accounts with admin flags
- ✅ `chats` - Chat rooms (group and one-on-one)
- ✅ `chat_participants` - Chat membership
- ✅ `messages` - Chat messages with AI support
- ✅ `invites` - Invitation system
- ✅ `user_typing` - Real-time typing indicators

## Step 3: Verify Test Data

Check that test data was created:

### Users Table:
- Admin User (admin@test.com, is_admin=true)
- Test User (test@test.com, is_admin=false)

### Chats Table:
- One test chat between admin and test user

### Messages Table:
- 4 sample messages including one AI message from Jimmy

## Step 4: Test Database Connection

After setup, test the connection:
```bash
curl http://localhost:3000/api/test-db
```

Should return: `{"success":true,"message":"Database connection successful!"}`

## RLS Policies Summary

The schema includes comprehensive Row Level Security:

- **Users**: Can view/edit own profile
- **Chats**: Can view chats they participate in
- **Messages**: Can view/send messages in their chats
- **Invites**: Can create invites, anyone can view by code
- **Chat Participants**: Managed automatically
- **User Typing**: Real-time indicators for chat participants

## Database Schema Highlights

- **UUIDs** for all primary keys
- **Proper foreign key relationships** with CASCADE deletes
- **Indexes** for query performance
- **Triggers** for automatic updated_at timestamps
- **Extensible design** for future features
- **AI-ready** message system for Jimmy integration