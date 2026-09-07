'use client';

import React from 'react';
import { ModalDialog } from './ModalDialog';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
}: ConfirmDialogProps) {
  const confirmBtnClass =
    variant === 'danger'
      ? 'bg-rose-600 hover:bg-rose-700 text-white'
      : variant === 'warning'
      ? 'bg-amber-600 hover:bg-amber-700 text-white'
      : 'bg-stone-900 hover:bg-stone-700 text-white';

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="sm"
      role="alertdialog"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-200 transition"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`rounded-full px-5 py-2 text-xs font-semibold transition active:scale-95 shadow-xs ${confirmBtnClass}`}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm text-stone-600 leading-relaxed">{message}</p>
    </ModalDialog>
  );
}
