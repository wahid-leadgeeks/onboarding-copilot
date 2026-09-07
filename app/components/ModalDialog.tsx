'use client';

import React, { useEffect, useRef } from 'react';

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
}: ModalDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Lock body scroll and handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
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
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role={role}
      aria-modal="true"
      aria-labelledby="modal-dialog-title"
      aria-describedby={description ? 'modal-dialog-desc' : undefined}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
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
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-full p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition active:scale-95"
          >
            <span aria-hidden="true" className="text-sm font-bold">✕</span>
          </button>
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
