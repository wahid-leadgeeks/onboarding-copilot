import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  DATABASE_URL_REQUIRED,
  assertNotUnderJest,
  assertWriteAllowed,
  emptyPlan,
  formatPlan,
  loadRowsFile,
  maskUrl,
  normalizeNullable,
  normalizeText,
  openDatabaseTarget,
  parseSyncArgs,
  resolveDatabaseUrl,
  type SyncArgs,
} from './sync-common';

type BooleanKey = Exclude<keyof SyncArgs, 'url' | 'file'>;

const LOCAL = 'postgres://postgres@127.0.0.1:54329/test';
const tempDirs: string[] = [];

function tempDir(envLocal?: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-common-'));
  tempDirs.push(dir);
  if (envLocal !== undefined) fs.writeFileSync(path.join(dir, '.env.local'), envLocal);
  return dir;
}

afterAll(() => {
  for (const dir of tempDirs) fs.rmSync(dir, { recursive: true, force: true });
});

describe('parseSyncArgs', () => {
  it('defaults to a dry run with no flags', () => {
    expect(parseSyncArgs([])).toEqual({
      apply: false,
      prune: false,
      force: false,
      forcePrune: false,
      allowEnvFile: false,
    });
  });

  const FLAG_KEYS: [string, BooleanKey][] = [
    ['--apply', 'apply'],
    ['--prune', 'prune'],
    ['--force', 'force'],
    ['--force-prune', 'forcePrune'],
    ['--allow-env-file', 'allowEnvFile'],
  ];

  it('each boolean flag sets only its own key', () => {
    for (const [flag, key] of FLAG_KEYS) {
      const args = parseSyncArgs([flag]);
      for (const [, k] of FLAG_KEYS) expect(args[k]).toBe(k === key);
    }
  });

  it('--allow-non-empty is accepted, absent by default and independent of --force', () => {
    expect(parseSyncArgs([]).allowNonEmpty).toBeUndefined();
    expect(parseSyncArgs(['--allow-non-empty'])).toEqual({
      apply: false,
      prune: false,
      force: false,
      forcePrune: false,
      allowEnvFile: false,
      allowNonEmpty: true,
    });
    expect(parseSyncArgs(['--force']).allowNonEmpty).toBeUndefined();
  });

  it('--force does not imply --force-prune', () => {
    expect(parseSyncArgs(['--force']).forcePrune).toBe(false);
  });

  it('reads --file <path> and --file=<path>', () => {
    expect(parseSyncArgs(['--file', 'a.json']).file).toBe('a.json');
    expect(parseSyncArgs(['--file=b.json']).file).toBe('b.json');
  });

  it('rejects --file without a value or given twice', () => {
    expect(() => parseSyncArgs(['--file'])).toThrow('--file requires a path');
    expect(() => parseSyncArgs(['--file', '--apply'])).toThrow('--file requires a path');
    expect(() => parseSyncArgs(['--file='])).toThrow('--file requires a path');
    expect(() => parseSyncArgs(['--file', 'a', '--file', 'b'])).toThrow('more than once');
  });

  it('takes one positional URL', () => {
    const args = parseSyncArgs([LOCAL, '--apply', '--file', 'x.json']);
    expect(args).toEqual({ url: LOCAL, file: 'x.json', apply: true, prune: false, force: false, forcePrune: false, allowEnvFile: false });
  });

  it('rejects two positionals', () => {
    expect(() => parseSyncArgs([LOCAL, 'postgres://other/x'])).toThrow('At most one positional');
  });

  it('ignores a leading -- only', () => {
    const args = parseSyncArgs(['--', '--apply', LOCAL]);
    expect(args.apply).toBe(true);
    expect(args.url).toBe(LOCAL);
    expect(() => parseSyncArgs(['--apply', '--'])).toThrow('Unknown flag: --');
  });

  it('throws on unknown flags', () => {
    expect(() => parseSyncArgs(['--aply'])).toThrow('Unknown flag: --aply');
    expect(() => parseSyncArgs(['-f'])).toThrow('Unknown flag: -f');
    expect(() => parseSyncArgs(['--no-such-flag'])).toThrow('Unknown flag: --no-such-flag');
  });
});

