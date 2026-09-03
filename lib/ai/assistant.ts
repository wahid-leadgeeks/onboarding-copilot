export type AssistantMessage = { role: 'user' | 'assistant'; content: string };

const MAX_MESSAGES = 20;
const MAX_CONTENT_LENGTH = 2000;
const MAX_REPLY_LENGTH = 4000;
const DEFAULT_GROQ_BASE_URL = 'https://api.groq.com/openai/v1/chat/completions';

const SYSTEM_PROMPT = [
  'You are the assistant inside Onboarding Copilot, a calm app that helps a new employee through their onboarding.',
  'Answer questions about onboarding, the app itself, and how to phrase learning notes or feedback.',
  'You are assistive only: you never record attendance, never write to any document, never evaluate the employee, and never claim an action was saved.',
  'Keep answers short, friendly, and practical.',
].join(' ');

function isAssistantMessage(value: unknown): value is AssistantMessage {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  return (item.role === 'user' || item.role === 'assistant')
    && typeof item.content === 'string'
    && item.content.trim().length > 0
    && item.content.length <= MAX_CONTENT_LENGTH;
}

/** Validates an incoming chat history (untrusted request body). */
export function parseAssistantMessages(value: unknown): AssistantMessage[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_MESSAGES) return null;
  if (!value.every(isAssistantMessage)) return null;
  return value.map(message => ({ role: message.role, content: message.content }));
}

/** Extracts the assistant reply from an OpenAI-compatible provider response. */
export function extractReply(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const choices = (value as Record<string, unknown>).choices;
  if (!Array.isArray(choices) || !choices[0] || typeof choices[0] !== 'object') return null;
  const message = (choices[0] as Record<string, unknown>).message;
  if (!message || typeof message !== 'object') return null;
  const content = (message as Record<string, unknown>).content;
  return typeof content === 'string' && content.trim() ? content.trim().slice(0, MAX_REPLY_LENGTH) : null;
}

export function assistantConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY && process.env.GROQ_MODEL);
}

/** Sends the chat to the configured Groq model. Returns null on any failure. */
export async function requestAssistantReply(messages: AssistantMessage[]): Promise<string | null> {
  const token = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL;
  if (!token || !model) return null;
  const url = process.env.GROQ_BASE_URL || DEFAULT_GROQ_BASE_URL;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      temperature: 0.3,
      max_tokens: 1024,
    }),
    cache: 'no-store',
  }).catch(() => null);
  if (!response?.ok) return null;
  const payload: unknown = await response.json().catch(() => null);
  return extractReply(payload);
}
