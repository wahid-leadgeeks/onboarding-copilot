import { exportFileName, notesToCsv, notesToMarkdown } from './export-notes';
import type { ExportableNote } from './export-notes';

const DIARY = 'diary' as const;

const CSV_HEADER =
  '"Type","Created At","Content","Activity ID","Activity Name","Source","Updated At"\r\n';

describe('notesToCsv', () => {
  it('writes a BOM, header, and one RFC4180 row per legacy note', () => {
    const notes: ExportableNote[] = [
      { kind: DIARY, content: 'Completed the security module.', createdAt: '2026-09-03T09:05:00.000Z' },
    ];
    expect(notesToCsv(notes)).toBe(
      `\uFEFF${CSV_HEADER}` +
        '"Learning note","2026-09-03T09:05:00.000Z","Completed the security module.","","","",""\r\n',
    );
  });

  it('quotes, doubles, and keeps literal commas, quotes, and newlines in content', () => {
    const notes: ExportableNote[] = [
      { kind: 'quick-note', content: 'Line 1, has "quotes"\nLine 2', createdAt: '2026-09-03T09:05:00.000Z' },
    ];
    expect(notesToCsv(notes)).toBe(
      `\uFEFF${CSV_HEADER}` +
        '"Quick note","2026-09-03T09:05:00.000Z","Line 1, has ""quotes""\nLine 2","","","",""\r\n',
    );
  });

  it('starts with the UTF-8 BOM', () => {
    const notes: ExportableNote[] = [
      { kind: DIARY, content: 'anything', createdAt: '2026-09-03T09:05:00.000Z' },
    ];
    expect(notesToCsv(notes).charCodeAt(0)).toBe(0xfeff);
  });

  it('emits only the BOM and header row for an empty array', () => {
    expect(notesToCsv([])).toBe(`\uFEFF${CSV_HEADER}`);
  });

  it('preserves the input order of notes', () => {
    const notes: ExportableNote[] = [
      { kind: DIARY, content: 'first', createdAt: '2026-09-03T09:05:00.000Z' },
      { kind: 'quick-note', content: 'second', createdAt: '2026-09-03T10:00:00.000Z' },
    ];
    const csv = notesToCsv(notes);
    expect(csv.indexOf('2026-09-03T09:05:00.000Z') < csv.indexOf('2026-09-03T10:00:00.000Z')).toBe(true);
    expect(csv.indexOf('Learning note') < csv.indexOf('Quick note')).toBe(true);
  });

  it('exports structured metadata in fixed columns after the content', () => {
    const notes: ExportableNote[] = [
      {
        kind: DIARY,
        content: 'Completed the security module.',
        createdAt: '2026-09-03T09:05:00.000Z',
        activityId: 'security',
        activityName: 'Security & Access Setup',
        source: 'manual',
        updatedAt: '2026-09-04T08:12:00.000Z',
      },
    ];
    expect(notesToCsv(notes)).toBe(
      `\uFEFF${CSV_HEADER}` +
        '"Learning note","2026-09-03T09:05:00.000Z","Completed the security module.","security","Security & Access Setup","manual","2026-09-04T08:12:00.000Z"\r\n',
    );
  });

  it('keeps partial metadata in its fixed columns', () => {
    const notes: ExportableNote[] = [
      { kind: DIARY, content: 'Paired with the team.', createdAt: '2026-09-03T14:00:00.000Z', source: 'ai-assisted', updatedAt: '2026-09-03T15:30:00.000Z' },
    ];
    expect(notesToCsv(notes)).toBe(
      `\uFEFF${CSV_HEADER}` +
        '"Learning note","2026-09-03T14:00:00.000Z","Paired with the team.","","","ai-assisted","2026-09-03T15:30:00.000Z"\r\n',
    );
  });

  it('quotes, doubles, and keeps literal commas, quotes, and newlines in metadata', () => {
    const notes: ExportableNote[] = [
      { kind: DIARY, content: 'Set up accounts.', createdAt: '2026-09-03T09:05:00.000Z', activityName: 'Security "access" setup,\nstep 2' },
    ];
    expect(notesToCsv(notes)).toBe(
      `\uFEFF${CSV_HEADER}` +
        '"Learning note","2026-09-03T09:05:00.000Z","Set up accounts.","","Security ""access"" setup,\nstep 2","",""\r\n',
    );
  });

  it('exports legacy and structured notes with the same fixed columns', () => {
    const notes: ExportableNote[] = [
      { kind: DIARY, content: 'legacy', createdAt: '2026-09-03T09:05:00.000Z' },
      { kind: DIARY, content: 'structured', createdAt: '2026-09-03T10:00:00.000Z', activityId: 'welcome' },
    ];
    expect(notesToCsv(notes)).toBe(
      `\uFEFF${CSV_HEADER}` +
        '"Learning note","2026-09-03T09:05:00.000Z","legacy","","","",""\r\n' +
        '"Learning note","2026-09-03T10:00:00.000Z","structured","welcome","","",""\r\n',
    );
  });
});

