import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createClient()
    
    // Test all tables exist and have expected data
    const results = {
      users: null as any,
      chats: null as any,
      chat_participants: null as any,
      messages: null as any,
      invites: null as any,
      user_typing: null as any,
      test_data: null as any
    }
    
    // Test users table
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, name, is_admin')
      .limit(10)
    
    if (usersError) throw new Error(`Users table error: ${usersError.message}`)
    results.users = { count: users?.length || 0, data: users }
    
    // Test chats table
    const { data: chats, error: chatsError } = await supabase
      .from('chats')
      .select('id, name, is_group, created_by')
      .limit(10)
    
    if (chatsError) throw new Error(`Chats table error: ${chatsError.message}`)
    results.chats = { count: chats?.length || 0, data: chats }
    
    // Test chat_participants table
    const { data: participants, error: participantsError } = await supabase
      .from('chat_participants')
      .select('chat_id, user_id, role')
      .limit(10)
    
    if (participantsError) throw new Error(`Chat participants table error: ${participantsError.message}`)
    results.chat_participants = { count: participants?.length || 0, data: participants }
    
    // Test messages table
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('id, chat_id, user_id, content, is_ai, message_type')
      .limit(10)
    
    if (messagesError) throw new Error(`Messages table error: ${messagesError.message}`)
    results.messages = { count: messages?.length || 0, data: messages }
    
    // Test invites table
    const { data: invites, error: invitesError } = await supabase
      .from('invites')
      .select('id, code, created_by')
      .limit(10)
    
    if (invitesError) throw new Error(`Invites table error: ${invitesError.message}`)
    results.invites = { count: invites?.length || 0 }
    
    // Test user_typing table
    const { data: typing, error: typingError } = await supabase
      .from('user_typing')
      .select('chat_id, user_id')
      .limit(10)
    
    if (typingError) throw new Error(`User typing table error: ${typingError.message}`)
    results.user_typing = { count: typing?.length || 0 }
    
    // Check for expected test data
    const adminUser = users?.find(u => u.email === 'admin@test.com' && u.is_admin)
    const testUser = users?.find(u => u.email === 'test@test.com' && !u.is_admin)
    const testChat = chats?.find(c => !c.is_group)
    const jimmyMessage = messages?.find(m => m.is_ai && m.content.includes('Jimmy'))
    
    results.test_data = {
      admin_user: !!adminUser,
      test_user: !!testUser,
      test_chat: !!testChat,
      jimmy_message: !!jimmyMessage,
      participants_count: participants?.length || 0
    }
    
    const allTablesOk = [
      results.users,
      results.chats,
      results.chat_participants,
      results.messages,
      results.invites,
      results.user_typing
    ].every(table => table !== null)
    
    const testDataOk = results.test_data.admin_user && 
                       results.test_data.test_user && 
                       results.test_data.test_chat &&
                       results.test_data.participants_count >= 2
    
    return NextResponse.json({
      success: allTablesOk,
      schema_complete: allTablesOk,
      test_data_present: testDataOk,
      results,
      message: allTablesOk 
        ? 'Database schema verified successfully!' 
        : 'Database schema incomplete - check the results for missing tables',
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        schema_complete: false,
        test_data_present: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Database schema verification failed - ensure you have run the database-schema.sql in Supabase'
      },
      { status: 500 }
    )
  }
}