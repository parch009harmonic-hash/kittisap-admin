"use client";

import { useState } from "react";

type AdminOrderReviewActionsProps = {
  orderNo: string;
  slipId: string | null;
  locale: "th" | "en";
};

export function AdminOrderReviewActions({ orderNo, slipId, locale }: AdminOrderReviewActionsProps) {
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);

  if (!slipId) {
    return null;
  }

  const approveLabel = locale === "th" ? "อนุมัติ" : "Approve";
  const rejectLabel = locale === "th" ? "ปฏิเสธ" : "Reject";

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

  return (
    <div className="inline-flex items-center gap-1.5">
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
    </div>
  );
}