describe('notesToMarkdown', () => {
  it('writes a title and UTC-dated headings for each note in order', () => {
    const notes: ExportableNote[] = [
      {
        kind: DIARY,
        content: 'First diary entry.\nWith a second line.',
        createdAt: '2026-09-03T09:05:00.000Z',
      },
      { kind: 'quick-note', content: 'Remember to review the PR.', createdAt: '2026-09-03T23:30:00.000Z' },
    ];
    expect(notesToMarkdown(notes)).toBe(
      '# Onboarding Notes\n' +
        '\n' +
        '## Learning note — 2026-09-03 09:05\n' +
        '\n' +
        'First diary entry.\n' +
        'With a second line.\n' +
        '\n' +
        '## Quick note — 2026-09-03 23:30\n' +
        '\n' +
        'Remember to review the PR.\n',
    );
  });

  it('writes only the title for an empty array', () => {
    expect(notesToMarkdown([])).toBe('# Onboarding Notes\n');
  });

  it('writes a metadata line with every present field for structured records', () => {
    const notes: ExportableNote[] = [
      {
        kind: DIARY,
        content: 'Completed the security module.',
        createdAt: '2026-09-03T09:05:00.000Z',
        activityId: 'security',
        activityName: 'Security & Access Setup',
        source: 'manual',
        updatedAt: '2026-09-04T08:12:00.000Z',
      },
    ];
    expect(notesToMarkdown(notes)).toBe(
      '# Onboarding Notes\n' +
        '\n' +
        '## Learning note — 2026-09-03 09:05\n' +
        '\n' +
        '*Activity ID: security · Activity Name: Security & Access Setup · Source: manual · Updated At: 2026-09-04 08:12*\n' +
        '\n' +
        'Completed the security module.\n',
    );
  });

  it('writes only present metadata fields, in the fixed field order', () => {
    const notes: ExportableNote[] = [
      { kind: DIARY, content: 'Paired with the team.', createdAt: '2026-09-03T14:00:00.000Z', source: 'ai-assisted' },
    ];
    expect(notesToMarkdown(notes)).toBe(
      '# Onboarding Notes\n' +
        '\n' +
        '## Learning note — 2026-09-03 14:00\n' +
        '\n' +
        '*Source: ai-assisted*\n' +
        '\n' +
        'Paired with the team.\n',
    );
  });

  it('orders metadata by the serializer contract, not by input key order', () => {
    const notes: ExportableNote[] = [
      {
        kind: DIARY,
        content: 'Keys arrive reversed.',
        createdAt: '2026-09-03T09:05:00.000Z',
        updatedAt: '2026-09-04T08:12:00.000Z',
        source: 'manual',
        activityName: 'Security & Access Setup',
        activityId: 'security',
      },
    ];
    expect(notesToMarkdown(notes)).toBe(
      '# Onboarding Notes\n' +
        '\n' +
        '## Learning note — 2026-09-03 09:05\n' +
        '\n' +
        '*Activity ID: security · Activity Name: Security & Access Setup · Source: manual · Updated At: 2026-09-04 08:12*\n' +
        '\n' +
        'Keys arrive reversed.\n',
    );
  });

  it('keeps multiline and quoted content intact after the metadata line', () => {
    const notes: ExportableNote[] = [
      {
        kind: DIARY,
        content: 'Line 1, has "quotes"\nLine 2',
        createdAt: '2026-09-03T09:05:00.000Z',
        activityName: 'Team Welcome',
      },
    ];
    expect(notesToMarkdown(notes)).toBe(
      '# Onboarding Notes\n' +
        '\n' +
        '## Learning note — 2026-09-03 09:05\n' +
        '\n' +
        '*Activity Name: Team Welcome*\n' +
        '\n' +
        'Line 1, has "quotes"\n' +
        'Line 2\n',
    );
  });
});

describe('exportFileName', () => {
  it('formats the UTC date for both extensions', () => {
    const now = new Date(Date.UTC(2026, 8, 3));
    expect(exportFileName('csv', now)).toBe('onboarding-notes-2026-09-03.csv');
    expect(exportFileName('md', now)).toBe('onboarding-notes-2026-09-03.md');
  });
});
