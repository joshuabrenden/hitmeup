# HitMeUp Database Setup Instructions

## Quick Setup (Run in Supabase SQL Editor)

### Step 1: Run Bootstrap Script
Execute the contents of `supabase/migrations/bootstrap_admin.sql` to:
- Create first admin user
- Create initial conversation
- Create first invitation
- Set up welcome message

### Step 2: Fix RLS Policies  
Execute the contents of `supabase/migrations/004_reset_rls_policies.sql` to:
- Remove recursive policies causing infinite loops
- Create simple, secure RLS policies
- Enable anonymous invite access

### Step 3: Verify Setup
Execute queries from `supabase/migrations/test_invite_flow.sql` to verify everything is working.

## Test Your Setup

After running both scripts, test your invite link:
**http://localhost:3000/invite/startup2024**

## Admin Access

1. Join via the invite link to create your account
2. In Supabase, find your user in the `users` table
3. Set `is_admin = true` for your user
4. Access admin dashboard at: **http://localhost:3000/admin**

## Key Features Fixed

✅ **No RLS Recursion** - Policies avoid circular references  
✅ **Anonymous Invites** - Public can validate invite codes  
✅ **Bootstrap Ready** - First admin created automatically  
✅ **Secure Access** - Proper permissions maintained  

## Architecture Notes

- **invitations_public_read**: Allows anonymous invite validation
- **Simple Joins**: Direct participant checks, no nested queries  
- **Separate Policies**: Read/write/admin permissions isolated
- **Bootstrap User**: Fixed UUID for consistent admin setup