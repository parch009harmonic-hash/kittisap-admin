import Link from "next/link";

import { listAdminOrders } from "../../../../lib/db/admin-orders";
import { getAdminLocale } from "../../../../lib/i18n/admin";
import { AdminOrderReviewActions } from "../../../components/admin/orders/AdminOrderReviewActions";

function statusClass(status: string) {
  if (status === "paid") return "bg-emerald-100 text-emerald-700";
  if (status === "pending_review") return "bg-sky-100 text-sky-700";
  if (status === "pending_payment") return "bg-amber-100 text-amber-700";
  if (status === "processing") return "bg-indigo-100 text-indigo-700";
  if (status === "cancelled") return "bg-rose-100 text-rose-700";
  return "bg-zinc-100 text-zinc-700";
}

type AdminOrdersPageProps = {
  searchParams: Promise<{ q?: string; status?: string }>;
};

export default async function AdminOrdersPage({ searchParams }: AdminOrdersPageProps) {
  const locale = await getAdminLocale();
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const status = typeof params.status === "string" ? params.status : "";

  let orders = [] as Awaited<ReturnType<typeof listAdminOrders>>;
  let loadError: string | null = null;

  try {
    orders = await listAdminOrders({ q, status, limit: 200 });
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Failed to load orders";
  }

  const text = {
    section: locale === "th" ? "คำสั่งซื้อ" : "Orders",
    title: locale === "th" ? "คำสั่งซื้อ" : "Orders",
    subtitle:
      locale === "th"
        ? "ติดตามและจัดการคำสั่งซื้อทั้งหมด"
        : "Track and manage customer orders",
    export: locale === "th" ? "ส่งออกข้อมูล" : "Export",
    searchPlaceholder:
      locale === "th" ? "ค้นหาเลขที่คำสั่งซื้อ หรือลูกค้า..." : "Search order id or customer...",
    allStatus: locale === "th" ? "ทุกสถานะ" : "All status",
    pendingPayment: locale === "th" ? "รอชำระเงิน" : "Pending Payment",
    pendingReview: locale === "th" ? "รอตรวจสอบสลิป" : "Pending Review",
    paid: locale === "th" ? "ชำระแล้ว" : "Paid",
    processing: locale === "th" ? "กำลังจัดเตรียม" : "Processing",
    filter: locale === "th" ? "กรอง" : "Filter",
    orderId: locale === "th" ? "เลขที่คำสั่งซื้อ" : "Order ID",
    customer: locale === "th" ? "ลูกค้า" : "Customer",
    createdAt: locale === "th" ? "วันที่สั่งซื้อ" : "Created At",
    total: locale === "th" ? "ยอดรวม" : "Total",
    status: locale === "th" ? "สถานะ" : "Status",
    paymentStatus: locale === "th" ? "ชำระเงิน" : "Payment",
    actions: locale === "th" ? "จัดการ" : "Actions",
    view: locale === "th" ? "ดู" : "View",
    noOrdersTitle: locale === "th" ? "ยังไม่มีคำสั่งซื้อ" : "No orders yet",
    noOrdersText:
      locale === "th"
        ? "เมื่อมีคำสั่งซื้อจากหน้าร้าน ข้อมูลจะแสดงในหน้านี้อัตโนมัติ"
        : "Orders from storefront will appear here automatically.",
    toProducts: locale === "th" ? "ไปหน้าสินค้า" : "Go to products",
  };

  return (
    <div className="space-y-6">
      <header className="relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-r from-sky-50 via-white to-cyan-50 px-5 py-6 shadow-sm md:px-7">
        <div className="pointer-events-none absolute -right-24 -top-20 h-56 w-56 rounded-full bg-sky-200/30 blur-3xl" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-blue-600">{text.section}</p>
            <h1 className="mt-1 font-heading text-4xl text-slate-900">{text.title}</h1>
            <p className="mt-2 text-sm text-slate-600">{text.subtitle}</p>
          </div>
          <button type="button" className="btn-primary rounded-full px-5 py-2 text-sm font-semibold">
            {text.export}
          </button>
        </div>
      </header>

      <form className="sst-card-soft grid grid-cols-1 gap-3 rounded-2xl p-4 md:grid-cols-[1fr_220px_auto]">
        <input name="q" defaultValue={q} type="search" placeholder={text.searchPlaceholder} className="input-base" />
        <select name="status" className="input-base" defaultValue={status}>
          <option value="">{text.allStatus}</option>
          <option value="pending_payment">{text.pendingPayment}</option>
          <option value="pending_review">{text.pendingReview}</option>
          <option value="paid">{text.paid}</option>
          <option value="processing">{text.processing}</option>
        </select>
        <button
          type="submit"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
        >
          {text.filter}
        </button>
      </form>

      {loadError ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{loadError}</p> : null}

      {orders.length === 0 ? (
        <div className="sst-card-soft rounded-2xl border border-dashed border-slate-200 px-6 py-12 text-center">
          <p className="text-lg font-semibold text-slate-900">{text.noOrdersTitle}</p>
          <p className="mt-1 text-sm text-slate-600">{text.noOrdersText}</p>
          <div className="mt-4">
            <Link href="/admin/products" className="btn-primary inline-flex rounded-full px-4 py-2 text-sm font-semibold">
              {text.toProducts}
            </Link>
          </div>
        </div>
      ) : (
        <div className="glass-card overflow-x-auto rounded-2xl">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50/75">
              <tr className="text-left text-slate-600">
                <th className="px-5 py-3 font-medium">{text.orderId}</th>
                <th className="px-5 py-3 font-medium">{text.customer}</th>
                <th className="px-5 py-3 font-medium">{text.createdAt}</th>
                <th className="px-5 py-3 font-medium">{text.total}</th>
                <th className="px-5 py-3 font-medium">{text.status}</th>
                <th className="px-5 py-3 font-medium">{text.paymentStatus}</th>
                <th className="px-5 py-3 font-medium">{text.actions}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-t border-slate-200 text-slate-600 hover:bg-slate-50/70">
                  <td className="px-5 py-3 font-semibold text-slate-900">{order.order_no}</td>
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-900">{order.customer_name}</p>
                    <p className="text-xs text-slate-500">{order.customer_phone}</p>
                  </td>
                  <td className="px-5 py-3">{new Date(order.created_at).toLocaleString()}</td>
                  <td className="px-5 py-3">THB {order.grand_total.toLocaleString()}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${statusClass(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-5 py-3">{order.payment_status}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/orders/${encodeURIComponent(order.order_no)}`}
                        className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 hover:bg-slate-50"
                      >
                        {text.view}
                      </Link>
                      <AdminOrderReviewActions orderNo={order.order_no} slipId={order.latest_pending_slip_id} locale={locale} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
