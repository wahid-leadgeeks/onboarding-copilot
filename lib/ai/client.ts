export type SummaryResult = { summary: string };

function isSummaryResult(value: unknown): value is SummaryResult {
  if (!value || typeof value !== 'object') return false;
  const summary = (value as Record<string, unknown>).summary;
  return typeof summary === 'string' && summary.trim().length > 0;
}

function extractSummary(value: unknown): string | null {
  if (isSummaryResult(value)) return value.summary.trim();
  if (!value || typeof value !== 'object') return null;
  const choices = (value as Record<string, unknown>).choices;
  if (!Array.isArray(choices) || !choices[0] || typeof choices[0] !== 'object') return null;
  const message = (choices[0] as Record<string, unknown>).message;
  if (!message || typeof message !== 'object') return null;
  const content = (message as Record<string, unknown>).content;
  return typeof content === 'string' && content.trim() ? content.trim() : null;
}

export async function requestSummary(content: string): Promise<SummaryResult | null> {
  const baseUrl = process.env.AI_API_BASE_URL;
  const token = process.env.AI_API_KEY;
  if (!baseUrl || !token) return null;
  const response = await fetch(baseUrl, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ input: content }), cache: 'no-store' });
  if (!response.ok) return null;
  const payload: unknown = await response.json().catch(() => null);
  const summary = extractSummary(payload);
  return summary ? { summary: summary.slice(0, 10_000) } : null;
}
