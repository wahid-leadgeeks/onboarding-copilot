import { useState } from 'react';

export function QuickNote({ onSave }: { onSave: (content: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [value, setValue] = useState('');

  function save() {
    const content = value.trim();
    if (content) onSave(content);
    setValue('');
    setExpanded(false);
  }

  return (
    <section data-tour="quick-note" className="mt-8">
      {!expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="min-h-11 rounded-xl border border-dashed border-slate-300 px-4 py-2 text-sm text-slate-500 transition hover:border-slate-400 hover:text-slate-700"
        >
          + Quick note
        </button>
      )}
      {expanded && (
        <div className="flex gap-3">
          <textarea
            autoFocus
            aria-label="Quick note"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            rows={3}
            placeholder="Capture something for later..."
            className="w-full rounded-xl border p-3 text-sm"
          />
          <button onClick={save} className="min-h-11 self-end rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            Save
          </button>
        </div>
      )}
    </section>
  );
}
