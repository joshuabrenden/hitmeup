import { NextRequest, NextResponse } from 'next/server';
import { askJimmy, extractJimmyQuestion } from '@/lib/anthropic';

export async function POST(request: NextRequest) {
  try {
    const { message, conversationId, userId } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Extract the question for Jimmy (remove @jimmy mention)
    const question = extractJimmyQuestion(message);

    if (!question) {
      return NextResponse.json(
        { error: 'No valid question found for Jimmy' },
        { status: 400 }
      );
    }

    // Get AI response using the existing anthropic utility
    const aiResponse = await askJimmy(question, {
      conversationHistory: [], // Empty for test
      userContext: {
        userId: userId || 'test-user',
        conversationId: conversationId || 'test-conversation'
      }
    });

    return NextResponse.json({ 
      response: aiResponse,
      question: question 
    });

  } catch (error) {
    console.error('Test Jimmy API error:', error);
    return NextResponse.json(
      { error: 'Failed to get AI response', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}