describe('resolveDatabaseUrl', () => {
  it('prefers the positional URL over env and .env.local', () => {
    const cwd = tempDir('DATABASE_URL=postgres://file@127.0.0.1/f\n');
    expect(resolveDatabaseUrl({ positional: LOCAL, env: { DATABASE_URL: 'postgres://env@127.0.0.1/e' }, cwd })).toEqual({
      url: LOCAL,
      source: 'positional',
    });
  });

  it('uses env before .env.local', () => {
    const cwd = tempDir('DATABASE_URL=postgres://file@127.0.0.1/f\n');
    expect(resolveDatabaseUrl({ env: { DATABASE_URL: 'postgres://env@127.0.0.1/e' }, cwd })).toEqual({
      url: 'postgres://env@127.0.0.1/e',
      source: 'env',
    });
  });

  it('does not read .env.local when env is set', () => {
    const cwd = tempDir();
    const spy = jest.spyOn(fs, 'readFileSync');
    try {
      resolveDatabaseUrl({ env: { DATABASE_URL: LOCAL }, cwd });
      expect(spy.mock.calls.length).toBe(0);
    } finally {
      spy.mockRestore();
    }
  });

  it('falls back to .env.local in cwd, stripping quotes, CR, and using the last definition', () => {
    const cwd = tempDir(
      'OTHER=1\r\nDATABASE_URL=postgres://old@127.0.0.1/o\r\nDATABASE_URL="postgres://file@127.0.0.1/f"\r\n',
    );
    expect(resolveDatabaseUrl({ env: {}, cwd })).toEqual({
      url: 'postgres://file@127.0.0.1/f',
      source: '.env.local',
    });
  });

  it('throws the required message when no source has a URL', () => {
    expect(() => resolveDatabaseUrl({ env: {}, cwd: tempDir() })).toThrow(DATABASE_URL_REQUIRED);
    expect(() => resolveDatabaseUrl({ env: {}, cwd: tempDir('OTHER=1\n') })).toThrow('DATABASE_URL is required');
    expect(() => resolveDatabaseUrl({ env: { DATABASE_URL: '' }, cwd: tempDir('DATABASE_URL=\n') })).toThrow(
      'DATABASE_URL is required',
    );
  });

  it('treats an unreadable .env.local as absent', () => {
    const cwd = tempDir();
    fs.mkdirSync(path.join(cwd, '.env.local')); // reading a directory throws EISDIR
    expect(() => resolveDatabaseUrl({ env: {}, cwd })).toThrow('DATABASE_URL is required');
  });
});

describe('assertWriteAllowed', () => {
  it('refuses writes from .env.local without --allow-env-file', () => {
    expect(() => assertWriteAllowed('.env.local', false)).toThrow('--allow-env-file');
  });

  it('allows .env.local with --allow-env-file and explicit sources always', () => {
    expect(() => assertWriteAllowed('.env.local', true)).not.toThrow();
    expect(() => assertWriteAllowed('env', false)).not.toThrow();
    expect(() => assertWriteAllowed('positional', false)).not.toThrow();
  });
});

