import type { DiarySource } from './local-records';

/** Optional structured metadata mirrors `StoredDiary`; internal record ids are never exported. */
export type ExportableNote = {
  kind: 'diary' | 'quick-note';
  content: string;
  createdAt: string; // ISO timestamp
  activityId?: string;
  activityName?: string;
  source?: DiarySource;
  updatedAt?: string; // ISO timestamp
};

function kindLabel(kind: ExportableNote['kind']): string {
  return kind === 'diary' ? 'Learning note' : 'Quick note';
}

function csvField(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

/** Formats a date as `YYYY-MM-DD HH:MM` in UTC (zero-padded, 24h). */
function formatTimestamp(date: Date): string {
  const yyyy = String(date.getUTCFullYear()).padStart(4, '0');
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const min = String(date.getUTCMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

/** Serializes notes to UTF-8 (BOM-prefixed) RFC4180 CSV for Excel import. */
export function notesToCsv(notes: ExportableNote[]): string {
  const rows = notes.map((note) => [
    kindLabel(note.kind),
    note.createdAt,
    note.content,
    note.activityId ?? '',
    note.activityName ?? '',
    note.source ?? '',
    note.updatedAt ?? '',
  ]);
  const body = [['Type', 'Created At', 'Content', 'Activity ID', 'Activity Name', 'Source', 'Updated At'], ...rows]
    .map((row) => row.map(csvField).join(','))
    .join('\r\n');
  return `\uFEFF${body}\r\n`;
}

/** Serializes notes to a Markdown document with UTC-formatted headings. */
export function notesToMarkdown(notes: ExportableNote[]): string {
  if (notes.length === 0) return '# Onboarding Notes\n';
  const parts: string[] = ['# Onboarding Notes', ''];
  for (const note of notes) {
    const when = formatTimestamp(new Date(note.createdAt));
    parts.push(`## ${kindLabel(note.kind)} — ${when}`, '');
    const metadata: string[] = [];
    if (note.activityId !== undefined) metadata.push(`Activity ID: ${note.activityId}`);
    if (note.activityName !== undefined) metadata.push(`Activity Name: ${note.activityName}`);
    if (note.source !== undefined) metadata.push(`Source: ${note.source}`);
    if (note.updatedAt !== undefined) metadata.push(`Updated At: ${formatTimestamp(new Date(note.updatedAt))}`);
    if (metadata.length > 0) parts.push(`*${metadata.join(' · ')}*`, '');
    parts.push(note.content, '');
  }
  return parts.join('\n');
}

/** Builds a download filename like `onboarding-notes-2026-09-03.csv` (UTC date). */
export function exportFileName(extension: 'csv' | 'md', now: Date): string {
  const yyyy = String(now.getUTCFullYear()).padStart(4, '0');
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  return `onboarding-notes-${yyyy}-${mm}-${dd}.${extension}`;
}
