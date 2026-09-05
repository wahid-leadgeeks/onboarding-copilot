'use client';
import { useState } from 'react';
import type { LearningRecordSource, LearningRecordView } from '@/lib/learning-records-view';

type CardMode =
  | { readonly kind: 'view' }
  | { readonly kind: 'edit'; readonly draft: string }
  | { readonly kind: 'confirm-delete' };

const secondaryButton = 'min-h-11 rounded-full px-4 py-1.5 text-sm font-medium text-stone-500 transition hover:text-stone-900';
const primaryButton = 'min-h-11 rounded-full bg-stone-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-stone-700 disabled:opacity-40';

function assertNever(value: never): never {
  throw new Error(`Unhandled card state: ${JSON.stringify(value)}`);
}

/** Source labels carry the meaning; the colored dot only reinforces it (ADR-0003: AI stays distinguishable). */
function sourceMeta(source: LearningRecordSource): { label: string; dotClass: string | null } {
  switch (source) {
    case 'manual':
      return { label: 'Manual', dotClass: null };
    case 'quick-note':
      return { label: 'From quick note', dotClass: 'bg-peach-500' };
    case 'ai-assisted':
      return { label: 'AI-assisted', dotClass: 'bg-lavender-500' };
    case 'legacy':
      return { label: 'Legacy', dotClass: null };
    default:
      return assertNever(source);
  }
}

export function LearningRecordCard({ view, selected, onToggleSelect, onEdit, onConvert, onDelete }: {
  view: LearningRecordView;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onEdit?: (id: string, content: string) => void;
  onConvert?: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [mode, setMode] = useState<CardMode>({ kind: 'view' });
  const isDiary = view.kind === 'diary';
  const snippet = view.content.trim().slice(0, 20);

  function renderBody() {
    switch (mode.kind) {
      case 'edit':
        return (
          <div className="animate-pop-in">
            <textarea
              autoFocus
              aria-label={`Edit note: ${snippet}`}
              value={mode.draft}
              onChange={(event) => setMode({ kind: 'edit', draft: event.target.value })}
              rows={4}
              className="w-full rounded-2xl border border-stone-200 bg-white p-3 text-sm text-stone-900"
            />
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <button onClick={() => setMode({ kind: 'view' })} className={secondaryButton}>Cancel</button>
              <button
                onClick={() => {
                  if (onEdit === undefined || mode.draft.trim() === '') return;
                  onEdit(view.id, mode.draft.trim());
                  setMode({ kind: 'view' });
                }}
                disabled={mode.draft.trim() === ''}
                className={primaryButton}
              >
                Save
              </button>
            </div>
          </div>
        );
      case 'confirm-delete':
        return (
          <div className="animate-pop-in mt-3 flex flex-wrap items-center gap-2 rounded-2xl bg-peach-50 px-4 py-3">
            <p className="mr-auto text-sm font-medium text-stone-900">Delete this note? This can't be undone.</p>
            <button onClick={() => setMode({ kind: 'view' })} className={secondaryButton}>Keep</button>
            <button onClick={() => onDelete(view.id)} className={primaryButton}>Yes, delete</button>
          </div>
        );
      case 'view':
        return (
          <>
            <p className="whitespace-pre-wrap text-stone-700">{view.content}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
              <time>{new Date(view.createdAt).toLocaleString()}</time>
              {isDiary && (
                <span className="flex items-center gap-1.5">
                  {sourceMeta(view.source).dotClass !== null && (
                    <span aria-hidden="true" className={`inline-block size-1.5 rounded-full ${sourceMeta(view.source).dotClass ?? ''}`} />
                  )}
                  {sourceMeta(view.source).label}
                </span>
              )}
              {isDiary && view.activityName !== undefined && <span>Activity: {view.activityName}</span>}
              {view.updatedAt !== undefined && <span>Edited {new Date(view.updatedAt).toLocaleString()}</span>}
            </div>
            <div className="mt-2 flex flex-wrap justify-end gap-1">
              {onEdit !== undefined && (
                <button onClick={() => setMode({ kind: 'edit', draft: view.content })} className={secondaryButton}>Edit</button>
              )}
              {onConvert !== undefined && (
                <button onClick={() => onConvert?.(view.id)} className={secondaryButton}>Move to diary</button>
              )}
              <button onClick={() => setMode({ kind: 'confirm-delete' })} className={secondaryButton}>Delete</button>
            </div>
          </>
        );
      default:
        return assertNever(mode);
    }
  }

  return (
    <article className="grid grid-cols-[2.75rem_1fr] items-start gap-2">
      <label className="flex size-11 cursor-pointer items-center justify-center">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(view.id)}
          aria-label={`Select note ${snippet}`}
          className="size-5 accent-stone-900"
        />
      </label>
      <div className="min-w-0">{renderBody()}</div>
    </article>
  );
}
