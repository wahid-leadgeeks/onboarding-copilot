import { extractSummary, heuristicSummary, requestSummary, type SummaryFetcher } from './client';

type RecordedCall = { url: string; init: RequestInit };

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), { headers: { 'content-type': 'application/json' } });
}

function bodyText(call: RecordedCall): string {
  return typeof call.init.body === 'string' ? call.init.body : '';
}

describe('extractSummary', () => {
  it('extracts and trims a `{summary}` response', () => {
    expect(extractSummary({ summary: '  Learned the wiki basics  ' })).toBe('Learned the wiki basics');
  });

  it('extracts the assistant reply from an OpenAI-compatible response', () => {
    expect(extractSummary({ id: 'x', choices: [{ index: 0, message: { role: 'assistant', content: ' Learned OAuth ' } }] })).toBe('Learned OAuth');
  });

  it('prefers the `summary` field when both shapes are present', () => {
    expect(extractSummary({ summary: 'first', choices: [{ message: { content: 'second' } }] })).toBe('first');
  });

  it('returns null for malformed payloads', () => {
    expect(extractSummary(null)).toBe(null);
    expect(extractSummary('text')).toBe(null);
    expect(extractSummary(42)).toBe(null);
    expect(extractSummary({})).toBe(null);
    expect(extractSummary({ summary: '' })).toBe(null);
    expect(extractSummary({ summary: '   ' })).toBe(null);
    expect(extractSummary({ summary: 42 })).toBe(null);
    expect(extractSummary({ choices: [] })).toBe(null);
    expect(extractSummary({ choices: [{}] })).toBe(null);
    expect(extractSummary({ choices: [{ message: null }] })).toBe(null);
    expect(extractSummary({ choices: [{ message: { content: '' } }] })).toBe(null);
    expect(extractSummary({ choices: [{ message: { content: 7 } }] })).toBe(null);
  });
});

describe('heuristicSummary', () => {
  it('returns notes up to 240 characters unchanged', () => {
    expect(heuristicSummary('Learned to navigate the wiki')).toBe('Learned to navigate the wiki');
    const exactly240 = 'a'.repeat(240);
    expect(heuristicSummary(exactly240)).toBe(exactly240);
  });

  it('truncates notes over 240 characters to 237 characters plus an ellipsis', () => {
    expect(heuristicSummary('a'.repeat(241))).toBe('a'.repeat(237) + '…');
    expect(heuristicSummary('a'.repeat(10_000)).length).toBe(238);
  });

  it('trims trailing whitespace from the truncated slice before adding the ellipsis', () => {
    const note = 'a'.repeat(235) + '   ' + 'bbb';
    expect(heuristicSummary(note)).toBe('a'.repeat(235) + '…');
  });
});

