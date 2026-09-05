'use client';
import { useEffect, useRef, useState } from 'react';
import { notesToCsv, notesToMarkdown, exportFileName, type ExportableNote } from '@/lib/export-notes';

export type SelectableNote = ExportableNote & { id: string };

function createdAtTime(value: string): number {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function ExportNotes({ notes, selectedIds, onToggleSelectAll, onClearSelection, onExported }: {
  notes: SelectableNote[];
  selectedIds: ReadonlySet<string>;
  onToggleSelectAll: () => void;
  onClearSelection: () => void;
  onExported: (count: number) => void;
}) {
  const [format, setFormat] = useState<'csv' | 'md'>('csv');
  const selectAllRef = useRef<HTMLInputElement | null>(null);
  const total = notes.length;
  const selectedCount = notes.filter((note) => selectedIds.has(note.id)).length;
  const allSelected = total > 0 && selectedCount === total;

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = selectedCount > 0 && !allSelected;
  }, [selectedCount, allSelected]);

  function exportSelected() {
    if (selectedCount === 0) return;
    const selected: ExportableNote[] = notes
      .filter((note) => selectedIds.has(note.id))
      .map((note) => ({
        kind: note.kind,
        content: note.content,
        createdAt: note.createdAt,
        ...(note.activityId === undefined ? {} : { activityId: note.activityId }),
        ...(note.activityName === undefined ? {} : { activityName: note.activityName }),
        ...(note.source === undefined ? {} : { source: note.source }),
        ...(note.updatedAt === undefined ? {} : { updatedAt: note.updatedAt }),
      }))
      .sort((a, b) => createdAtTime(a.createdAt) - createdAtTime(b.createdAt));
    const content = format === 'csv' ? notesToCsv(selected) : notesToMarkdown(selected);
    const blob = new Blob([content], { type: format === 'csv' ? 'text/csv;charset=utf-8' : 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = exportFileName(format, new Date());
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    onExported(selected.length);
  }

  return (
    <section className="animate-fade-up rounded-card bg-white p-5 shadow-soft sm:p-6" aria-label="Export notes">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium text-stone-700">
          <input ref={selectAllRef} type="checkbox" checked={allSelected} onChange={onToggleSelectAll} aria-label="Select all notes" className="size-5 accent-stone-900" />
          Select all notes
        </label>
        <p className="text-sm text-stone-500">{selectedCount} of {total} notes selected{selectedCount > 0 ? ' ✨' : ''}</p>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <label className="flex min-h-11 items-center gap-2 text-sm text-stone-500">
            Format
            <select value={format} onChange={(event) => setFormat(event.target.value === 'md' ? 'md' : 'csv')} className="min-h-11 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700">
              <option value="csv">CSV (.csv)</option>
              <option value="md">Markdown (.md)</option>
            </select>
          </label>
          <button onClick={exportSelected} disabled={selectedCount === 0} className="min-h-11 rounded-full bg-stone-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-stone-700 disabled:opacity-40 disabled:hover:transform-none">
            Export {selectedCount} notes
          </button>
          {selectedCount > 0 && <button onClick={onClearSelection} className="min-h-11 rounded-full px-3 py-2 text-sm font-medium text-stone-500 transition hover:text-stone-900">Clear</button>}
        </div>
      </div>
    </section>
  );
}
