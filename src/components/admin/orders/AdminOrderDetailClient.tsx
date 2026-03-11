"use client";

import { useMemo, useState } from "react";

type AdminOrderDetail = {
  id: string;
  order_no: string;
  customer_name_snapshot: string;
  customer_phone_snapshot: string;
  customer_email_snapshot: string;
  payment_method: string;
  promptpay_link_snapshot: string;
  sub_total: number;
  discount_total: number;
  shipping_fee: number;
  grand_total: number;
  status: string;
  payment_status: string;
  created_at: string;
  note: string;
  shipping_address: string;
  receipt_no: string;
  receipt_issued_at: string;
  items: Array<{
    id: string;
    product_id: string;
    sku_snapshot: string;
    name_snapshot: string;
    unit_price_snapshot: number;
    qty: number;
    line_total: number;
  }>;
  slips: Array<{
    id: string;
    file_url: string | null;
    file_path: string;
    status: string;
    uploaded_at: string;
    reviewed_at: string | null;
    note: string | null;
  }>;
};

type AdminOrderDetailClientProps = {
  order: AdminOrderDetail;
  locale: "th" | "en";
};

function parseMoneyInput(value: string) {
  const normalized = Number(value.replaceAll(",", "").trim());
  if (!Number.isFinite(normalized) || normalized < 0) {
    return null;
  }
  return Number(normalized.toFixed(2));
}

function text(locale: "th" | "en") {
  if (locale === "th") {
    return {
      customer: "ลูกค้า",
      payment: "การชำระเงิน",
      status: "สถานะ",
      paymentStatus: "สถานะชำระเงิน",
      openPromptpay: "เปิดลิงก์ PromptPay",
      sku: "SKU",
      product: "สินค้า",
      unit: "ราคาต่อหน่วย",
      qty: "จำนวน",
      lineTotal: "รวม",
      slips: "หลักฐานการชำระเงิน",
      noSlips: "ยังไม่มีการอัปโหลดสลิป",
      viewSlip: "ดูสลิป",
      approve: "อนุมัติ",
      reject: "ปฏิเสธ",
      uploaded: "อัปโหลดเมื่อ",
      reviewedAt: "ตรวจสอบเมื่อ",
      summary: "สรุปยอด",
      subtotal: "ยอดก่อนลด",
      discount: "ส่วนลด",
      shipping: "ค่าส่ง",
      shippingFeeInput: "ค่าขนส่งสำหรับใบเสร็จ (THB)",
      shippingFeeHint: "ระบบจะคำนวณยอดสุทธิใหม่ทันทีเมื่อกดอนุมัติ",
      grandTotal: "ยอดสุทธิ",
      shippingAddress: "ที่อยู่จัดส่ง",
      note: "หมายเหตุ",
      reviewFailed: "ไม่สามารถตรวจสอบสลิปได้",
      reviewing: "กำลังบันทึก...",
      invalidShippingFee: "กรุณากรอกค่าขนส่งเป็นตัวเลขตั้งแต่ 0 ขึ้นไป",
      receiptNo: "เลขที่ใบเสร็จ",
      receiptIssuedAt: "ออกใบเสร็จเมื่อ",
      openReceipt: "เปิดใบเสร็จ",
      noSlipActions: "รายการนี้ตรวจสอบแล้ว",
    };
  }

  return {
    customer: "Customer",
    payment: "Payment",
    status: "Status",
    paymentStatus: "Payment status",
    openPromptpay: "Open PromptPay Link",
    sku: "SKU",
    product: "Product",
    unit: "Unit",
    qty: "Qty",
    lineTotal: "Line Total",
    slips: "Payment Slips",
    noSlips: "No slip uploaded yet.",
    viewSlip: "View Slip",
    approve: "Approve",
    reject: "Reject",
    uploaded: "Uploaded",
    reviewedAt: "Reviewed",
    summary: "Summary",
    subtotal: "Subtotal",
    discount: "Discount",
    shipping: "Shipping",
    shippingFeeInput: "Shipping fee for receipt (THB)",
    shippingFeeHint: "Grand total will be recalculated when approving slip.",
    grandTotal: "Grand Total",
    shippingAddress: "Shipping address",
    note: "Note",
    reviewFailed: "Failed to review slip",
    reviewing: "Saving...",
    invalidShippingFee: "Please enter shipping fee as a valid number >= 0",
    receiptNo: "Receipt No.",
    receiptIssuedAt: "Receipt issued at",
    openReceipt: "Open Receipt",
    noSlipActions: "This slip has been reviewed",
  };
}

