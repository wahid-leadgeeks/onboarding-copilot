import { filterCommands, type CommandItem } from './CommandPalette';

describe('CommandPalette filterCommands', () => {
  const dummyCommands: CommandItem[] = [
    {
      id: 'cmd-schedule',
      title: 'Schedule (Cockpit)',
      category: 'Pages',
      badge: '1',
      onSelect: () => {},
    },
    {
      id: 'cmd-diary',
      title: 'Diary (Onboarding Learnings)',
      category: 'Pages',
      badge: '3',
      onSelect: () => {},
    },
    {
      id: 'cmd-topic-growth',
      title: 'Growth Department Introduction',
      category: 'Schedule Topics',
      badge: 'Row 15',
      keywords: 'Ahmad Week 1 Monday',
      onSelect: () => {},
    },
  ];

  it('returns all commands when search query is empty or whitespace', () => {
    expect(filterCommands(dummyCommands, '')).toHaveLength(3);
    expect(filterCommands(dummyCommands, '   ')).toHaveLength(3);
  });

  it('filters commands by title case-insensitively', () => {
    const results = filterCommands(dummyCommands, 'diary');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('cmd-diary');
  });

  it('filters commands by category', () => {
    const results = filterCommands(dummyCommands, 'schedule topics');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('cmd-topic-growth');
  });

  it('filters commands by badge (e.g. Row 15)', () => {
    const results = filterCommands(dummyCommands, 'row 15');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('cmd-topic-growth');
  });

  it('filters commands by keywords (e.g. PIC or Day)', () => {
    const results = filterCommands(dummyCommands, 'ahmad');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('cmd-topic-growth');
  });

  it('returns empty array when nothing matches', () => {
    const results = filterCommands(dummyCommands, 'nonexistent topic 999');
    expect(results).toHaveLength(0);
  });
});
