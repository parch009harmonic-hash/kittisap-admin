"use client";

type SaveStatePopupProps = {
  isSaving: boolean;
  isSuccess: boolean;
  savingText: string;
  successText: string;
};

export default function SaveStatePopup({
  isSaving,
  isSuccess,
  savingText,
  successText,
}: SaveStatePopupProps) {
  if (!isSaving && !isSuccess) {
    return null;
  }

  const toneClass = isSaving
    ? "border-blue-200/80 bg-white text-blue-700"
    : "border-emerald-200/80 bg-emerald-50 text-emerald-700";
  const label = isSaving ? savingText : successText;

  return (
    <div className="pointer-events-none fixed inset-0 z-[130] grid place-items-center p-4">
      <div className={`min-w-[220px] rounded-2xl border px-5 py-4 shadow-2xl backdrop-blur ${toneClass}`}>
        <div className="flex items-center gap-3">
          {isSaving ? (
            <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-blue-300 border-t-blue-700" />
          ) : (
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">✓</span>
          )}
          <p className="text-sm font-semibold">{label}</p>
        </div>
      </div>
    </div>
  );
}
