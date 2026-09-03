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
          className="min-h-11 rounded-full bg-white px-4 py-2 text-sm text-stone-500 shadow-soft transition hover:text-stone-700 hover:shadow-lift"
        >
          + Quick note <span aria-hidden="true">✨</span>
        </button>
      )}
      {expanded && (
        <div className="animate-fade-up flex gap-3">
          <textarea
            autoFocus
            aria-label="Quick note"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            rows={3}
            placeholder="Capture something for later..."
            className="w-full rounded-card border border-stone-200 bg-white p-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-mint-300"
          />
          <button onClick={save} className="min-h-11 self-end rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone-700">
            Save
          </button>
        </div>
      )}
    </section>
  );
}
