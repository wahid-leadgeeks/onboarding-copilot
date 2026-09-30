/**
 * Shared helpers for the JSON -> database sync entries (sync:diary, sync:schedule) and the
 * other DB entries (db:migrate, db:seed, db:inspect).
 *
 * Rules (see docs/DATABASE.md once written):
 * - Relative imports only, so `tsx` works from any cwd. From lib/db only `ssl.ts` is imported.
 * - Entry order: resolveDatabaseUrl -> print Target + source -> assertWriteAllowed -> create
 *   the client. `openDatabaseTarget` enforces that order; a refused write makes zero connections.
 * - `.env.local` is resolved relative to the cwd and read only when DATABASE_URL is unset.
 */
import fs from 'fs';
import path from 'path';

export { resolveSslOption } from '../../lib/db/ssl';

// ---------------------------------------------------------------------------
// Arguments
// ---------------------------------------------------------------------------

export interface SyncArgs {
  /** Optional positional database URL. */
  url?: string;
  /** Path given with `--file`. */
  file?: string;
  /** Write changes. Without it the run is a dry run. */
  apply: boolean;
  /** List (dry run) or delete (with --apply) rows missing from the file. */
  prune: boolean;
  /** Overwrite protected working-field conflicts. */
  force: boolean;
  /** Allow pruning rows that contain user text. */
  forcePrune: boolean;
  /** Permit writes when the URL came from .env.local. */
  allowEnvFile: boolean;
}

const BOOLEAN_FLAGS: Record<string, keyof Omit<SyncArgs, 'url' | 'file'>> = {
  '--apply': 'apply',
  '--prune': 'prune',
  '--force': 'force',
  '--force-prune': 'forcePrune',
  '--allow-env-file': 'allowEnvFile',
};

/** Parses `process.argv.slice(2)`. Throws on unknown flags, a missing --file value, or 2+ positionals. */
export function parseSyncArgs(argv: readonly string[]): SyncArgs {
  const args: SyncArgs = {
    apply: false,
    prune: false,
    force: false,
    forcePrune: false,
    allowEnvFile: false,
  };
  // `pnpm run x -- --apply` may forward a leading `--`; ignore it only in first position.
  const rest = argv[0] === '--' ? argv.slice(1) : [...argv];

  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg in BOOLEAN_FLAGS) {
      args[BOOLEAN_FLAGS[arg]] = true;
      continue;
    }
    if (arg === '--file' || arg.startsWith('--file=')) {
      if (args.file !== undefined) throw new Error('--file given more than once.');
      const value = arg === '--file' ? rest[++i] : arg.slice('--file='.length);
      if (value === undefined || value === '' || value.startsWith('--')) {
        throw new Error('--file requires a path.');
      }
      args.file = value;
      continue;
    }
    if (arg.startsWith('-')) {
      throw new Error(`Unknown flag: ${arg}`);
    }
    if (args.url !== undefined) {
      throw new Error('At most one positional argument (the database URL) is allowed.');
    }
    args.url = arg;
  }
  return args;
}

// ---------------------------------------------------------------------------
// Database URL resolution
// ---------------------------------------------------------------------------

/** process.env-like map (avoids Next's required NODE_ENV in NodeJS.ProcessEnv). */
export type EnvLike = Record<string, string | undefined>;

export type UrlSource = 'positional' | 'env' | '.env.local';

export interface ResolvedDatabaseUrl {
  url: string;
  source: UrlSource;
}

export interface ResolveDatabaseUrlOptions {
  positional?: string;
  /** Defaults to process.env. */
  env?: EnvLike;
  /** Directory holding .env.local. Defaults to process.cwd(). */
  cwd?: string;
}

export const DATABASE_URL_REQUIRED =
  'DATABASE_URL is required. Pass it as the positional argument, set DATABASE_URL, or define it in .env.local in the current directory.';

