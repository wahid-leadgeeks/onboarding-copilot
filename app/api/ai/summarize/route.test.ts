import { POST } from './route';

const AI_ENV_KEYS = ['GROQ_API_KEY', 'GROQ_MODEL', 'GROQ_BASE_URL', 'AI_API_BASE_URL', 'AI_API_KEY'] as const;

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), { headers: { 'content-type': 'application/json' } });
}

function postSummarize(payload: unknown): Promise<Response> {
  return POST(new Request('http://localhost/api/ai/summarize', { method: 'POST', body: JSON.stringify(payload) }));
}

describe('POST /api/ai/summarize', () => {
  const savedEnv = new Map<string, string | undefined>();

  beforeAll(() => {
    for (const key of AI_ENV_KEYS) savedEnv.set(key, process.env[key]);
  });

  beforeEach(() => {
    for (const key of AI_ENV_KEYS) delete process.env[key];
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    for (const [key, value] of savedEnv) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it('responds 400 when content is missing or not a string', async () => {
    expect((await postSummarize({})).status).toBe(400);
    expect((await postSummarize({ content: 42 })).status).toBe(400);
    expect((await postSummarize({ content: null })).status).toBe(400);
  });

  it('responds 400 when content is empty or whitespace', async () => {
    expect((await postSummarize({ content: '' })).status).toBe(400);
    expect((await postSummarize({ content: '   ' })).status).toBe(400);
  });

  it('responds 413 when content exceeds 10,000 characters', async () => {
    const response = await postSummarize({ content: 'a'.repeat(10_001) });
    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ error: 'Learning content is too long' });
  });

  it('falls back to the heuristic summary when no provider is configured', async () => {
    const response = await postSummarize({ content: 'b'.repeat(300) });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      raw: 'b'.repeat(300),
      summary: 'b'.repeat(237) + '…',
      confirmed: false,
      requiresConfirmation: true,
    });
  });

  it('returns a trimmed short note as its own summary without a provider', async () => {
    const response = await postSummarize({ content: ' learned the wiki ' });
    expect(await response.json()).toEqual({
      raw: 'learned the wiki',
      summary: 'learned the wiki',
      confirmed: false,
      requiresConfirmation: true,
    });
  });

  it('uses the Groq chat completions endpoint when Groq is configured', async () => {
    process.env.GROQ_API_KEY = 'groq-key';
    process.env.GROQ_MODEL = 'groq-model';
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ summary: ' AI summary ' }));
    const response = await postSummarize({ content: 'my note' });
    expect(await response.json()).toEqual({
      raw: 'my note',
      summary: 'AI summary',
      confirmed: false,
      requiresConfirmation: true,
    });
    expect(fetchSpy.mock.calls.length).toBe(1);
    const [calledUrl, calledInit] = fetchSpy.mock.calls[0];
    expect(calledUrl).toBe('https://api.groq.com/openai/v1/chat/completions');
    expect(calledInit?.method).toBe('POST');
  });

  it('sends the `{input}` body when the generic endpoint is configured', async () => {
    process.env.AI_API_BASE_URL = 'https://ai.example/summarize';
    process.env.AI_API_KEY = 'generic-key';
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ summary: 'generic summary' }));
    const response = await postSummarize({ content: 'my note' });
    expect(await response.json()).toEqual({
      raw: 'my note',
      summary: 'generic summary',
      confirmed: false,
      requiresConfirmation: true,
    });
    const init = fetchSpy.mock.calls[0][1];
    expect(JSON.parse(typeof init?.body === 'string' ? init.body : '')).toEqual({ input: 'my note' });
  });

  it('falls back to the heuristic when the provider request fails', async () => {
    process.env.GROQ_API_KEY = 'groq-key';
    process.env.GROQ_MODEL = 'groq-model';
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('boom', { status: 500 }));
    const response = await postSummarize({ content: 'c'.repeat(300) });
    expect(await response.json()).toEqual({
      raw: 'c'.repeat(300),
      summary: 'c'.repeat(237) + '…',
      confirmed: false,
      requiresConfirmation: true,
    });
  });
});
