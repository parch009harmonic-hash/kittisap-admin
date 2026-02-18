"use client";

type ToastProps = {
  open: boolean;
  type: "success" | "error";
  message: string;
  onClose: () => void;
};

export function Toast({ open, type, message, onClose }: ToastProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="glass-card fixed bottom-5 right-5 z-50 max-w-sm rounded-xl p-3">
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 h-2.5 w-2.5 rounded-full ${
            type === "success" ? "bg-emerald-400" : "bg-rose-400"
          }`}
        />
        <p className="flex-1 text-sm text-ink">{message}</p>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-steel hover:text-ink"
        >
          Close
        </button>
      </div>
    </div>
  );
}