describe('openDatabaseTarget', () => {
  it('refused write: prints the target, then throws without calling the client factory', () => {
    const cwd = tempDir('DATABASE_URL=postgres://u:secret@127.0.0.1:54329/x\n');
    const createClient = jest.fn();
    const log = jest.fn();
    expect(() => openDatabaseTarget({ env: {}, cwd, write: true, allowEnvFile: false, createClient, log })).toThrow(
      '--allow-env-file',
    );
    expect(createClient.mock.calls.length).toBe(0);
    expect(log.mock.calls).toEqual([['Target: postgres://u:****@127.0.0.1:54329/x (source: .env.local)']]);
  });

  it('missing URL: throws before printing or connecting', () => {
    const createClient = jest.fn();
    const log = jest.fn();
    expect(() =>
      openDatabaseTarget({ env: {}, cwd: tempDir(), write: false, allowEnvFile: false, createClient, log }),
    ).toThrow('DATABASE_URL is required');
    expect(createClient.mock.calls.length).toBe(0);
    expect(log.mock.calls.length).toBe(0);
  });

  it('dry run may use .env.local; prints before creating the client', () => {
    const cwd = tempDir(`DATABASE_URL=${LOCAL}\n`);
    const order: string[] = [];
    const result = openDatabaseTarget({
      env: {},
      cwd,
      write: false,
      allowEnvFile: false,
      log: (line) => order.push(`log:${line}`),
      createClient: (url) => {
        order.push(`client:${url}`);
        return 'client';
      },
    });
    expect(result).toEqual({ url: LOCAL, source: '.env.local', client: 'client' });
    expect(order).toEqual([`log:Target: ${LOCAL} (source: .env.local)`, `client:${LOCAL}`]);
  });

  it('allowed writes create the client', () => {
    const createClient = jest.fn(() => 'c');
    const log = jest.fn();
    expect(
      openDatabaseTarget({ env: { DATABASE_URL: LOCAL }, cwd: tempDir(), write: true, allowEnvFile: false, createClient, log })
        .source,
    ).toBe('env');
    const cwd = tempDir(`DATABASE_URL=${LOCAL}\n`);
    openDatabaseTarget({ env: {}, cwd, write: true, allowEnvFile: true, createClient, log });
    expect(createClient.mock.calls.length).toBe(2);
  });
});

describe('maskUrl', () => {
  it('masks a password that contains ":"', () => {
    const masked = maskUrl('postgres://user:pa:ss@db.example.com:5432/app');
    expect(masked).toBe('postgres://user:****@db.example.com:5432/app');
    expect(masked).not.toContain('pa');
    expect(masked).not.toContain('ss@');
  });

  it('masks percent-encoded passwords and password query params', () => {
    const masked = maskUrl('postgresql://user:p%40ss@db.example.com/app?sslmode=require&password=qq');
    expect(masked).not.toContain('p%40ss');
    expect(masked).not.toContain('qq');
    expect(masked).toContain('user:****@db.example.com');
  });

  it('leaves URLs without a password unchanged', () => {
    expect(maskUrl(LOCAL)).toBe(LOCAL);
  });

  it('returns a placeholder for unparseable input', () => {
    expect(maskUrl('not a url secret')).toBe('<unparseable url>');
  });
});

describe('assertNotUnderJest', () => {
  it('throws when JEST_WORKER_ID is set', () => {
    expect(() => assertNotUnderJest({ JEST_WORKER_ID: '1' })).toThrow('must not run under jest');
    expect(() => assertNotUnderJest()).toThrow('must not run under jest');
  });

  it('passes outside jest', () => {
    expect(() => assertNotUnderJest({})).not.toThrow();
  });
});

describe('loadRowsFile', () => {
  function writeFile(content: string): string {
    const file = path.join(tempDir(), 'rows.json');
    fs.writeFileSync(file, content);
    return file;
  }

  it('returns the rows array', () => {
    expect(loadRowsFile(writeFile('{"version":1,"rows":[{"id":"row-190"}]}'))).toEqual([{ id: 'row-190' }]);
  });

  it('loads the example fixtures', () => {
    const root = path.join(__dirname, '..', '..', 'data', 'examples');
    expect(loadRowsFile(path.join(root, 'diary.example.json')).length).toBeGreaterThan(0);
    expect(loadRowsFile(path.join(root, 'schedule.example.json')).length).toBeGreaterThan(0);
  });

  it('reports a missing file', () => {
    expect(() => loadRowsFile(path.join(tempDir(), 'missing.json'))).toThrow(/Cannot read rows file .*ENOENT/);
  });

  it('reports invalid JSON', () => {
    expect(() => loadRowsFile(writeFile('{"version":1,'))).toThrow('is not valid JSON');
  });

  it('rejects non-object roots, wrong versions and missing rows', () => {
    expect(() => loadRowsFile(writeFile('[]'))).toThrow('must be an object');
    expect(() => loadRowsFile(writeFile('null'))).toThrow('must be an object');
    expect(() => loadRowsFile(writeFile('{"rows":[]}'))).toThrow('unsupported version undefined');
    expect(() => loadRowsFile(writeFile('{"version":2,"rows":[]}'))).toThrow('unsupported version 2');
    expect(() => loadRowsFile(writeFile('{"version":1}'))).toThrow('"rows" array');
    expect(() => loadRowsFile(writeFile('{"version":1,"rows":{}}'))).toThrow('"rows" array');
  });
});