export function AdminOrderDetailClient({ order, locale }: AdminOrderDetailClientProps) {
  const [loadingSlipId, setLoadingSlipId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shippingFeeInput, setShippingFeeInput] = useState(String(order.shipping_fee));
  const t = text(locale);

  const hasPendingReviewSlip = useMemo(
    () => order.slips.some((slip) => slip.status === "pending_review"),
    [order.slips],
  );
  const canPrintReceipt = useMemo(
    () =>
      order.payment_status === "paid"
      || ["paid", "processing", "shipped", "completed"].includes(order.status),
    [order.payment_status, order.status],
  );

  const previewShippingFee = parseMoneyInput(shippingFeeInput) ?? order.shipping_fee;
  const previewGrandTotal = Math.max(0, order.sub_total - order.discount_total + previewShippingFee);
  const receiptUrl = `/api/admin/orders/${encodeURIComponent(order.order_no)}/receipt`;

  const reviewSlip = async (slipId: string, action: "approve" | "reject") => {
    const shippingFee = action === "approve" ? parseMoneyInput(shippingFeeInput) : null;
    if (action === "approve" && shippingFee === null) {
      setError(t.invalidShippingFee);
      return;
    }

    setLoadingSlipId(slipId);
    setError(null);

    try {
      const response = await fetch(`/api/admin/orders/${encodeURIComponent(order.order_no)}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slipId,
          action,
          shippingFee: action === "approve" ? shippingFee : undefined,
        }),
      });

      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? t.reviewFailed);
      }

      window.location.reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t.reviewFailed);
    } finally {
      setLoadingSlipId(null);
    }
  };

  return (
    <div className="space-y-6">
      {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

      <section className="sst-card-soft rounded-2xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-heading text-xl font-semibold text-slate-900">Order {order.order_no}</h2>
            <p className="mt-1 text-sm text-slate-600">{new Date(order.created_at).toLocaleString()}</p>
          </div>
          {canPrintReceipt ? (
            <a
              href={receiptUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
            >
              {t.openReceipt}
            </a>
          ) : null}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div>
            <p className="text-xs text-slate-500">{t.customer}</p>
            <p className="font-medium text-slate-900">{order.customer_name_snapshot}</p>
            <p className="text-sm text-slate-600">{order.customer_phone_snapshot}</p>
            <p className="text-sm text-slate-600">{order.customer_email_snapshot || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">{t.payment}</p>
            <p className="font-medium text-slate-900">{order.payment_method}</p>
            <p className="text-sm text-slate-600">
              {t.status}: {order.status}
            </p>
            <p className="text-sm text-slate-600">
              {t.paymentStatus}: {order.payment_status}
            </p>
            {canPrintReceipt ? (
              <>
                <p className="text-sm text-slate-600">
                  {t.receiptNo}: {order.receipt_no}
                </p>
                <p className="text-sm text-slate-600">
                  {t.receiptIssuedAt}: {new Date(order.receipt_issued_at).toLocaleString()}
                </p>
              </>
            ) : null}
          </div>
        </div>
        {order.shipping_address ? (
          <div className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            <p className="text-xs font-semibold text-slate-500">{t.shippingAddress}</p>
            <p className="mt-1 whitespace-pre-wrap">{order.shipping_address}</p>
          </div>
        ) : null}
        {order.note ? (
          <div className="mt-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            <p className="text-xs font-semibold text-slate-500">{t.note}</p>
            <p className="mt-1 whitespace-pre-wrap">{order.note}</p>
          </div>
        ) : null}
        {order.promptpay_link_snapshot ? (
          <a
            href={order.promptpay_link_snapshot}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-50"
          >
            {t.openPromptpay}
          </a>
        ) : null}
      </section>

      <section className="glass-card overflow-x-auto rounded-2xl">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50/75">
            <tr className="text-left text-slate-600">
              <th className="px-5 py-3 font-medium">{t.sku}</th>
              <th className="px-5 py-3 font-medium">{t.product}</th>
              <th className="px-5 py-3 font-medium">{t.unit}</th>
              <th className="px-5 py-3 font-medium">{t.qty}</th>
              <th className="px-5 py-3 font-medium">{t.lineTotal}</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="border-t border-slate-200 text-slate-600">
                <td className="px-5 py-3 font-semibold text-slate-900">{item.sku_snapshot}</td>
                <td className="px-5 py-3">{item.name_snapshot}</td>
                <td className="px-5 py-3">THB {item.unit_price_snapshot.toLocaleString()}</td>
                <td className="px-5 py-3">{item.qty}</td>
                <td className="px-5 py-3">THB {item.line_total.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="sst-card-soft rounded-2xl p-5">
        <h3 className="font-heading text-lg font-semibold text-slate-900">{t.slips}</h3>
        {hasPendingReviewSlip ? (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <label className="block text-xs font-semibold text-amber-900">{t.shippingFeeInput}</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={shippingFeeInput}
              onChange={(event) => setShippingFeeInput(event.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-amber-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100 md:max-w-xs"
            />
            <p className="mt-1 text-xs text-amber-900/80">{t.shippingFeeHint}</p>
          </div>
        ) : null}
        {order.slips.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">{t.noSlips}</p>
        ) : (
          <div className="mt-3 space-y-3">
            {order.slips.map((slip) => {
              const isLoading = loadingSlipId === slip.id;
              const canReview = slip.status === "pending_review";

              return (
                <article key={slip.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-900">
                    {t.status}: {slip.status}
                  </p>
                  <p className="text-xs text-slate-500">
                    {t.uploaded}: {new Date(slip.uploaded_at).toLocaleString()}
                  </p>
                  {slip.reviewed_at ? (
                    <p className="text-xs text-slate-500">
                      {t.reviewedAt}: {new Date(slip.reviewed_at).toLocaleString()}
                    </p>
                  ) : null}
                  {slip.note ? <p className="mt-1 text-xs text-slate-600">{slip.note}</p> : null}
                  {slip.file_url ? (
                    <a
                      href={slip.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex text-sm font-semibold text-blue-700 hover:underline"
                    >
                      {t.viewSlip}
                    </a>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500">{slip.file_path}</p>
                  )}
                  {canReview ? (
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => reviewSlip(slip.id, "approve")}
                        disabled={isLoading}
                        className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        {isLoading ? t.reviewing : t.approve}
                      </button>
                      <button
                        type="button"
                        onClick={() => reviewSlip(slip.id, "reject")}
                        disabled={isLoading}
                        className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                      >
                        {isLoading ? t.reviewing : t.reject}
                      </button>
                    </div>
                  ) : (
                    <p className="mt-3 text-xs font-medium text-slate-500">{t.noSlipActions}</p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="sst-card-soft rounded-2xl p-5">
        <h3 className="font-heading text-lg font-semibold text-slate-900">{t.summary}</h3>
        <dl className="mt-3 space-y-1 text-sm text-slate-700">
          <div className="flex justify-between">
            <dt>{t.subtotal}</dt>
            <dd>THB {order.sub_total.toLocaleString()}</dd>
          </div>
          <div className="flex justify-between">
            <dt>{t.discount}</dt>
            <dd>THB {order.discount_total.toLocaleString()}</dd>
          </div>
          <div className="flex justify-between">
            <dt>{t.shipping}</dt>
            <dd>THB {previewShippingFee.toLocaleString()}</dd>
          </div>
          <div className="flex justify-between font-semibold text-slate-900">
            <dt>{t.grandTotal}</dt>
            <dd>THB {previewGrandTotal.toLocaleString()}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

