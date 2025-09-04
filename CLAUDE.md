# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HitMeUp is a neobrutalist-styled, invite-only messaging application with AI assistant integration. It uses Supabase for the backend, Next.js for the frontend, and integrates with Anthropic's Claude 3.5 Haiku for AI responses.

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run type checking
npm run type-check

# Run linting
npm run lint
```

## Tech Stack & Architecture

- **Frontend**: Next.js 14+ with App Router, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Real-time, Edge Functions)
- **AI Integration**: Anthropic Claude 3.5 Haiku API
- **Deployment**: Vercel (frontend), Supabase (backend services)
- **Styling**: Custom neobrutalist design system with Tailwind CSS

## Database Schema

### Core Tables
- `users` - User profiles extending Supabase auth
- `conversations` - Chat rooms/channels
- `messages` - All chat messages (user and AI)
- `conversation_participants` - Many-to-many relationship for users in conversations
- `invitations` - Invite-only access system
- `ai_usage_logs` - Cost tracking for AI API usage
- `app_metrics` - Analytics and monitoring data

### Key Features
- Row Level Security (RLS) policies for all tables
- Real-time subscriptions for live messaging
- Automatic user creation triggers
- Cost tracking for AI usage

## Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                  # Auth-related routes
│   │   └── invite/[code]/       # Invite link handling
│   ├── (dashboard)/             # Protected app routes
│   │   ├── chat/[id]/          # Chat interface
│   │   └── admin/              # Admin dashboard
│   ├── api/                     # API routes
│   │   └── ai/jimmy/           # Claude AI integration
│   ├── globals.css             # Tailwind styles & neobrutalist theme
│   └── layout.tsx              # Root layout with AuthProvider
├── components/
│   ├── ui/                     # Reusable neobrutalist UI components
│   ├── auth/                   # Authentication components
│   ├── chat/                   # Chat-specific components
│   └── admin/                  # Admin dashboard components
├── lib/
│   ├── supabase/               # Supabase client & server configs
│   ├── anthropic.ts            # Claude AI integration
│   ├── types.ts                # TypeScript interfaces
│   └── utils.ts                # Utility functions
supabase/
├── migrations/                 # Database schema migrations
└── config.toml                # Supabase local development config
```

## Key Components & Patterns

### Authentication System
- Invite-only access via unique URLs (`/invite/[code]`)
- Automatic user creation on first invite use
- Admin role system for elevated privileges
- Session management via Supabase Auth

### Real-time Messaging
- WebSocket connections via Supabase Realtime
- Optimistic updates for smooth UX
- Message type system (user/AI messages)
- Typing indicators and read receipts

### AI Integration (@Jimmy)
- Mention-based AI activation with `@jimmy`
- Context-aware responses using conversation history
- Cost tracking per API call (tokens & pricing)
- Rate limiting (10 requests per user per 5 minutes)
- Automatic usage logging for admin analytics

### Admin Dashboard
- Comprehensive analytics with charts (Recharts)
- User management and role assignment
- Cost monitoring and quota tracking
- Real-time system health monitoring
- Invite link generation and management

### Neobrutalist Design System
- High contrast colors (yellow, pink, cyan, lime, etc.)
- Bold borders (4px) and dramatic shadows
- Monospace fonts (Courier New)
- Boxy, angular layouts
- Custom Tailwind CSS utilities

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Anthropic AI
ANTHROPIC_API_KEY=your_anthropic_key

# Admin
ADMIN_EMAIL=admin@example.com
```

## Development Workflow

### Adding New Features
1. Update database schema in `supabase/migrations/`
2. Generate TypeScript types: `npm run db:generate-types`
3. Create API routes in `src/app/api/` if needed
4. Build UI components following neobrutalist design patterns
5. Implement real-time subscriptions for live updates
6. Add admin dashboard analytics if applicable

### Cost Management
- Monitor AI usage through admin dashboard
- Implement rate limiting for expensive operations
- Track costs in `ai_usage_logs` table
- Set up alerts for quota limits

### Security Considerations
- All database access uses Row Level Security (RLS)
- Admin-only routes check `is_admin` flag
- Rate limiting on AI requests prevents abuse
- Invite codes expire after 24 hours by default

## Testing & Deployment

### Local Development
1. Set up Supabase project and configure environment variables
2. Run database migrations: `npm run db:migrate`
3. Start development server: `npm run dev`
4. Access admin dashboard by setting `is_admin: true` in database

### Production Deployment
1. Deploy to Vercel: `vercel`
2. Configure Supabase production database
3. Set environment variables in Vercel dashboard
4. Monitor costs and usage through admin dashboard

## Common Tasks

### Creating Invites
- Admin can generate invites through admin dashboard
- Each invite has unique code and expiration date
- Invites are single-use and expire after 24 hours

### Managing Users
- Admin dashboard provides user management interface
- Can promote/demote admin status
- View user activity and AI usage costs

### Monitoring System Health
- Admin dashboard shows real-time metrics
- Cost tracking for AI API usage
- Database quota monitoring for Supabase free tier
- Bandwidth monitoring for Vercel free tier

### Adding AI Features
- Extend `askJimmy()` function in `src/lib/anthropic.ts`
- Update cost calculations for new models
- Add usage logging for new AI features
- Implement rate limiting for new endpoints

This application is designed to stay within free tier limits of both Supabase and Vercel while providing comprehensive messaging and AI capabilities.