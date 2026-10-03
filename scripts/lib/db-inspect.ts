/**
 * Read-only schema introspection: queries + stable, diffable formatting.
 * Output is one tab-separated line per row inside `== section ==` headers. Column order by
 * position is excluded by design (rows are sorted by table, column).
 */
import type { Sql } from 'postgres';

export interface ColumnRow {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

export interface ConstraintRow {
  table_name: string;
  constraint_name: string;
  definition: string;
}

export interface MigrationRow {
  id: number | string;
  hash: string;
  created_at: number | string | null;
}

export interface MigrationsInfo {
  present: boolean;
  rows: MigrationRow[];
}

export interface InspectResult {
  columns: ColumnRow[];
  constraints: ConstraintRow[];
  migrations: MigrationsInfo;
}

/** Keeps each record on one line with unambiguous tab separators. */
function cell(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  return String(value).replace(/\\/g, '\\\\').replace(/\t/g, '\\t').replace(/\r/g, '\\r').replace(/\n/g, '\\n');
}

function line(values: readonly unknown[]): string {
  return values.map(cell).join('\t');
}

/** Deterministic byte-order comparison (not locale dependent). */
function cmp(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function formatInspect(result: InspectResult): string {
  const out: string[] = [];
  out.push('== columns ==');
  out.push('table\tcolumn\ttype\tnullable\tdefault');
  [...result.columns]
    .sort((a, b) => cmp(a.table_name, b.table_name) || cmp(a.column_name, b.column_name))
    .forEach((r) => out.push(line([r.table_name, r.column_name, r.data_type, r.is_nullable, r.column_default])));

  out.push('== constraints ==');
  out.push('table\tname\tdefinition');
  [...result.constraints]
    .sort((a, b) => cmp(a.table_name, b.table_name) || cmp(a.constraint_name, b.constraint_name))
    .forEach((r) => out.push(line([r.table_name, r.constraint_name, r.definition])));

  out.push('== drizzle migrations ==');
  if (!result.migrations.present) {
    out.push('absent');
  } else {
    out.push('present');
    out.push('id\thash\tcreated_at');
    [...result.migrations.rows]
      .sort((a, b) => Number(a.id) - Number(b.id))
      .forEach((r) => out.push(line([r.id, r.hash, r.created_at])));
  }
  return out.join('\n') + '\n';
}

/** Runs the three read-only queries. Caller should connect with default_transaction_read_only=on. */
export async function inspectDatabase(sql: Sql): Promise<InspectResult> {
  const columns = await sql<ColumnRow[]>`
    SELECT table_name, column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY 1, 2`;
  const constraints = await sql<ConstraintRow[]>`
    SELECT c.conrelid::regclass::text AS table_name, c.conname AS constraint_name,
           pg_get_constraintdef(c.oid) AS definition
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE n.nspname = 'public' AND c.contype <> 'n'
    ORDER BY 1, 2`;
  const [{ present }] = await sql<{ present: boolean }[]>`
    SELECT to_regclass('drizzle.__drizzle_migrations') IS NOT NULL AS present`;
  const rows = present
    ? await sql<MigrationRow[]>`SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY id`
    : [];
  return {
    columns: [...columns],
    constraints: [...constraints],
    migrations: { present, rows: [...rows] },
  };
}
