"use client";

import { ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => {
      setMounted(false);
    };
  }, []);

  if (!open || !mounted) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-[6px]">
      <div className="relative w-full max-w-md min-w-[320px] overflow-hidden rounded-3xl border border-white/30 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-6 text-slate-100 shadow-[0_24px_75px_rgba(2,6,23,0.55)]">
        <div className="pointer-events-none absolute -right-14 -top-14 h-32 w-32 rounded-full bg-rose-400/35 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 left-6 h-28 w-28 rounded-full bg-cyan-400/25 blur-3xl" />
        <div className="relative">
          <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-rose-300/45 bg-rose-500/20 text-rose-200">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden>
              <path d="M12 9v4m0 4h.01" />
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
            </svg>
          </span>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">{message}</p>
        </div>
        {children ? <div className="mt-3">{children}</div> : null}
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-600 bg-slate-800/70 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-700/80"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled}
            className="rounded-xl border border-rose-300/60 bg-gradient-to-r from-rose-500 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(244,63,94,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
