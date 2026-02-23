import { getAdminActor } from "../../../lib/auth/admin";
import { getAdminLocale } from "../../../lib/i18n/admin";

const KPI_CARDS = [
  {
    label: { th: "ออเดอร์วันนี้", en: "Orders Today" },
    value: "128",
    hint: { th: "+12% เทียบเมื่อวาน", en: "+12% vs yesterday" },
    mobileTone: "dashboard-kpi-orders",
  },
  {
    label: { th: "รายได้วันนี้", en: "Revenue Today" },
    value: "THB 84,500",
    hint: { th: "+8% เทียบเมื่อวาน", en: "+8% vs yesterday" },
    mobileTone: "dashboard-kpi-revenue",
  },
  {
    label: { th: "รอดำเนินการ", en: "Pending" },
    value: "23",
    hint: { th: "รอยืนยันคำสั่งซื้อ", en: "Need confirmation" },
    mobileTone: "dashboard-kpi-pending",
  },
  {
    label: { th: "สต็อกต่ำ", en: "Low Stock" },
    value: "9",
    hint: { th: "สินค้าต่ำกว่าเกณฑ์", en: "Products below threshold" },
    mobileTone: "dashboard-kpi-low-stock",
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
  await getAdminActor();
  const locale = await getAdminLocale();
  const text = {
    title: locale === "th" ? "แดชบอร์ด" : "Dashboard",
    boardTitle: locale === "th" ? "ภาพรวม" : "Overview",
    subtitle:
      locale === "th"
        ? "ภาพรวมกิจกรรมผู้ดูแลของวันนี้"
        : "Overview of today's admin activity",
    recentOrders: locale === "th" ? "ออเดอร์ล่าสุด" : "Recent Orders",
    orderId: locale === "th" ? "รหัสออเดอร์" : "Order ID",
    customer: locale === "th" ? "ลูกค้า" : "Customer",
    total: locale === "th" ? "ยอดรวม" : "Total",
    status: locale === "th" ? "สถานะ" : "Status",
    today: locale === "th" ? "วันนี้" : "Today",
  };

  return (
    <div className="dashboard-root space-y-6">
      <section className="dashboard-mobile-overview-board sst-card-soft rounded-2xl p-4">
        <p className="text-xs uppercase tracking-[0.24em] text-blue-600">{text.boardTitle}</p>
        <h2 className="mt-1 font-heading text-3xl font-semibold tracking-tight text-slate-900">{text.title}</h2>
        <p className="mt-1 text-sm text-slate-600">{text.subtitle}</p>
      </section>

      <header className="flex flex-col gap-3">
        <h1 className="font-heading text-4xl font-semibold tracking-tight text-slate-900">{text.title}</h1>
        <p className="text-sm text-slate-600">{text.subtitle}</p>
      </header>

      <section className="dashboard-overview-card sst-card-soft rounded-2xl p-4">
        <h2 className="font-heading text-2xl font-semibold text-blue-900">{locale === "th" ? "Dashboard" : "Dashboard"}</h2>
      </section>

      <section className="dashboard-kpi-grid grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {KPI_CARDS.map((card) => (
          <article key={card.label.en} className={`dashboard-kpi-card sst-card-soft rounded-2xl p-5 ${card.mobileTone}`}>
            <div className="dashboard-kpi-head flex items-start justify-between gap-2">
              <p className="dashboard-kpi-label text-sm font-semibold text-slate-900">{card.label[locale]}</p>
              <span className="dashboard-kpi-icon inline-flex h-8 w-8 items-center justify-center rounded-lg text-blue-700">
                <KpiIcon label={card.label.en} />
              </span>
            </div>
            <p className="dashboard-kpi-value mt-2 text-3xl font-semibold text-blue-700">{card.value}</p>
            <p className="dashboard-kpi-hint mt-1 text-xs text-slate-500">{card.hint[locale]}</p>
            <p className="dashboard-kpi-today mt-1 text-xs text-slate-500">{text.today}</p>
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

function KpiIcon({ label }: { label: string }) {
  if (label === "Revenue Today") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9">
        <rect x="3.5" y="6" width="17" height="12" rx="2.5" />
        <circle cx="12" cy="12" r="2.2" />
      </svg>
    );
  }

  if (label === "Orders Today") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9">
        <path d="M4 6h2l2 10h9l2-7H7.2" />
        <circle cx="10" cy="19" r="1.2" />
        <circle cx="17" cy="19" r="1.2" />
      </svg>
    );
  }

  if (label === "Pending") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9">
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v5l3 2" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M4 7h16" />
      <path d="M6 11h12" />
      <path d="M8 15h8" />
    </svg>
  );
}





