import Link from "next/link";

import { getAdminLocale } from "../../../../lib/i18n/admin";

type UiOrder = {
  id: string;
  customer: string;
  total: string;
  status: "paid" | "pending" | "processing";
  createdAt: string;
};

const MOCK_ORDERS: UiOrder[] = [];

function statusClass(status: UiOrder["status"]) {
  if (status === "paid") return "bg-emerald-100 text-emerald-700";
  if (status === "pending") return "bg-amber-100 text-amber-700";
  return "bg-sky-100 text-sky-700";
}

export default async function AdminOrdersPage() {
  const locale = await getAdminLocale();

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
    paid: locale === "th" ? "ชำระแล้ว" : "Paid",
    pending: locale === "th" ? "รอดำเนินการ" : "Pending",
    processing: locale === "th" ? "กำลังจัดเตรียม" : "Processing",
    filter: locale === "th" ? "กรอง" : "Filter",
    orderId: locale === "th" ? "เลขที่คำสั่งซื้อ" : "Order ID",
    customer: locale === "th" ? "ลูกค้า" : "Customer",
    createdAt: locale === "th" ? "วันที่สั่งซื้อ" : "Created At",
    total: locale === "th" ? "ยอดรวม" : "Total",
    status: locale === "th" ? "สถานะ" : "Status",
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
        <input type="search" placeholder={text.searchPlaceholder} className="input-base" />
        <select className="input-base" defaultValue="">
          <option value="">{text.allStatus}</option>
          <option value="paid">{text.paid}</option>
          <option value="pending">{text.pending}</option>
          <option value="processing">{text.processing}</option>
        </select>
        <button
          type="submit"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
        >
          {text.filter}
        </button>
      </form>

      {MOCK_ORDERS.length === 0 ? (
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
                <th className="px-5 py-3 font-medium">{text.actions}</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_ORDERS.map((order) => (
                <tr key={order.id} className="border-t border-slate-200 text-slate-600 hover:bg-slate-50/70">
                  <td className="px-5 py-3 font-semibold text-slate-900">{order.id}</td>
                  <td className="px-5 py-3">{order.customer}</td>
                  <td className="px-5 py-3">{order.createdAt}</td>
                  <td className="px-5 py-3">{order.total}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${statusClass(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <button
                      type="button"
                      className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 hover:bg-slate-50"
                    >
                      {text.view}
                    </button>
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
