import { buildSummarizeRequest, readSummarizeEnv, resolveSummarizeProvider, type EnvLike } from './providers';

export type SummaryResult = { summary: string };

function isSummaryResult(value: unknown): value is SummaryResult {
  if (!value || typeof value !== 'object') return false;
  const summary = (value as Record<string, unknown>).summary;
  return typeof summary === 'string' && summary.trim().length > 0;
}

/** Extracts a summary from either a `{summary}` or an OpenAI-compatible provider response. */
export function extractSummary(value: unknown): string | null {
  if (isSummaryResult(value)) return value.summary.trim();
  if (!value || typeof value !== 'object') return null;
  const choices = (value as Record<string, unknown>).choices;
  if (!Array.isArray(choices) || !choices[0] || typeof choices[0] !== 'object') return null;
  const message = (choices[0] as Record<string, unknown>).message;
  if (!message || typeof message !== 'object') return null;
  const content = (message as Record<string, unknown>).content;
  return typeof content === 'string' && content.trim() ? content.trim() : null;
}

/** Deterministic local fallback: the note itself, truncated at 240 characters. */
export function heuristicSummary(raw: string): string {
  return raw.length <= 240 ? raw : `${raw.slice(0, 237).trimEnd()}…`;
}

export type SummaryFetcher = (url: string, init: RequestInit) => Promise<Response>;

/**
 * Requests an AI summary from the resolved provider (Groq first, then the
 * generic endpoint). Returns null when no provider is configured or on any
 * request, response, or parsing failure; the caller falls back to
 * `heuristicSummary`.
 */
export async function requestSummary(
  content: string,
  env: EnvLike = readSummarizeEnv(),
  fetchSummary: SummaryFetcher = fetch,
): Promise<SummaryResult | null> {
  const provider = resolveSummarizeProvider(env);
  if (!provider) return null;
  const request = buildSummarizeRequest(provider, content);
  const response = await fetchSummary(request.url, {
    method: 'POST',
    headers: request.headers,
    body: request.body,
    cache: 'no-store',
  }).catch(() => null);
  if (!response?.ok) return null;
  const payload: unknown = await response.json().catch(() => null);
  const summary = extractSummary(payload);
  return summary ? { summary: summary.slice(0, 10_000) } : null;
}
