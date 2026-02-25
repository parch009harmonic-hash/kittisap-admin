"use client";

import { ReactNode } from "react";

type ConfirmModalProps = {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmDisabled?: boolean;
  children?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmModal({
  open,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmDisabled = false,
  children,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-[2px]">
      <div className="glass-card relative w-full max-w-md overflow-hidden rounded-2xl border border-white/60 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.35)]">
        <div className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-rose-200/55 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-10 left-10 h-24 w-24 rounded-full bg-blue-200/40 blur-2xl" />
        <div className="relative">
          <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden>
              <path d="M12 9v4m0 4h.01" />
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
            </svg>
          </span>
          <h3 className="text-lg font-semibold text-ink">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-steel">{message}</p>
        </div>
        {children ? <div className="mt-3">{children}</div> : null}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-semibold text-ink hover:bg-mist"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled}
            className="rounded-lg border border-rose-300 bg-rose-500 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-rose-600 disabled:opacity-60"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
