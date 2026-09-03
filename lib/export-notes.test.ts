import { exportFileName, notesToCsv, notesToMarkdown } from './export-notes';
import type { ExportableNote } from './export-notes';

const DIARY = 'diary' as const;

describe('notesToCsv', () => {
  it('writes a BOM, header, and one RFC4180 row per note', () => {
    const notes: ExportableNote[] = [
      { kind: DIARY, content: 'Completed the security module.', createdAt: '2026-09-03T09:05:00.000Z' },
    ];
    expect(notesToCsv(notes)).toBe(
      '\uFEFF"Type","Created At","Content"\r\n' +
        '"Learning note","2026-09-03T09:05:00.000Z","Completed the security module."\r\n',
    );
  });

  it('quotes, doubles, and keeps literal commas, quotes, and newlines in content', () => {
    const notes: ExportableNote[] = [
      { kind: 'quick-note', content: 'Line 1, has "quotes"\nLine 2', createdAt: '2026-09-03T09:05:00.000Z' },
    ];
    expect(notesToCsv(notes)).toBe(
      '\uFEFF"Type","Created At","Content"\r\n' +
        '"Quick note","2026-09-03T09:05:00.000Z","Line 1, has ""quotes""\nLine 2"\r\n',
    );
  });

  it('starts with the UTF-8 BOM', () => {
    const notes: ExportableNote[] = [
      { kind: DIARY, content: 'anything', createdAt: '2026-09-03T09:05:00.000Z' },
    ];
    expect(notesToCsv(notes).charCodeAt(0)).toBe(0xfeff);
  });

  it('emits only the BOM and header row for an empty array', () => {
    expect(notesToCsv([])).toBe('\uFEFF"Type","Created At","Content"\r\n');
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
});

describe('exportFileName', () => {
  it('formats the UTC date for both extensions', () => {
    const now = new Date(Date.UTC(2026, 8, 3));
    expect(exportFileName('csv', now)).toBe('onboarding-notes-2026-09-03.csv');
    expect(exportFileName('md', now)).toBe('onboarding-notes-2026-09-03.md');
  });
});
