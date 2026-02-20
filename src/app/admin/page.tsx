import { getAdminLocale } from "../../../lib/i18n/admin";

const KPI_CARDS = [
  {
    label: { th: "ออเดอร์วันนี้", en: "Orders Today" },
    value: "128",
    hint: { th: "+12% เทียบเมื่อวาน", en: "+12% vs yesterday" },
  },
  {
    label: { th: "รายได้วันนี้", en: "Revenue Today" },
    value: "THB 84,500",
    hint: { th: "+8% เทียบเมื่อวาน", en: "+8% vs yesterday" },
  },
  {
    label: { th: "รอดำเนินการ", en: "Pending" },
    value: "23",
    hint: { th: "รอยืนยันคำสั่งซื้อ", en: "Need confirmation" },
  },
  {
    label: { th: "สต็อกต่ำ", en: "Low Stock" },
    value: "9",
    hint: { th: "สินค้าต่ำกว่าเกณฑ์", en: "Products below threshold" },
  },
] as const;

const RECENT_ORDERS = [
  { id: "#ORD-1042", customer: "Napat C.", total: "THB 1,290", status: "paid" },
  { id: "#ORD-1041", customer: "Suda P.", total: "THB 2,450", status: "pending" },
  { id: "#ORD-1040", customer: "Korn T.", total: "THB 890", status: "processing" },
  { id: "#ORD-1039", customer: "Mali S.", total: "THB 3,100", status: "paid" },
] as const;

type OrderStatus = (typeof RECENT_ORDERS)[number]["status"];

function statusClass(status: OrderStatus) {
  if (status === "paid") return "bg-emerald-100 text-emerald-700";
  if (status === "pending") return "bg-amber-100 text-amber-700";
  return "bg-blue-100 text-blue-700";
}

function statusText(status: OrderStatus, locale: "th" | "en") {
  if (status === "paid") {
    return locale === "th" ? "ชำระแล้ว" : "Paid";
  }
  if (status === "pending") {
    return locale === "th" ? "รอดำเนินการ" : "Pending";
  }
  return locale === "th" ? "กำลังจัดการ" : "Processing";
}

export default async function AdminDashboardPage() {
  const locale = await getAdminLocale();
  const text = {
    title: locale === "th" ? "แดชบอร์ด" : "Dashboard",
    subtitle:
      locale === "th"
        ? "ภาพรวมกิจกรรมผู้ดูแลของวันนี้"
        : "Overview of today's admin activity",
    recentOrders: locale === "th" ? "ออเดอร์ล่าสุด" : "Recent Orders",
    orderId: locale === "th" ? "รหัสออเดอร์" : "Order ID",
    customer: locale === "th" ? "ลูกค้า" : "Customer",
    total: locale === "th" ? "ยอดรวม" : "Total",
    status: locale === "th" ? "สถานะ" : "Status",
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3">
        <h1 className="font-heading text-4xl font-semibold tracking-tight text-slate-900">{text.title}</h1>
        <p className="text-sm text-slate-600">{text.subtitle}</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {KPI_CARDS.map((card) => (
          <article key={card.label.en} className="sst-card-soft rounded-2xl p-5">
            <p className="text-sm font-semibold text-slate-900">{card.label[locale]}</p>
            <p className="mt-2 text-3xl font-semibold text-blue-700">{card.value}</p>
            <p className="mt-1 text-xs text-slate-500">{card.hint[locale]}</p>
          </article>
        ))}
      </section>

      <section className="sst-card-soft overflow-hidden rounded-2xl">
        <div className="border-b border-slate-200 px-4 py-4 md:px-5">
          <h2 className="font-heading text-xl font-semibold text-slate-900">{text.recentOrders}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr className="text-left">
                <th className="px-4 py-3 font-medium md:px-5">{text.orderId}</th>
                <th className="px-4 py-3 font-medium md:px-5">{text.customer}</th>
                <th className="px-4 py-3 font-medium md:px-5">{text.total}</th>
                <th className="px-4 py-3 font-medium md:px-5">{text.status}</th>
              </tr>
            </thead>
            <tbody>
              {RECENT_ORDERS.map((order) => (
                <tr key={order.id} className="border-t border-slate-200 text-slate-600 hover:bg-slate-50/70">
                  <td className="px-4 py-3 font-semibold text-slate-900 md:px-5">{order.id}</td>
                  <td className="px-4 py-3 md:px-5">{order.customer}</td>
                  <td className="px-4 py-3 md:px-5">{order.total}</td>
                  <td className="px-4 py-3 md:px-5">
                    <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${statusClass(order.status)}`}>
                      {statusText(order.status, locale)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
