import { GET } from './route';

const ENV_KEYS = [
  'GROQ_API_KEY',
  'GROQ_MODEL',
  'AI_API_BASE_URL',
  'AI_API_KEY',
  'GOOGLE_SHEETS_ID',
  'SHEETS_SCHEDULE_URL',
  'SHEETS_WRITE_URL',
  'SHEETS_DIARY_URL',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
] as const;

type HealthPayload = {
  status: string;
  mode: string;
  integrations: {
    sheets: boolean;
    sheetsRead: boolean;
    sheetsWrite: boolean;
    diaryWrite: boolean;
    oauth: boolean;
    ai: boolean;
  };
};

async function getHealth(): Promise<HealthPayload> {
  const response = await GET();
  return await response.json();
}

describe('GET /api/health', () => {
  const savedEnv = new Map<string, string | undefined>();

  beforeAll(() => {
    for (const key of ENV_KEYS) savedEnv.set(key, process.env[key]);
  });

  beforeEach(() => {
    for (const key of ENV_KEYS) delete process.env[key];
  });

  afterAll(() => {
    for (const [key, value] of savedEnv) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it('reports the full local-mode payload when nothing is configured', async () => {
    expect(await getHealth()).toEqual({
      status: 'ok',
      mode: 'local',
      integrations: { sheets: false, sheetsRead: false, sheetsWrite: false, diaryWrite: false, oauth: false, ai: false },
    });
  });

  it('reports ai configured when Groq is fully configured', async () => {
    process.env.GROQ_API_KEY = 'key';
    process.env.GROQ_MODEL = 'model';
    const payload = await getHealth();
    expect(payload.integrations.ai).toBe(true);
    expect(payload.mode).toBe('local');
  });

  it('reports ai configured when the generic endpoint is fully configured', async () => {
    process.env.AI_API_BASE_URL = 'https://ai.example/summarize';
    process.env.AI_API_KEY = 'key';
    expect((await getHealth()).integrations.ai).toBe(true);
  });

  it('reports ai unconfigured when credentials are partial', async () => {
    process.env.GROQ_API_KEY = 'key';
    process.env.AI_API_BASE_URL = 'https://ai.example/summarize';
    expect((await getHealth()).integrations.ai).toBe(false);
  });
});
