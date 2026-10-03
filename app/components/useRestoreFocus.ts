'use client';

import { useEffect, type RefObject } from 'react';

type Focusable = { focus: () => void; isConnected: boolean };

/** True when a previously focused element can take focus back. */
export function canRestoreFocus(element: Focusable | null | undefined): element is Focusable {
  return Boolean(element && element.isConnected && typeof element.focus === 'function');
}

/**
 * Remembers the focused element when `isOpen` becomes true and gives focus back
 * to it when the dialog closes or unmounts (if it is still in the document).
 * Optionally moves focus to `initialFocus` once the dialog has rendered.
 */
export function useRestoreFocus(isOpen: boolean, initialFocus?: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    if (!isOpen) return;
    const active = document.activeElement;
    const previous = active instanceof HTMLElement && active !== document.body ? active : null;
    const timer = initialFocus ? window.setTimeout(() => initialFocus.current?.focus(), 0) : undefined;
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
      if (canRestoreFocus(previous)) previous.focus();
    };
  }, [isOpen, initialFocus]);
}