/** Reads DATABASE_URL from `<cwd>/.env.local`. Returns undefined if the file or key is missing or unreadable. */
function readEnvLocalDatabaseUrl(cwd: string): string | undefined {
  let content: string;
  try {
    content = fs.readFileSync(path.join(cwd, '.env.local'), 'utf8');
  } catch {
    return undefined;
  }
  let value: string | undefined;
  for (const rawLine of content.split('\n')) {
    const line = rawLine.replace(/\r$/, '');
    if (!line.startsWith('DATABASE_URL=')) continue;
    let v = line.slice('DATABASE_URL='.length).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    value = v;
  }
  return value || undefined;
}

/** positional -> env -> .env.local (read only when env is unset). Throws when none is set. */
export function resolveDatabaseUrl(options: ResolveDatabaseUrlOptions = {}): ResolvedDatabaseUrl {
  const env = options.env ?? process.env;
  if (options.positional) return { url: options.positional, source: 'positional' };
  if (env.DATABASE_URL) return { url: env.DATABASE_URL, source: 'env' };
  const fromFile = readEnvLocalDatabaseUrl(options.cwd ?? process.cwd());
  if (fromFile) return { url: fromFile, source: '.env.local' };
  throw new Error(DATABASE_URL_REQUIRED);
}

/** Refuses writes against a URL that came from .env.local unless --allow-env-file was given. */
export function assertWriteAllowed(source: UrlSource, allowEnvFile: boolean): void {
  if (source === '.env.local' && !allowEnvFile) {
    throw new Error(
      'Refusing to write: the database URL came from .env.local. Pass the URL explicitly (positional or DATABASE_URL), or add --allow-env-file to confirm.',
    );
  }
}

export interface OpenDatabaseTargetOptions<C> extends ResolveDatabaseUrlOptions {
  /** True for --apply, migrate and seed. */
  write: boolean;
  allowEnvFile: boolean;
  /** Called only after the target is printed and the write check passed. */
  createClient: (url: string) => C;
  /** Defaults to console.log. */
  log?: (line: string) => void;
}

/** Enforces the entry order: resolve -> print -> assertWriteAllowed -> createClient. */
export function openDatabaseTarget<C>(
  options: OpenDatabaseTargetOptions<C>,
): ResolvedDatabaseUrl & { client: C } {
  const resolved = resolveDatabaseUrl(options);
  const log = options.log ?? ((line: string) => console.log(line));
  log(`Target: ${maskUrl(resolved.url)} (source: ${resolved.source})`);
  if (options.write) assertWriteAllowed(resolved.source, options.allowEnvFile);
  return { ...resolved, client: options.createClient(resolved.url) };
}

/** Replaces the password (and any `password` query param) with ****. */
export function maskUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.password) parsed.password = '****';
    if (parsed.searchParams.has('password')) parsed.searchParams.set('password', '****');
    return parsed.toString();
  } catch {
    return '<unparseable url>';
  }
}

/** Entry scripts call this first so a test can never run one by importing it. */
export function assertNotUnderJest(env: EnvLike = process.env): void {
  if (env.JEST_WORKER_ID !== undefined) {
    throw new Error('Sync/DB entry scripts must not run under jest. Import scripts/lib/* instead.');
  }
}

// ---------------------------------------------------------------------------
// Rows file
// ---------------------------------------------------------------------------

export const ROWS_FILE_VERSION = 1;

/** Loads `{ "version": 1, "rows": [...] }`. Rows are returned unvalidated. */
export function loadRowsFile(filePath: string): unknown[] {
  let content: string;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code ?? 'unknown error';
    throw new Error(`Cannot read rows file ${filePath} (${code}).`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    throw new Error(`Rows file ${filePath} is not valid JSON: ${(error as Error).message}`);
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`Rows file ${filePath} must be an object { "version": 1, "rows": [...] }.`);
  }
  const record = parsed as Record<string, unknown>;
  if (record.version !== ROWS_FILE_VERSION) {
    throw new Error(
      `Rows file ${filePath} has unsupported version ${JSON.stringify(record.version)} (expected ${ROWS_FILE_VERSION}).`,
    );
  }
  if (!Array.isArray(record.rows)) {
    throw new Error(`Rows file ${filePath} must have a "rows" array.`);
  }
  return record.rows;
}

