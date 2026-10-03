import { formatInspect, type InspectResult } from './db-inspect';

const base: InspectResult = {
  columns: [
    { table_name: 'b', column_name: 'z', data_type: 'text', is_nullable: 'NO', column_default: null },
    { table_name: 'a', column_name: 'y', data_type: 'integer', is_nullable: 'YES', column_default: "'x\ty'::text" },
    { table_name: 'a', column_name: 'x', data_type: 'text', is_nullable: 'NO', column_default: "''::text" },
  ],
  constraints: [
    { table_name: 'b', constraint_name: 'b_pkey', definition: 'PRIMARY KEY (id)' },
    { table_name: 'a', constraint_name: 'a_key', definition: 'UNIQUE (x)' },
  ],
  migrations: { present: false, rows: [] },
};

describe('formatInspect', () => {
  it('emits the three sections in order with sorted, tab-separated rows', () => {
    const lines = formatInspect(base).split('\n');
    expect(lines.filter((l) => l.startsWith('== '))).toEqual([
      '== columns ==',
      '== constraints ==',
      '== drizzle migrations ==',
    ]);
    const cols = lines.slice(lines.indexOf('== columns ==') + 2, lines.indexOf('== constraints =='));
    expect(cols).toEqual([
      "a\tx\ttext\tNO\t''::text",
      "a\ty\tinteger\tYES\t'x\\ty'::text",
      'b\tz\ttext\tNO\tNULL',
    ]);
    const cons = lines.slice(lines.indexOf('== constraints ==') + 2, lines.indexOf('== drizzle migrations =='));
    expect(cons).toEqual(['a\ta_key\tUNIQUE (x)', 'b\tb_pkey\tPRIMARY KEY (id)']);
  });

  it('reports an absent drizzle table without rows', () => {
    expect(formatInspect(base).endsWith('== drizzle migrations ==\nabsent\n')).toBe(true);
  });

  it('prints present migrations sorted by id', () => {
    const out = formatInspect({
      ...base,
      migrations: {
        present: true,
        rows: [
          { id: 2, hash: 'bbb', created_at: '200' },
          { id: 1, hash: 'aaa', created_at: '100' },
        ],
      },
    });
    expect(out.endsWith('present\nid\thash\tcreated_at\n1\taaa\t100\n2\tbbb\t200\n')).toBe(true);
  });

  it('is stable regardless of input order', () => {
    const reversed: InspectResult = {
      ...base,
      columns: [...base.columns].reverse(),
      constraints: [...base.constraints].reverse(),
    };
    expect(formatInspect(reversed)).toBe(formatInspect(base));
  });
});
