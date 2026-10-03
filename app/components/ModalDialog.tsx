'use client';

import React, { useEffect, useRef } from 'react';
import { IconX } from './Icons';
import { useRestoreFocus } from './useRestoreFocus';

export interface ModalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  role?: 'dialog' | 'alertdialog';
  badge?: React.ReactNode;
  /** When false, Escape and backdrop clicks do nothing and the close (X) button is hidden. */
  dismissible?: boolean;
}

/** Whether a keypress should dismiss the dialog. */
export function shouldDismissOnEscape(dismissible: boolean, key: string): boolean {
  return dismissible && key === 'Escape';
}

const maxWidthMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
};

export function ModalDialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = 'md',
  role = 'dialog',
  badge,
  dismissible = true,
}: ModalDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const dismissibleRef = useRef(dismissible);

  // Return focus to the element that opened the dialog once it closes.
  useRestoreFocus(isOpen);

  // Keep the latest callback/flag without re-running the open effect (no focus re-grab on re-render).
  useEffect(() => {
    onCloseRef.current = onClose;
    dismissibleRef.current = dismissible;
  });

  // Lock body scroll and handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(e: KeyboardEvent) {
      if (shouldDismissOnEscape(dismissibleRef.current, e.key)) {
        onCloseRef.current();
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    // Auto-focus dialog on open
    const focusTimer = setTimeout(() => {
      if (dialogRef.current) {
        const focusable = dialogRef.current.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        focusable?.focus();
      }
    }, 50);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(focusTimer);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role={role}
      aria-modal="true"
      aria-labelledby="modal-dialog-title"
      aria-describedby={description ? 'modal-dialog-desc' : undefined}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-fade-in"
      onClick={(e) => {
        if (dismissible && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className={`relative flex max-h-[90vh] w-full ${maxWidthMap[maxWidth]} flex-col rounded-3xl bg-white shadow-2xl overflow-hidden animate-pop-in border border-stone-100`}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-stone-100 p-5 sm:p-6 bg-stone-50/50">
          <div className="pr-4 min-w-0">
            {badge && <div className="mb-2 flex items-center gap-2">{badge}</div>}
            <h2
              id="modal-dialog-title"
              className="text-lg font-bold tracking-tight text-stone-900 sm:text-xl leading-snug"
            >
              {title}
            </h2>
            {description && (
              <p id="modal-dialog-desc" className="mt-1 text-xs text-stone-500 leading-relaxed">
                {description}
              </p>
            )}
          </div>
          {dismissible && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100 hover:text-stone-700 transition active:scale-95 sm:size-9"
            >
              <IconX className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5 sm:p-6 text-sm text-stone-700 flex-1">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-stone-100 bg-stone-50/50 p-4 sm:px-6">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
