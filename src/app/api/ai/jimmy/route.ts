import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { askJimmy, extractJimmyQuestion } from '@/lib/anthropic';

export async function POST(request: NextRequest) {
  try {
    const { message, conversationId, context } = await request.json();

    if (!message || !conversationId) {
      return NextResponse.json(
        { error: 'Message and conversation ID are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get the current user from the session
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify user is a participant in the conversation
    const { data: participantCheck, error: participantError } = await supabase
      .from('conversation_participants')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (participantError || !participantCheck) {
      return NextResponse.json(
        { error: 'Access denied to this conversation' },
        { status: 403 }
      );
    }

    // Rate limiting: Check recent AI usage
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: recentUsage, error: usageError } = await supabase
      .from('ai_usage_logs')
      .select('id')
      .eq('user_id', user.id)
      .gte('created_at', fiveMinutesAgo);

    if (!usageError && recentUsage && recentUsage.length >= 10) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait a few minutes.' },
        { status: 429 }
      );
    }

    // Extract the question for Jimmy
    const question = extractJimmyQuestion(message);

    if (!question) {
      return NextResponse.json(
        { error: 'Please include a question for Jimmy' },
        { status: 400 }
      );
    }

    // Call Jimmy (Claude 3.5 Haiku)
    const jimmyResponse = await askJimmy(question, context || []);

    // Insert AI response as a message
    const { data: aiMessage, error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        user_id: null, // AI messages have null user_id
        content: jimmyResponse.content,
        message_type: 'ai',
        ai_response_to: null, // Could link to the original message if needed
      })
      .select()
      .single();

    if (messageError) {
      console.error('Error inserting AI message:', messageError);
      return NextResponse.json(
        { error: 'Failed to save AI response' },
        { status: 500 }
      );
    }

    // Log AI usage for cost tracking
    const { error: logError } = await supabase
      .from('ai_usage_logs')
      .insert({
        user_id: user.id,
        conversation_id: conversationId,
        tokens_input: jimmyResponse.tokens_input,
        tokens_output: jimmyResponse.tokens_output,
        cost_cents: jimmyResponse.cost_cents,
      });

    if (logError) {
      console.error('Error logging AI usage:', logError);
    }

    // Record app metric for admin dashboard
    const { error: metricError } = await supabase
      .from('app_metrics')
      .insert({
        metric_name: 'ai_request',
        metric_value: 1,
        metadata: {
          tokens_input: jimmyResponse.tokens_input,
          tokens_output: jimmyResponse.tokens_output,
          cost_cents: jimmyResponse.cost_cents,
          user_id: user.id,
          conversation_id: conversationId,
        },
      });

    if (metricError) {
      console.error('Error recording app metric:', metricError);
    }

    return NextResponse.json({
      success: true,
      message: aiMessage,
      usage: {
        tokens_input: jimmyResponse.tokens_input,
        tokens_output: jimmyResponse.tokens_output,
        cost_cents: jimmyResponse.cost_cents,
      },
    });
  } catch (error) {
    console.error('Error in Jimmy API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}