describe('normalization', () => {
  it('normalizeText: null/undefined -> "", CRLF -> LF, trims', () => {
    expect(normalizeText(null)).toBe('');
    expect(normalizeText(undefined)).toBe('');
    expect(normalizeText('  a\r\nb \r\n')).toBe('a\nb');
    expect(normalizeText('a\r\nb')).toBe(normalizeText('a\nb'));
    expect(normalizeText('Catatan: belajar ✓')).toBe('Catatan: belajar ✓');
  });

  it('normalizeNullable: empty text == NULL, numbers kept including 0', () => {
    expect(normalizeNullable('')).toBeNull();
    expect(normalizeNullable('  \r\n ')).toBeNull();
    expect(normalizeNullable(null)).toBeNull();
    expect(normalizeNullable(undefined)).toBeNull();
    expect(normalizeNullable(' x ')).toBe('x');
    expect(normalizeNullable(0)).toBe(0);
    expect(normalizeNullable(45)).toBe(45);
  });
});

describe('formatPlan', () => {
  it('summarizes an empty plan', () => {
    expect(formatPlan(emptyPlan())).toBe(
      'Inserts: 0, updates: 0, unchanged: 0, deletes: 0, conflicts: 0, rejections: 0, blockers: 0',
    );
  });

  it('prints index, raw rowNumber and reason for every rejection', () => {
    const plan = emptyPlan<{ id: string }>();
    plan.rejections.push({ index: 3, rowNumber: 15, id: 'row-14', reason: 'id does not match rowNumber' });
    plan.rejections.push({ index: 7, rowNumber: '9x', reason: 'rowNumber must be an integer' });
    plan.rejections.push({ index: 8, reason: 'row must be an object' });
    const lines = formatPlan(plan).split('\n');
    expect(lines).toContain('  REJECTED row #3 in file (rowNumber 15, id row-14): id does not match rowNumber');
    expect(lines).toContain('  REJECTED row #7 in file (rowNumber "9x"): rowNumber must be an integer');
    expect(lines).toContain('  REJECTED row #8 in file (rowNumber undefined): row must be an object');
  });

  it('lists inserts, field-level updates, deletes, conflicts and blockers', () => {
    const plan = emptyPlan<{ id: string }>();
    plan.inserts.push({ id: 'row-190' });
    plan.updates.push({ id: 'row-191', changes: { topic: { from: 'Old', to: 'New' } } });
    plan.unchanged.push('row-192');
    plan.deletes.push({ id: 'row-99', detail: 'not in file' });
    plan.conflicts.push({ id: 'entry-5', field: 'notes', db: 'db text', file: 'file text' });
    plan.blockers.push({ id: 'sched-row-4', reason: 'referenced by session_logs' });
    const text = formatPlan(plan);
    expect(text).toContain('Inserts: 1, updates: 1, unchanged: 1, deletes: 1, conflicts: 1, rejections: 0, blockers: 1');
    expect(text).toContain('  INSERT row-190');
    expect(text).toContain('  UPDATE row-191: topic: "Old" -> "New"');
    expect(text).toContain('  DELETE row-99 (not in file)');
    expect(text).toContain('  CONFLICT entry-5.notes: db "db text" vs file "file text"');
    expect(text).toContain('  BLOCKED sched-row-4: referenced by session_logs');
  });
});
