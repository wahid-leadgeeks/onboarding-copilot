import {
  DEFAULT_GROQ_BASE_URL,
  buildSummarizeRequest,
  resolveSummarizeProvider,
  summarizeConfigured,
} from './providers';

describe('resolveSummarizeProvider', () => {
  it('returns null when nothing is configured', () => {
    expect(resolveSummarizeProvider({})).toBe(null);
  });

  it('returns null when Groq is only partially configured', () => {
    expect(resolveSummarizeProvider({ GROQ_API_KEY: 'key' })).toBe(null);
    expect(resolveSummarizeProvider({ GROQ_MODEL: 'model' })).toBe(null);
    expect(resolveSummarizeProvider({ GROQ_API_KEY: 'key', GROQ_BASE_URL: 'https://groq.example/chat' })).toBe(null);
  });

  it('treats empty strings as unconfigured', () => {
    expect(resolveSummarizeProvider({ GROQ_API_KEY: '', GROQ_MODEL: '' })).toBe(null);
    expect(resolveSummarizeProvider({ AI_API_BASE_URL: '', AI_API_KEY: '' })).toBe(null);
  });

  it('resolves a fully configured Groq provider with the default chat completions URL', () => {
    expect(resolveSummarizeProvider({ GROQ_API_KEY: 'key', GROQ_MODEL: 'llama-test' })).toEqual({
      kind: 'groq',
      url: 'https://api.groq.com/openai/v1/chat/completions',
      token: 'key',
      model: 'llama-test',
    });
  });

  it('uses the GROQ_BASE_URL override when provided', () => {
    expect(resolveSummarizeProvider({
      GROQ_API_KEY: 'key',
      GROQ_MODEL: 'llama-test',
      GROQ_BASE_URL: 'https://proxy.example/v1/chat/completions',
    })).toEqual({
      kind: 'groq',
      url: 'https://proxy.example/v1/chat/completions',
      token: 'key',
      model: 'llama-test',
    });
  });

  it('resolves a fully configured generic endpoint', () => {
    expect(resolveSummarizeProvider({ AI_API_BASE_URL: 'https://ai.example/summarize', AI_API_KEY: 'key' })).toEqual({
      kind: 'generic',
      url: 'https://ai.example/summarize',
      token: 'key',
    });
  });

  it('returns null when the generic endpoint is only partially configured', () => {
    expect(resolveSummarizeProvider({ AI_API_BASE_URL: 'https://ai.example/summarize' })).toBe(null);
    expect(resolveSummarizeProvider({ AI_API_KEY: 'key' })).toBe(null);
  });

  it('prefers Groq when Groq and the generic endpoint are both fully configured', () => {
    expect(resolveSummarizeProvider({
      GROQ_API_KEY: 'groq-key',
      GROQ_MODEL: 'groq-model',
      AI_API_BASE_URL: 'https://ai.example/summarize',
      AI_API_KEY: 'generic-key',
    })).toEqual({
      kind: 'groq',
      url: DEFAULT_GROQ_BASE_URL,
      token: 'groq-key',
      model: 'groq-model',
    });
  });

  it('falls back to the generic endpoint when Groq is incomplete', () => {
    expect(resolveSummarizeProvider({
      GROQ_API_KEY: 'groq-key',
      AI_API_BASE_URL: 'https://ai.example/summarize',
      AI_API_KEY: 'generic-key',
    })).toEqual({ kind: 'generic', url: 'https://ai.example/summarize', token: 'generic-key' });
  });
});

describe('summarizeConfigured', () => {
  it('is false when no provider resolves', () => {
    expect(summarizeConfigured({})).toBe(false);
    expect(summarizeConfigured({ GROQ_API_KEY: 'key', AI_API_BASE_URL: 'https://ai.example/summarize' })).toBe(false);
  });

  it('is true when Groq or the generic endpoint is fully configured', () => {
    expect(summarizeConfigured({ GROQ_API_KEY: 'key', GROQ_MODEL: 'llama-test' })).toBe(true);
    expect(summarizeConfigured({ AI_API_BASE_URL: 'https://ai.example/summarize', AI_API_KEY: 'key' })).toBe(true);
  });
});

describe('buildSummarizeRequest', () => {
  it('builds an OpenAI-compatible chat completions request for Groq', () => {
    const request = buildSummarizeRequest(
      { kind: 'groq', url: 'https://groq.example/chat/completions', token: 'groq-key', model: 'groq-model' },
      'My raw learning note',
    );
    expect(request.url).toBe('https://groq.example/chat/completions');
    expect(new Headers(request.headers).get('authorization')).toBe('Bearer groq-key');
    expect(new Headers(request.headers).get('content-type')).toBe('application/json');
    const body = JSON.parse(request.body);
    expect(body.model).toBe('groq-model');
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0].role).toBe('system');
    expect(/\S/.test(body.messages[0].content)).toBe(true);
    expect(body.messages[1].role).toBe('user');
    expect(body.messages[1].content).toBe('My raw learning note');
    expect(body.temperature).toBe(0.3);
    expect(body.max_tokens).toBe(1024);
  });

  it('builds the `{input}` request for the generic endpoint', () => {
    const request = buildSummarizeRequest(
      { kind: 'generic', url: 'https://ai.example/summarize', token: 'generic-key' },
      'My raw learning note',
    );
    expect(request.url).toBe('https://ai.example/summarize');
    expect(new Headers(request.headers).get('authorization')).toBe('Bearer generic-key');
    expect(new Headers(request.headers).get('content-type')).toBe('application/json');
    expect(JSON.parse(request.body)).toEqual({ input: 'My raw learning note' });
  });
});
