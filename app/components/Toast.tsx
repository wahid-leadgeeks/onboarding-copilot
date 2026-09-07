'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { IconCheck, IconAlertTriangle, IconX, IconInfo } from './Icons';

export type ToastType = 'success' | 'info' | 'warning' | 'error';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
}

interface ToastContextValue {
  showToast: (toast: Omit<ToastItem, 'id'>) => string;
  dismissToast: (id: string) => void;
  toast: {
    success: (message: string, action?: ToastItem['action']) => string;
    info: (message: string, action?: ToastItem['action']) => string;
    warning: (message: string, action?: ToastItem['action']) => string;
    error: (message: string, action?: ToastItem['action']) => string;
  };
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback if rendered outside provider to avoid crashing
    return {
      showToast: () => '',
      dismissToast: () => {},
      toast: {
        success: (msg: string) => {
          console.log('[Toast Success]', msg);
          return '';
        },
        info: (msg: string) => {
          console.log('[Toast Info]', msg);
          return '';
        },
        warning: (msg: string) => {
          console.log('[Toast Warning]', msg);
          return '';
        },
        error: (msg: string) => {
          console.log('[Toast Error]', msg);
          return '';
        },
      },
    };
  }
  return context;
}

export const DEFAULT_TOAST_DURATION = 3500;

export function createToastItem(
  item: Omit<ToastItem, 'id'>,
  generateId: () => string = () => Math.random().toString(36).substring(2, 9)
): ToastItem {
  return {
    ...item,
    id: generateId(),
    duration: item.duration ?? DEFAULT_TOAST_DURATION,
  };
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (item: Omit<ToastItem, 'id'>) => {
      const newToast = createToastItem(item);

      setToasts((prev) => [...prev, newToast]);

      if (newToast.duration && newToast.duration > 0) {
        setTimeout(() => {
          dismissToast(newToast.id);
        }, newToast.duration);
      }

      return newToast.id;
    },
    [dismissToast]
  );

  const toastMethods = {
    success: useCallback(
      (message: string, action?: ToastItem['action']) =>
        showToast({ type: 'success', message, action }),
      [showToast]
    ),
    info: useCallback(
      (message: string, action?: ToastItem['action']) =>
        showToast({ type: 'info', message, action }),
      [showToast]
    ),
    warning: useCallback(
      (message: string, action?: ToastItem['action']) =>
        showToast({ type: 'warning', message, action }),
      [showToast]
    ),
    error: useCallback(
      (message: string, action?: ToastItem['action']) =>
        showToast({ type: 'error', message, action }),
      [showToast]
    ),
  };

  return (
    <ToastContext.Provider
      value={{
        showToast,
        dismissToast,
        toast: toastMethods,
      }}
    >
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed bottom-5 right-5 z-50 flex max-w-sm flex-col gap-2.5 sm:bottom-6 sm:right-6 pointer-events-none"
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} item={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}

function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: () => void;
}) {
  const isSuccess = item.type === 'success';
  const isWarning = item.type === 'warning';
  const isError = item.type === 'error';
  const isInfo = item.type === 'info';

  const iconBg = isSuccess
    ? 'bg-mint-100 text-mint-700'
    : isWarning
    ? 'bg-peach-100 text-peach-700'
    : isError
    ? 'bg-rose-100 text-rose-700'
    : 'bg-sky-100 text-sky-700';

  const icon = isSuccess ? (
    <IconCheck className="h-3.5 w-3.5" />
  ) : isWarning ? (
    <IconAlertTriangle className="h-3.5 w-3.5" />
  ) : isError ? (
    <IconX className="h-3.5 w-3.5" />
  ) : (
    <IconInfo className="h-3.5 w-3.5" />
  );

  return (
    <div
      role="status"
      className="pointer-events-auto flex items-center justify-between gap-3 rounded-2xl bg-stone-900 px-4 py-3 text-stone-50 shadow-lift border border-stone-800 animate-pop-in"
    >
      <div className="flex items-center gap-3 min-w-0">
        <span
          aria-hidden="true"
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${iconBg}`}
        >
          {icon}
        </span>
        <p className="text-xs font-medium leading-snug text-stone-100 break-words">
          {item.message}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0 ml-2">
        {item.action && (
          <button
            type="button"
            onClick={() => {
              item.action?.onClick();
              onDismiss();
            }}
            className="rounded-lg bg-stone-800 px-2.5 py-1 text-xs font-semibold text-mint-400 hover:bg-stone-700 hover:text-mint-300 transition"
          >
            {item.action.label}
          </button>
        )}
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="rounded-md p-1 text-stone-400 hover:bg-stone-800 hover:text-stone-200 transition"
        >
          <IconX className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
