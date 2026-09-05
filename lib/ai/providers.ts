/**
 * Server-only summarize provider resolution and request construction.
 *
 * Provider precedence: a fully configured Groq provider
 * (GROQ_API_KEY + GROQ_MODEL, optional GROQ_BASE_URL override) wins over a
 * fully configured generic endpoint (AI_API_BASE_URL + AI_API_KEY); partial
 * configurations are ignored. Endpoint-specific wire formats are isolated
 * here so no other module needs to know how each provider is called.
 */

export type EnvLike = {
  readonly GROQ_API_KEY?: string;
  readonly GROQ_MODEL?: string;
  readonly GROQ_BASE_URL?: string;
  readonly AI_API_BASE_URL?: string;
  readonly AI_API_KEY?: string;
};

export type GroqSummarizeProvider = {
  readonly kind: 'groq';
  readonly url: string;
  readonly token: string;
  readonly model: string;
};

export type GenericSummarizeProvider = {
  readonly kind: 'generic';
  readonly url: string;
  readonly token: string;
};

export type SummarizeProvider = GroqSummarizeProvider | GenericSummarizeProvider;

export type SummaryRequest = {
  readonly url: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string;
};

/** Default Groq OpenAI-compatible chat completions endpoint. */
export const DEFAULT_GROQ_BASE_URL = 'https://api.groq.com/openai/v1/chat/completions';

const SUMMARIZE_SYSTEM_PROMPT = [
  'You summarize the onboarding employee\'s raw learning note.',
  'Reply with only the summary, grounded strictly in what the note says.',
  'Never invent details, attendance, or evaluations.',
  'Keep it concise.',
].join(' ');

function readConfigured(value: string | undefined): string | null {
  return value ? value : null;
}

/** Reads the summarize-relevant variables from the real environment. */
export function readSummarizeEnv(): EnvLike {
  return {
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    GROQ_MODEL: process.env.GROQ_MODEL,
    GROQ_BASE_URL: process.env.GROQ_BASE_URL,
    AI_API_BASE_URL: process.env.AI_API_BASE_URL,
    AI_API_KEY: process.env.AI_API_KEY,
  };
}

/** Resolves the summarize provider from the environment, or null when none is fully configured. */
export function resolveSummarizeProvider(env: EnvLike = readSummarizeEnv()): SummarizeProvider | null {
  const groqToken = readConfigured(env.GROQ_API_KEY);
  const groqModel = readConfigured(env.GROQ_MODEL);
  if (groqToken !== null && groqModel !== null) {
    return {
      kind: 'groq',
      url: readConfigured(env.GROQ_BASE_URL) ?? DEFAULT_GROQ_BASE_URL,
      token: groqToken,
      model: groqModel,
    };
  }
  const genericUrl = readConfigured(env.AI_API_BASE_URL);
  const genericToken = readConfigured(env.AI_API_KEY);
  if (genericUrl !== null && genericToken !== null) {
    return { kind: 'generic', url: genericUrl, token: genericToken };
  }
  return null;
}

/** Shared AI configuration detection (also used by the health route). */
export function summarizeConfigured(env: EnvLike = readSummarizeEnv()): boolean {
  return resolveSummarizeProvider(env) !== null;
}

/** Builds the provider-specific HTTP request for one summarize call. */
export function buildSummarizeRequest(provider: SummarizeProvider, content: string): SummaryRequest {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    authorization: `Bearer ${provider.token}`,
  };
  switch (provider.kind) {
    case 'groq':
      return {
        url: provider.url,
        headers,
        body: JSON.stringify({
          model: provider.model,
          messages: [
            { role: 'system', content: SUMMARIZE_SYSTEM_PROMPT },
            { role: 'user', content },
          ],
          temperature: 0.3,
          max_tokens: 1024,
        }),
      };
    case 'generic':
      return { url: provider.url, headers, body: JSON.stringify({ input: content }) };
  }
}
