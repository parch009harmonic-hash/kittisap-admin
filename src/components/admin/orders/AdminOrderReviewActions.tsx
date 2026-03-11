"use client";

import { useState } from "react";

import { ConfirmModal } from "../ConfirmModal";
import { Toast } from "../Toast";

type AdminOrderReviewActionsProps = {
  orderNo: string;
  slipId: string | null;
  canDelete: boolean;
  locale: "th" | "en";
};

function parseMoneyInput(value: string) {
  const normalized = Number(value.replaceAll(",", "").trim());
  if (!Number.isFinite(normalized) || normalized < 0) {
    return null;
  }
  return Number(normalized.toFixed(2));
}

export function AdminOrderReviewActions({
  orderNo,
  slipId,
  canDelete,
  locale,
}: AdminOrderReviewActionsProps) {
  const [loading, setLoading] = useState<"approve" | "reject" | "delete" | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [shippingModalOpen, setShippingModalOpen] = useState(false);
  const [shippingFeeInput, setShippingFeeInput] = useState("0");
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const approveLabel = locale === "th" ? "อนุมัติ" : "Approve";
  const rejectLabel = locale === "th" ? "ปฏิเสธ" : "Reject";
  const deleteLabel = locale === "th" ? "ลบออเดอร์" : "Delete order";
  const historyLockedLabel = locale === "th" ? "เก็บย้อนหลัง" : "Keep history";
  const reviewFailedText = locale === "th" ? "ตรวจสอบสลิปไม่สำเร็จ" : "Review failed";
  const invalidShippingFeeText =
    locale === "th" ? "กรุณากรอกค่าขนส่งเป็นตัวเลขตั้งแต่ 0 ขึ้นไป" : "Shipping fee must be a valid number >= 0";
  const deleteFailedText = locale === "th" ? "ลบออเดอร์ไม่สำเร็จ" : "Delete failed";
  const deleteSuccessText = locale === "th" ? "ลบคำสั่งซื้อสำเร็จ" : "Order deleted successfully";
  const deleteConfirmText =
    locale === "th"
      ? "ลบคำสั่งซื้อนี้ถาวรหรือไม่? (ใช้ได้เฉพาะออเดอร์ที่ยังไม่ชำระสำเร็จ)"
      : "Delete this order permanently? (only for non-purchased orders)";
  const shippingModalTitle = locale === "th" ? "อนุมัติหลักฐานการชำระเงิน" : "Approve Payment Slip";
  const shippingModalMessage =
    locale === "th"
      ? "กรอกค่าขนส่ง (บาท) สำหรับออกใบเสร็จของออเดอร์นี้"
      : "Enter shipping fee (THB) for this order receipt";
  const shippingModalInputLabel = locale === "th" ? "ค่าขนส่ง (บาท)" : "Shipping Fee (THB)";
  const shippingModalHint =
    locale === "th"
      ? "ระบบจะรวมยอดสุทธิให้อัตโนมัติหลังอนุมัติ"
      : "Grand total will be recalculated automatically after approval.";
  const shippingModalConfirmLabel = locale === "th" ? "ยืนยันอนุมัติ" : "Approve";
  const cancelLabel = locale === "th" ? "ยกเลิก" : "Cancel";

  const submitReview = async (action: "approve" | "reject", shippingFee?: number) => {
    if (!slipId) {
      return;
    }

    if (action === "approve" && typeof shippingFee !== "number") {
      setToast({ type: "error", message: invalidShippingFeeText });
      return;
    }

    setLoading(action);
    try {
      const response = await fetch(`/api/admin/orders/${encodeURIComponent(orderNo)}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slipId, action, shippingFee }),
      });

      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? reviewFailedText);
      }

      window.location.reload();
    } catch (error) {
      setToast({ type: "error", message: error instanceof Error ? error.message : reviewFailedText });
      setLoading(null);
    }
  };

  const submitDelete = async () => {
    if (!canDelete) {
      return;
    }

    setConfirmDeleteOpen(false);
    setLoading("delete");
    try {
      const response = await fetch(`/api/admin/orders/${encodeURIComponent(orderNo)}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? deleteFailedText);
      }
      setToast({ type: "success", message: deleteSuccessText });
      setTimeout(() => window.location.reload(), 650);
    } catch (error) {
      setToast({ type: "error", message: error instanceof Error ? error.message : deleteFailedText });
      setLoading(null);
    }
  };

  const openShippingModal = () => {
    if (!slipId || loading) {
      return;
    }
    setShippingFeeInput("0");
    setShippingModalOpen(true);
  };

  const approveWithShippingFee = () => {
    const parsed = parseMoneyInput(shippingFeeInput);
    if (parsed === null) {
      setToast({ type: "error", message: invalidShippingFeeText });
      return;
    }
    setShippingModalOpen(false);
    void submitReview("approve", parsed);
  };

  return (
    <>
      <div className="inline-flex items-center gap-1.5">
        {slipId ? (
          <>
            <button
              type="button"
              onClick={openShippingModal}
              disabled={Boolean(loading)}
              className="rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {loading === "approve" ? "..." : approveLabel}
            </button>
            <button
              type="button"
              onClick={() => void submitReview("reject")}
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
            onClick={() => setConfirmDeleteOpen(true)}
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

      {shippingModalOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label={cancelLabel}
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-[2px]"
            onClick={() => setShippingModalOpen(false)}
          />
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-cyan-200/50 bg-gradient-to-br from-[#f8fdff] via-[#eefbff] to-[#e5f5ff] p-5 text-slate-800 shadow-[0_28px_70px_rgba(14,116,144,0.35)]">
            <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-cyan-300/40 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-10 -left-8 h-24 w-24 rounded-full bg-emerald-300/30 blur-2xl" />
            <div className="relative">
              <h3 className="text-lg font-semibold text-slate-900">{shippingModalTitle}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-700">{shippingModalMessage}</p>
              <label className="mt-4 block text-sm font-semibold text-cyan-900">{shippingModalInputLabel}</label>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                autoFocus
                value={shippingFeeInput}
                onChange={(event) => setShippingFeeInput(event.target.value)}
                className="mt-1 h-11 w-full rounded-xl border border-cyan-300/80 bg-white px-3 text-base font-medium text-slate-800 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
              />
              <p className="mt-1 text-xs text-slate-600">{shippingModalHint}</p>
              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShippingModalOpen(false)}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  {cancelLabel}
                </button>
                <button
                  type="button"
                  onClick={approveWithShippingFee}
                  disabled={Boolean(loading)}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-cyan-700/40 bg-gradient-to-r from-cyan-600 to-teal-500 px-4 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(8,145,178,0.35)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading === "approve" ? "..." : shippingModalConfirmLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmModal
        open={confirmDeleteOpen}
        title={locale === "th" ? "ยืนยันการลบคำสั่งซื้อ" : "Confirm order deletion"}
        message={deleteConfirmText}
        confirmText={locale === "th" ? "ตกลง" : "Confirm"}
        cancelText={locale === "th" ? "ยกเลิก" : "Cancel"}
        confirmDisabled={loading === "delete"}
        onCancel={() => setConfirmDeleteOpen(false)}
        onConfirm={() => void submitDelete()}
      />

      <Toast
        open={Boolean(toast)}
        type={toast?.type ?? "success"}
        message={toast?.message ?? ""}
        onClose={() => setToast(null)}
      />
    </>
  );
}

