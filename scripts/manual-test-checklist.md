# HitMeUp Manual Test Checklist

## Environment Verification ✅
- [ ] Dev server running on `http://localhost:3000`
- [ ] Database connection working
- [ ] Environment variables set:
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` 
  - [ ] `ANTHROPIC_API_KEY`

## 1. Admin Login Flow ✅
**URL:** `http://localhost:3000/login`

**Steps:**
1. Navigate to login page
2. Enter credentials:
   - Email: `joshuabrenden@gmail.com`
   - Password: `jj123!`
3. Click "LOGIN AS ADMIN"

**Expected Results:**
- [ ] Successful login redirect to `/admin`
- [ ] Admin dashboard loads with metrics
- [ ] User shown as JJ with admin privileges
- [ ] Navigation shows admin options

## 2. Admin Dashboard Testing ✅
**URL:** `http://localhost:3000/admin` (after login)

**Test Areas:**
- [ ] **User Stats**: Shows total users, active users today
- [ ] **Conversation Stats**: Shows total conversations, messages per hour
- [ ] **AI Usage**: Shows total AI requests, average tokens
- [ ] **Cost Tracking**: Shows AI costs, estimated monthly spend
- [ ] **System Health**: All services show as "ACTIVE"/"CONNECTED"
- [ ] **Quick Actions**: Buttons work (Manage Users, Analytics, Refresh)

## 3. JJ Direct Access Flow ✅
**URL:** `http://localhost:3000/invite/jj-direct`

**Steps:**
1. Navigate to JJ invite link
2. Wait for redirect (1 second)

**Expected Results:**
- [ ] Shows "WELCOME JJ! 👋" message
- [ ] Redirects to chat: `/chat/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee`
- [ ] Chat loads with conversation "JJ & CC Chat 🎉"
- [ ] Shows JJ as authenticated user
- [ ] Welcome message visible in chat history

## 4. CC Direct Access Flow ⚠️
**URL:** `http://localhost:3000/invite/cc-direct`

**Steps:**
1. Navigate to CC invite link
2. Wait for redirect (1 second)

**Expected Results:**
- [ ] Shows "WELCOME CC! 👋" message
- [ ] Redirects to same chat room
- [ ] Chat loads with CC as authenticated user
- [ ] Same conversation visible

**Known Issue:** CC authentication may need fixing

## 5. Real-time Messaging ✅
**In Chat Room:** `/chat/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee`

**Steps:**
1. Send a regular message
2. Verify message appears immediately
3. Check message format and timestamp
4. Test Enter key vs Shift+Enter

**Expected Results:**
- [ ] Message sends without page refresh
- [ ] Message appears in chat instantly
- [ ] Proper user badge (JJ/CC)
- [ ] Correct timestamp shown
- [ ] Message persists on page refresh

## 6. AI Assistant Integration ✅
**In Chat Room:** Same chat room

**Steps:**
1. Send message mentioning `@jimmy`
2. Example: "@jimmy what's the weather like?"
3. Wait for AI response

**Expected Results:**
- [ ] Message with @jimmy sends successfully
- [ ] AI response appears as separate message
- [ ] AI message has "JIMMY" badge
- [ ] AI message has different background color
- [ ] Response is contextually appropriate
- [ ] No authentication errors

## 7. Admin User Management 🔄
**URL:** `http://localhost:3000/admin/users`

**Expected Results:**
- [ ] Shows list of all users
- [ ] JJ listed as admin
- [ ] CC listed as regular user
- [ ] User details accurate (email, display name, join date)

## 8. Analytics Dashboard 🔄
**URL:** `http://localhost:3000/admin/analytics`

**Expected Results:**
- [ ] Detailed usage charts/graphs
- [ ] AI usage breakdown
- [ ] Cost tracking over time
- [ ] Export functionality (if implemented)

## 9. Error Handling ✅

**Test Invalid Invite:**
- [ ] Visit `http://localhost:3000/invite/invalid-code`
- [ ] Should show "INVALID CODE" and redirect to home

**Test Unauthorized Access:**
- [ ] Visit admin pages without login
- [ ] Should redirect to login or show access denied

## 10. Cross-Browser Testing 🔄
Test in different browsers:
- [ ] Chrome/Chromium
- [ ] Firefox 
- [ ] Safari (macOS)
- [ ] Edge (Windows)

## 11. Mobile Responsiveness 🔄
Test on mobile viewport:
- [ ] Chat interface usable on mobile
- [ ] Admin dashboard responsive
- [ ] Login form mobile-friendly
- [ ] Touch interactions work

---

## Quick Reference

**Test Accounts:**
- Admin: `joshuabrenden@gmail.com` / `jj123!`
- User: `christym90@gmail.com` / `cc123!` (may need auth fix)

**Test URLs:**
- Home: `http://localhost:3000`
- JJ Direct: `http://localhost:3000/invite/jj-direct`
- CC Direct: `http://localhost:3000/invite/cc-direct`
- Admin Login: `http://localhost:3000/login`
- Chat Room: `http://localhost:3000/chat/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee`

**Database Test IDs:**
- Conversation: `aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee`
- JJ User: `d1091ce3-3568-4d86-b747-6232de11fcd3` (dynamic)
- CC User: `cccccccc-1234-1234-1234-123456789012`

---

## Status Legend
- ✅ **Ready to Test** - Should work based on setup
- ⚠️ **Known Issues** - May have problems, fix needed
- 🔄 **Manual Check** - Requires hands-on testing
- ❌ **Not Working** - Broken, needs immediate fix