// ---------------------------------------------------------------------------
// Normalization (D3): '' == NULL; text compared after CRLF -> LF and trim().
// ---------------------------------------------------------------------------

/** null/undefined -> ''; strings: CRLF -> LF, then trim. */
export function normalizeText(value: string | null | undefined): string {
  if (value === null || value === undefined) return '';
  return value.replace(/\r\n/g, '\n').trim();
}

/** Text normalized as above with '' -> null; numbers kept (0 is not empty); null/undefined -> null. */
export function normalizeNullable(value: string | number | null | undefined): string | number | null {
  if (typeof value === 'number') return value;
  const text = normalizeText(value);
  return text === '' ? null : text;
}

// ---------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------

export interface Rejection {
  /** 1-based position in the file's rows array. */
  index: number;
  /** Raw rowNumber as found in the file (may be invalid). */
  rowNumber?: unknown;
  id?: string;
  reason: string;
}

export interface FieldChange {
  from: unknown;
  to: unknown;
}

export interface PlanUpdate {
  id: string;
  changes: Record<string, FieldChange>;
}

export interface Conflict {
  id: string;
  field: string;
  db: unknown;
  file: unknown;
}

export interface PlanDelete {
  id: string;
  detail?: string;
}

export interface Blocker {
  id?: string;
  reason: string;
}

export interface Plan<Row = unknown> {
  inserts: Row[];
  updates: PlanUpdate[];
  /** Ids whose rows already match the file. */
  unchanged: string[];
  deletes: PlanDelete[];
  conflicts: Conflict[];
  rejections: Rejection[];
  blockers: Blocker[];
}

export function emptyPlan<Row = unknown>(): Plan<Row> {
  return { inserts: [], updates: [], unchanged: [], deletes: [], conflicts: [], rejections: [], blockers: [] };
}

function show(value: unknown): string {
  if (value === undefined) return 'undefined';
  const text = JSON.stringify(value);
  return text.length > 80 ? `${text.slice(0, 77)}...` : text;
}

function rowId(row: unknown): string {
  if (typeof row === 'object' && row !== null && 'id' in row) {
    return String((row as { id: unknown }).id);
  }
  return show(row);
}

/** Human-readable plan summary; every rejection line includes its file index and raw rowNumber. */
export function formatPlan(plan: Plan): string {
  const lines: string[] = [
    `Inserts: ${plan.inserts.length}, updates: ${plan.updates.length}, unchanged: ${plan.unchanged.length}, ` +
      `deletes: ${plan.deletes.length}, conflicts: ${plan.conflicts.length}, rejections: ${plan.rejections.length}, ` +
      `blockers: ${plan.blockers.length}`,
  ];
  for (const row of plan.inserts) lines.push(`  INSERT ${rowId(row)}`);
  for (const update of plan.updates) {
    const fields = Object.entries(update.changes)
      .map(([field, change]) => `${field}: ${show(change.from)} -> ${show(change.to)}`)
      .join('; ');
    lines.push(`  UPDATE ${update.id}: ${fields}`);
  }
  for (const del of plan.deletes) lines.push(`  DELETE ${del.id}${del.detail ? ` (${del.detail})` : ''}`);
  for (const c of plan.conflicts) {
    lines.push(`  CONFLICT ${c.id}.${c.field}: db ${show(c.db)} vs file ${show(c.file)}`);
  }
  for (const r of plan.rejections) {
    lines.push(
      `  REJECTED row #${r.index} in file (rowNumber ${show(r.rowNumber)}${r.id !== undefined ? `, id ${r.id}` : ''}): ${r.reason}`,
    );
  }
  for (const b of plan.blockers) lines.push(`  BLOCKED${b.id !== undefined ? ` ${b.id}` : ''}: ${b.reason}`);
  return lines.join('\n');
}