describe('requestSummary', () => {
  it('returns null without any request when no provider is configured', async () => {
    const calls: RecordedCall[] = [];
    const fetchSummary: SummaryFetcher = async (url, init) => {
      calls.push({ url, init });
      return jsonResponse({ summary: 'unused' });
    };
    expect(await requestSummary('note', {}, fetchSummary)).toBe(null);
    expect(calls).toHaveLength(0);
  });

  it('sends the `{input}` body to the configured generic endpoint', async () => {
    const calls: RecordedCall[] = [];
    const fetchSummary: SummaryFetcher = async (url, init) => {
      calls.push({ url, init });
      return jsonResponse({ summary: ' condensed note ' });
    };
    const result = await requestSummary(
      'my raw note',
      { AI_API_BASE_URL: 'https://ai.example/summarize', AI_API_KEY: 'generic-key' },
      fetchSummary,
    );
    expect(result).toEqual({ summary: 'condensed note' });
    expect(calls[0].url).toBe('https://ai.example/summarize');
    expect(calls[0].init.method).toBe('POST');
    expect(new Headers(calls[0].init.headers).get('authorization')).toBe('Bearer generic-key');
    expect(JSON.parse(bodyText(calls[0]))).toEqual({ input: 'my raw note' });
  });

  it('sends an OpenAI-compatible chat request to Groq and reads the reply', async () => {
    const calls: RecordedCall[] = [];
    const fetchSummary: SummaryFetcher = async (url, init) => {
      calls.push({ url, init });
      return jsonResponse({ choices: [{ message: { role: 'assistant', content: ' Groq summary ' } }] });
    };
    const result = await requestSummary(
      'my raw note',
      { GROQ_API_KEY: 'groq-key', GROQ_MODEL: 'groq-model' },
      fetchSummary,
    );
    expect(result).toEqual({ summary: 'Groq summary' });
    expect(calls[0].url).toBe('https://api.groq.com/openai/v1/chat/completions');
    const body = JSON.parse(bodyText(calls[0]));
    expect(body.model).toBe('groq-model');
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0].role).toBe('system');
    expect(/\S/.test(body.messages[0].content)).toBe(true);
    expect(body.messages[1].role).toBe('user');
    expect(body.messages[1].content).toBe('my raw note');
    expect(body.temperature).toBe(0.3);
    expect(body.max_tokens).toBe(1024);
  });

  it('honors the GROQ_BASE_URL override', async () => {
    const calls: RecordedCall[] = [];
    const fetchSummary: SummaryFetcher = async (url, init) => {
      calls.push({ url, init });
      return jsonResponse({ summary: 'ok' });
    };
    await requestSummary(
      'note',
      { GROQ_API_KEY: 'key', GROQ_MODEL: 'model', GROQ_BASE_URL: 'https://proxy.example/chat' },
      fetchSummary,
    );
    expect(calls[0].url).toBe('https://proxy.example/chat');
  });

  it('prefers Groq when both providers are configured', async () => {
    const calls: RecordedCall[] = [];
    const fetchSummary: SummaryFetcher = async (url, init) => {
      calls.push({ url, init });
      return jsonResponse({ summary: 'ok' });
    };
    await requestSummary(
      'note',
      {
        GROQ_API_KEY: 'groq-key',
        GROQ_MODEL: 'groq-model',
        AI_API_BASE_URL: 'https://ai.example/summarize',
        AI_API_KEY: 'generic-key',
      },
      fetchSummary,
    );
    expect(calls[0].url).toBe('https://api.groq.com/openai/v1/chat/completions');
  });

  it('returns null when the endpoint responds with a non-success status', async () => {
    const fetchSummary: SummaryFetcher = async () => new Response('boom', { status: 500 });
    expect(await requestSummary('note', { AI_API_BASE_URL: 'https://ai.example/summarize', AI_API_KEY: 'generic-key' }, fetchSummary)).toBe(null);
  });

  it('returns null when the response body is malformed', async () => {
    const fetchSummary: SummaryFetcher = async () => jsonResponse({ unexpected: true });
    expect(await requestSummary('note', { AI_API_BASE_URL: 'https://ai.example/summarize', AI_API_KEY: 'generic-key' }, fetchSummary)).toBe(null);
  });

  it('returns null when the response body is not JSON', async () => {
    const fetchSummary: SummaryFetcher = async () => new Response('not json');
    expect(await requestSummary('note', { AI_API_BASE_URL: 'https://ai.example/summarize', AI_API_KEY: 'generic-key' }, fetchSummary)).toBe(null);
  });

  it('returns null when the request fails', async () => {
    const fetchSummary: SummaryFetcher = async () => {
      throw new Error('network down');
    };
    expect(await requestSummary('note', { AI_API_BASE_URL: 'https://ai.example/summarize', AI_API_KEY: 'generic-key' }, fetchSummary)).toBe(null);
  });

  it('caps summaries at 10,000 characters', async () => {
    const fetchSummary: SummaryFetcher = async () => jsonResponse({ summary: 'x'.repeat(10_500) });
    const result = await requestSummary('note', { AI_API_BASE_URL: 'https://ai.example/summarize', AI_API_KEY: 'generic-key' }, fetchSummary);
    expect(result?.summary.length).toBe(10_000);
  });
});
