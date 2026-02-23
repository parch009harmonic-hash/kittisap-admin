"use client";

import { useState } from "react";

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
      summary: "สรุปยอด",
      subtotal: "ยอดก่อนลด",
      discount: "ส่วนลด",
      shipping: "ค่าส่ง",
      grandTotal: "ยอดสุทธิ",
      reviewFailed: "ไม่สามารถตรวจสอบสลิปได้",
      reviewing: "กำลังบันทึก...",
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
    summary: "Summary",
    subtotal: "Subtotal",
    discount: "Discount",
    shipping: "Shipping",
    grandTotal: "Grand Total",
    reviewFailed: "Failed to review slip",
    reviewing: "Saving...",
  };
}

export function AdminOrderDetailClient({ order, locale }: AdminOrderDetailClientProps) {
  const [loadingSlipId, setLoadingSlipId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const t = text(locale);

  const reviewSlip = async (slipId: string, action: "approve" | "reject") => {
    setLoadingSlipId(slipId);
    setError(null);

    try {
      const response = await fetch(`/api/admin/orders/${encodeURIComponent(order.order_no)}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slipId, action }),
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
        <h2 className="font-heading text-xl font-semibold text-slate-900">Order {order.order_no}</h2>
        <p className="mt-1 text-sm text-slate-600">{new Date(order.created_at).toLocaleString()}</p>
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
            <p className="text-sm text-slate-600">{t.status}: {order.status}</p>
            <p className="text-sm text-slate-600">{t.paymentStatus}: {order.payment_status}</p>
          </div>
        </div>
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
        {order.slips.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">{t.noSlips}</p>
        ) : (
          <div className="mt-3 space-y-3">
            {order.slips.map((slip) => {
              const isLoading = loadingSlipId === slip.id;
              return (
                <article key={slip.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-900">{t.status}: {slip.status}</p>
                  <p className="text-xs text-slate-500">{t.uploaded}: {new Date(slip.uploaded_at).toLocaleString()}</p>
                  {slip.file_url ? (
                    <a href={slip.file_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-sm font-semibold text-blue-700 hover:underline">
                      {t.viewSlip}
                    </a>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500">{slip.file_path}</p>
                  )}
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
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="sst-card-soft rounded-2xl p-5">
        <h3 className="font-heading text-lg font-semibold text-slate-900">{t.summary}</h3>
        <dl className="mt-3 space-y-1 text-sm text-slate-700">
          <div className="flex justify-between"><dt>{t.subtotal}</dt><dd>THB {order.sub_total.toLocaleString()}</dd></div>
          <div className="flex justify-between"><dt>{t.discount}</dt><dd>THB {order.discount_total.toLocaleString()}</dd></div>
          <div className="flex justify-between"><dt>{t.shipping}</dt><dd>THB {order.shipping_fee.toLocaleString()}</dd></div>
          <div className="flex justify-between font-semibold text-slate-900"><dt>{t.grandTotal}</dt><dd>THB {order.grand_total.toLocaleString()}</dd></div>
        </dl>
      </section>
    </div>
  );
}
