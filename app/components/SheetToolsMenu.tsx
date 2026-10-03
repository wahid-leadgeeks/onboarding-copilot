'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { IconCheck, IconChevronDown, IconDotsHorizontal } from './Icons';

export interface SheetToolsMenuItem {
  id: string;
  label: string;
  /** Spreadsheet detail (ranges, columns) — only ever shown inside the menu. */
  hint?: string;
  onSelect?: () => void | Promise<void>;
  /** Opens in a new tab via window.open (items are always buttons so dialog focus traps keep working). */
  href?: string;
  disabled?: boolean;
  state?: 'idle' | 'busy' | 'done';
  /** Label shown while `state === 'done'`, e.g. "Copied". */
  doneLabel?: string;
}

export interface SheetToolsMenuProps {
  items: SheetToolsMenuItem[];
  /** Trigger text (and accessible name for the icon trigger). */
  label?: string;
  size?: 'default' | 'icon';
  placement?: 'down' | 'up';
  align?: 'start' | 'end';
  className?: string;
}

/** Next focus index in a wrapping menu of `length` items; -1 when empty. */
export function nextMenuIndex(current: number, delta: number, length: number): number {
  if (length <= 0) return -1;
  if (current < 0 || current >= length) return delta >= 0 ? 0 : length - 1;
  return (((current + delta) % length) + length) % length;
}

/**
 * Secondary spreadsheet actions (copy for the sheet, sync a row, open the sheet)
 * behind one quiet trigger. Rendered in-tree (no portal) so dialog focus traps
 * and aria-modal scoping keep working.
 */
export function SheetToolsMenu({
  items,
  label = 'Sheet tools',
  size = 'default',
  placement = 'down',
  align = 'end',
  className = '',
}: SheetToolsMenuProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  function menuItems(): HTMLButtonElement[] {
    return Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? []);
  }

  function focusItem(index: number) {
    const list = menuItems();
    list[nextMenuIndex(index, 0, list.length)]?.focus();
  }

  function close(refocus: boolean) {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => focusItem(0));
    function onPointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  function onMenuKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const list = menuItems();
    const current = list.indexOf(document.activeElement as HTMLButtonElement);
    switch (event.key) {
      case 'Escape':
        // Only the menu closes; host dialogs listening for Escape must not see it.
        event.stopPropagation();
        close(true);
        break;
      case 'ArrowDown':
        event.preventDefault();
        list[nextMenuIndex(current, 1, list.length)]?.focus();
        break;
      case 'ArrowUp':
        event.preventDefault();
        list[nextMenuIndex(current, -1, list.length)]?.focus();
        break;
      case 'Home':
        event.preventDefault();
        list[0]?.focus();
        break;
      case 'End':
        event.preventDefault();
        list[list.length - 1]?.focus();
        break;
      case 'Tab':
        setOpen(false);
        break;
    }
  }

  function onTriggerKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
    } else if (event.key === 'Escape' && open) {
      event.stopPropagation();
      close(true);
    }
  }

  async function select(item: SheetToolsMenuItem) {
    if (item.disabled || item.state === 'busy') return;
    close(true);
    if (item.href) window.open(item.href, '_blank', 'noopener,noreferrer');
    await item.onSelect?.();
  }

  const done = items.find((item) => item.state === 'done' && item.doneLabel);
  const triggerBase =
    'inline-flex items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 shadow-2xs transition hover:bg-stone-50 active:scale-95';
  const triggerClass =
    size === 'icon'
      ? `${triggerBase} size-11 sm:size-9`
      : `${triggerBase} min-h-11 gap-1.5 px-3.5 text-xs font-semibold sm:min-h-9`;
  const menuPosition = `${placement === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'} ${align === 'end' ? 'right-0' : 'left-0'}`;

  return (
    <div ref={rootRef} className={`relative inline-flex ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={size === 'icon' ? label : undefined}
        title={size === 'icon' ? label : undefined}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={onTriggerKeyDown}
        className={triggerClass}
      >
        {size === 'icon' ? (
          <IconDotsHorizontal className="h-4 w-4" />
        ) : (
          <>
            <span>{label}</span>
            <IconChevronDown className={`h-3.5 w-3.5 text-stone-500 transition ${open ? 'rotate-180' : ''}`} />
          </>
        )}
      </button>

      <span className="sr-only" aria-live="polite">
        {done?.doneLabel ?? ''}
      </span>

      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKeyDown}
          className={`absolute z-40 ${menuPosition} max-h-[60vh] w-72 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border border-stone-100 bg-white p-1.5 shadow-lift animate-pop-in`}
        >
          {items.map((item) => {
            const isDone = item.state === 'done';
            return (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                tabIndex={-1}
                disabled={item.disabled || item.state === 'busy'}
                onClick={() => void select(item)}
                className="flex min-h-11 w-full flex-col items-start justify-center rounded-xl px-3 py-2 text-left transition hover:bg-stone-50 focus:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="flex items-center gap-1.5 text-sm font-medium text-stone-800">
                  {isDone && <IconCheck className="h-3.5 w-3.5 text-mint-700" />}
                  {isDone && item.doneLabel ? item.doneLabel : item.label}
                  {item.state === 'busy' && <span className="text-stone-500">{'…'}</span>}
                </span>
                {item.hint && <span className="mt-0.5 text-xs text-stone-500">{item.hint}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
