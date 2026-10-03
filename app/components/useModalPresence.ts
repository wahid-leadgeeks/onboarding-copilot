'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * Open modal dialogs that should hide floating UI (the Assistant FAB).
 * The guide tour popover and the Assistant's own panel are excluded.
 */
export const BLOCKING_DIALOG_SELECTOR =
  '[aria-modal="true"]:is([role="dialog"],[role="alertdialog"]):not(.guide-tour-popover):not([data-assistant])';

/** True when `root` contains an element matching `selector`. */
export function hasBlockingDialog(
  root: Pick<ParentNode, 'querySelector'> | null | undefined,
  selector: string = BLOCKING_DIALOG_SELECTOR
): boolean {
  if (!root) return false;
  try {
    return root.querySelector(selector) !== null;
  } catch {
    return false;
  }
}

const getServerSnapshot = () => false;

/** Whether a blocking modal dialog is currently in the document. SSR-safe (false on the server). */
export function useModalPresence(selector: string = BLOCKING_DIALOG_SELECTOR): boolean {
  const subscribe = useCallback((onChange: () => void) => {
    if (typeof MutationObserver === 'undefined' || !document.body) return () => {};
    const observer = new MutationObserver(onChange);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['role', 'aria-modal', 'class', 'data-assistant'],
    });
    return () => observer.disconnect();
  }, []);
  const getSnapshot = useCallback(() => hasBlockingDialog(document.body, selector), [selector]);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
