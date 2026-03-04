"use client";

import { useState } from "react";

type AdminOrderReviewActionsProps = {
  orderNo: string;
  slipId: string | null;
  canDelete: boolean;
  locale: "th" | "en";
};

export function AdminOrderReviewActions({ orderNo, slipId, canDelete, locale }: AdminOrderReviewActionsProps) {
  const [loading, setLoading] = useState<"approve" | "reject" | "delete" | null>(null);

  const approveLabel = locale === "th" ? "อนุมัติ" : "Approve";
  const rejectLabel = locale === "th" ? "ปฏิเสธ" : "Reject";
  const deleteLabel = locale === "th" ? "ลบออเดอร์" : "Delete order";
  const historyLockedLabel = locale === "th" ? "เก็บย้อนหลัง" : "Keep history";
  const deleteConfirmText =
    locale === "th"
      ? "ลบคำสั่งซื้อนี้ถาวรหรือไม่? (ใช้ได้เฉพาะออเดอร์ที่ยังไม่ชำระสำเร็จ)"
      : "Delete this order permanently? (only for non-purchased orders)";

  const submit = async (action: "approve" | "reject") => {
    setLoading(action);
    try {
      const response = await fetch(`/api/admin/orders/${encodeURIComponent(orderNo)}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slipId, action }),
      });

      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Review failed");
      }

      window.location.reload();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Review failed");
      setLoading(null);
    }
  };

  const submitDelete = async () => {
    if (!canDelete) {
      return;
    }
    if (!window.confirm(deleteConfirmText)) {
      return;
    }

    setLoading("delete");
    try {
      const response = await fetch(`/api/admin/orders/${encodeURIComponent(orderNo)}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Delete failed");
      }
      window.location.reload();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Delete failed");
      setLoading(null);
    }
  };

  return (
    <div className="inline-flex items-center gap-1.5">
      {slipId ? (
        <>
          <button
            type="button"
            onClick={() => void submit("approve")}
            disabled={Boolean(loading)}
            className="rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {loading === "approve" ? "..." : approveLabel}
          </button>
          <button
            type="button"
            onClick={() => void submit("reject")}
            disabled={Boolean(loading)}
            className="rounded-md bg-rose-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
          >
            {loading === "reject" ? "..." : rejectLabel}
          </button>
        </>
      ) : null}

      {canDelete ? (
        <button
          type="button"
          onClick={() => void submitDelete()}
          disabled={Boolean(loading)}
          className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
        >
          {loading === "delete" ? "..." : deleteLabel}
        </button>
      ) : (
        <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600">
          {historyLockedLabel}
        </span>
      )}
    </div>
  );
}
