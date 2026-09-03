import { NextResponse } from 'next/server';
import { assistantConfigured, parseAssistantMessages, requestAssistantReply } from '@/lib/ai/assistant';

type AssistantBody = { messages?: unknown };

export async function POST(request: Request) {
  const body: AssistantBody = await request.json().catch(() => ({}));
  const messages = parseAssistantMessages(body.messages);
  if (!messages) return NextResponse.json({ error: 'A message list of 1–20 valid messages is required.' }, { status: 400 });
  if (!assistantConfigured()) {
    return NextResponse.json({ error: 'The assistant is not configured. Set GROQ_API_KEY and GROQ_MODEL in .env.local and restart the app.' }, { status: 503 });
  }
  const reply = await requestAssistantReply(messages);
  if (!reply) return NextResponse.json({ error: 'The assistant is unavailable right now. Try again in a moment.' }, { status: 502 });
  return NextResponse.json({ reply });
}
