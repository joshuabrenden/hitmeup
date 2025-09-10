import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export async function POST(request: NextRequest) {
  try {
    const { chatId, userMessage, userName, recentMessages } = await request.json()

    if (!chatId || !userMessage) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create context from recent chat messages
    const contextMessages = recentMessages?.slice(-10) || [] // Last 10 messages
    const conversationContext = contextMessages
      .map((msg: any) => {
        const sender = msg.is_ai ? 'Jimmy' : (msg.users?.name || 'User')
        return `${sender}: ${msg.content}`
      })
      .join('\n')

    // Create a personalized prompt for Jimmy
    const systemPrompt = `You are Jimmy, a friendly and helpful AI assistant in a chat application called HitMeUp. 

Key traits:
- Be conversational, warm, and helpful
- Keep responses concise but meaningful (1-3 sentences usually)
- You can discuss any topic the user brings up
- You remember the conversation context
- Use a casual, friendly tone
- Occasionally use emojis when appropriate

Current chat context:
${conversationContext}

The user ${userName} just mentioned you with: "${userMessage}"

Respond naturally as Jimmy would in this conversation.`

    console.log('🤖 Calling Anthropic API for Jimmy response...')

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 300,
      temperature: 0.7,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userMessage
        }
      ]
    })

    const aiContent = response.content[0]?.type === 'text' 
      ? response.content[0].text 
      : 'Sorry, I had trouble processing that message.'

    console.log('✅ Jimmy response generated:', aiContent.substring(0, 100) + '...')

    // Save the AI response to the database
    const supabase = createClient()
    const { data: aiMessage, error: dbError } = await supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        user_id: null,
        content: aiContent,
        message_type: 'ai',
        is_ai: true
      })
      .select()
      .single()

    if (dbError) {
      console.error('❌ Failed to save AI message to database:', dbError)
      return NextResponse.json(
        { error: 'Failed to save AI response' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: aiMessage,
      content: aiContent
    })

  } catch (error) {
    console.error('❌ Error in Jimmy AI API:', error)
    
    // Fallback to a default response if API fails
    const fallbackResponse = "Hi! I'm Jimmy, your AI assistant. I'm having a bit of trouble right now, but I'm here to help! 🤖"
    
    return NextResponse.json({
      success: false,
      error: 'AI service temporarily unavailable',
      fallback: fallbackResponse
    }, { status: 500 })
  }
}