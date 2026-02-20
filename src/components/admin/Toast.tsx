"use client";

import { useEffect } from "react";

type ToastProps = {
  open: boolean;
  type: "success" | "error";
  message: string;
  onClose: () => void;
};

export function Toast({ open, type, message, onClose }: ToastProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const timer = setTimeout(() => onClose(), 3200);
    return () => clearTimeout(timer);
  }, [onClose, open, message, type]);

  if (!open) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/20 p-4">
      <div
        className={`pointer-events-auto w-full max-w-md rounded-2xl border bg-white/95 p-4 shadow-2xl backdrop-blur ${
          type === "success" ? "border-emerald-200" : "border-rose-200"
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${
              type === "success" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
            }`}
            aria-hidden
          >
            {type === "success" ? "✓" : "!"}
          </div>

          <div className="flex-1">
            <p className="text-sm font-medium text-slate-800">{message}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-1 py-0.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          >
            Close
          </button>
        </div>

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full ${type === "success" ? "bg-emerald-500" : "bg-rose-500"}`}
            style={{ width: "100%" }}
          />
        </div>
      </div>
    </div>
  );
}
