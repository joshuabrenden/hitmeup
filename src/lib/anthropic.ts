import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export interface JimmyResponse {
  content: string;
  tokens_input: number;
  tokens_output: number;
  cost_cents: number;
}

export async function askJimmy(
  message: string,
  conversationContext: string[] = []
): Promise<JimmyResponse> {
  try {
    // Build context with previous messages if provided
    let fullPrompt = `You are Jimmy, a helpful AI assistant in a casual messaging app called HitMeUp. 
You should respond in a friendly, conversational tone. Keep responses concise but helpful.
You're designed to be useful while fitting naturally into casual conversation.

Current question: ${message}`;

    if (conversationContext.length > 0) {
      fullPrompt = `You are Jimmy, a helpful AI assistant in a casual messaging app called HitMeUp. 
You should respond in a friendly, conversational tone. Keep responses concise but helpful.
You're designed to be useful while fitting naturally into casual conversation.

Recent conversation context:
${conversationContext.join('\n')}

Current question: ${message}`;
    }

    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: fullPrompt
        }
      ]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Anthropic API');
    }

    // Calculate costs based on current Claude 3.5 Haiku pricing
    // $0.80 per million input tokens, $4.00 per million output tokens
    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;
    
    const inputCostCents = Math.ceil((inputTokens / 1000000) * 80); // $0.80 per 1M tokens = 80 cents
    const outputCostCents = Math.ceil((outputTokens / 1000000) * 400); // $4.00 per 1M tokens = 400 cents
    const totalCostCents = inputCostCents + outputCostCents;

    return {
      content: content.text,
      tokens_input: inputTokens,
      tokens_output: outputTokens,
      cost_cents: totalCostCents,
    };
  } catch (error: any) {
    console.error('Error calling Anthropic API:', error);
    
    // Check for specific API errors and provide helpful fallback responses
    if (error?.error?.error?.message?.includes('credit balance is too low')) {
      return {
        content: "Hi! I'm Jimmy, your AI assistant. Unfortunately, I'm currently offline due to API credit limits, but I'm still here in spirit! 🤖 The good news is that all the chat functionality is working perfectly - you can send messages, and everything is being saved properly. The developer just needs to add more API credits to bring me back online!",
        tokens_input: 0,
        tokens_output: 0,
        cost_cents: 0,
      };
    }
    
    if (error?.status === 429) {
      return {
        content: "I'm getting a lot of requests right now! Please wait a moment and try asking me again. 🤖",
        tokens_input: 0,
        tokens_output: 0,
        cost_cents: 0,
      };
    }
    
    // Generic fallback
    return {
      content: "Sorry, I'm having some technical difficulties right now. The chat system is working great though! Try mentioning me again in a bit. 🔧",
      tokens_input: 0,
      tokens_output: 0,
      cost_cents: 0,
    };
  }
}

export function detectJimmyMention(message: string): boolean {
  return message.toLowerCase().includes('@jimmy');
}

export function extractJimmyQuestion(message: string): string {
  // Remove @jimmy mention and clean up the question
  return message
    .replace(/@jimmy/gi, '')
    .trim()
    .replace(/^[,\s]+/, '') // Remove leading commas and spaces
    .replace(/[,\s]+$/, ''); // Remove trailing commas and spaces
}