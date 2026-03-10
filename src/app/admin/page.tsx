import { redirect } from "next/navigation";

import { getBackofficeActor } from "../../../lib/auth/admin";
import { listAdminOrders } from "../../../lib/db/admin-orders";
import { getAdminLocale } from "../../../lib/i18n/admin";
import { getSupabaseServiceRoleClient } from "../../../lib/supabase/service";

const LOW_STOCK_THRESHOLD = 5;
const ORDER_ARCHIVE_PRODUCT_SLUG = "order-item-archive";

type DashboardOrderRow = Awaited<ReturnType<typeof listAdminOrders>>[number];

type DashboardSummary = {
  ordersToday: number;
  revenueToday: number;
  pendingOrders: number;
  lowStockProducts: number;
  recentOrders: DashboardOrderRow[];
};

type DashboardKpiCard = {
  label: { th: string; en: string };
  value: string;
  hint: { th: string; en: string };
  mobileTone: "dashboard-kpi-orders" | "dashboard-kpi-revenue" | "dashboard-kpi-pending" | "dashboard-kpi-low-stock";
};

function statusClass(status: string) {
  if (status === "paid") return "bg-emerald-100 text-emerald-700";
  if (status === "pending_review") return "bg-sky-100 text-sky-700";
  if (status === "pending_payment") return "bg-amber-100 text-amber-700";
  if (status === "processing") return "bg-indigo-100 text-indigo-700";
  if (status === "shipped") return "bg-cyan-100 text-cyan-700";
  if (status === "completed") return "bg-emerald-100 text-emerald-700";
  if (status === "cancelled") return "bg-rose-100 text-rose-700";
  return "bg-zinc-100 text-zinc-700";
}

function statusText(status: string, locale: "th" | "en") {
  if (status === "paid") return locale === "th" ? "ชำระแล้ว" : "Paid";
  if (status === "pending_review") return locale === "th" ? "รอตรวจสอบสลิป" : "Pending Review";
  if (status === "pending_payment") return locale === "th" ? "รอชำระเงิน" : "Pending Payment";
  if (status === "processing") return locale === "th" ? "กำลังจัดเตรียม" : "Processing";
  if (status === "shipped") return locale === "th" ? "จัดส่งแล้ว" : "Shipped";
  if (status === "completed") return locale === "th" ? "เสร็จสิ้น" : "Completed";
  if (status === "cancelled") return locale === "th" ? "ยกเลิก" : "Cancelled";
  return status;
}

function getThailandDayRangeIso() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  const start = new Date(`${year}-${month}-${day}T00:00:00+07:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

function formatCurrencyTHB(value: number, locale: "th" | "en") {
  const localeCode = locale === "th" ? "th-TH" : "en-US";
  return new Intl.NumberFormat(localeCode, {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(Math.max(0, value));
}

function formatCount(value: number, locale: "th" | "en") {
  const localeCode = locale === "th" ? "th-TH" : "en-US";
  return new Intl.NumberFormat(localeCode).format(Math.max(0, value));
}

function formatOrderCreatedAt(value: string, locale: "th" | "en") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  const localeCode = locale === "th" ? "th-TH" : "en-US";
  return new Intl.DateTimeFormat(localeCode, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(date);
}

async function loadDashboardSummary() {
  const supabase = getSupabaseServiceRoleClient();
  const { startIso, endIso } = getThailandDayRangeIso();

  const [ordersTodayResult, pendingOrdersResult, lowStockProductsResult, recentOrders] = await Promise.all([
    supabase.from("orders").select("grand_total,payment_status").gte("created_at", startIso).lt("created_at", endIso),
    supabase.from("orders").select("id", { count: "exact", head: true }).in("status", ["pending_payment", "pending_review"]),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .lte("stock", LOW_STOCK_THRESHOLD)
      .neq("slug", ORDER_ARCHIVE_PRODUCT_SLUG),
    listAdminOrders({ limit: 6 }),
  ]);

  if (ordersTodayResult.error) {
    throw new Error(`Failed to load today's orders: ${ordersTodayResult.error.message}`);
  }
  if (pendingOrdersResult.error) {
    throw new Error(`Failed to load pending orders: ${pendingOrdersResult.error.message}`);
  }
  if (lowStockProductsResult.error) {
    throw new Error(`Failed to load low stock products: ${lowStockProductsResult.error.message}`);
  }

  const todayRows = (ordersTodayResult.data ?? []) as Array<{
    grand_total: number | null;
    payment_status: string | null;
  }>;
  const revenueToday = todayRows.reduce((sum, row) => {
    if (String(row.payment_status ?? "") !== "paid") {
      return sum;
    }
    return sum + Number(row.grand_total ?? 0);
  }, 0);

  return {
    ordersToday: todayRows.length,
    revenueToday,
    pendingOrders: pendingOrdersResult.count ?? 0,
    lowStockProducts: lowStockProductsResult.count ?? 0,
    recentOrders,
  } satisfies DashboardSummary;
}

export default async function AdminDashboardPage() {
  const actor = await getBackofficeActor();
  if (actor?.role === "developer") {
    redirect("/admin/developer");
  }
  const locale = await getAdminLocale();

  let summary: DashboardSummary = {
    ordersToday: 0,
    revenueToday: 0,
    pendingOrders: 0,
    lowStockProducts: 0,
    recentOrders: [],
  };
  let loadError: string | null = null;

  try {
    summary = await loadDashboardSummary();
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Failed to load dashboard data";
  }

  const kpiCards: DashboardKpiCard[] = [
    {
      label: { th: "ออเดอร์วันนี้", en: "Orders Today" },
      value: formatCount(summary.ordersToday, locale),
      hint: {
        th: `คำสั่งซื้อใหม่วันนี้ ${formatCount(summary.ordersToday, locale)} รายการ`,
        en: `${formatCount(summary.ordersToday, locale)} new orders today`,
      },
      mobileTone: "dashboard-kpi-orders",
    },
    {
      label: { th: "รายได้วันนี้", en: "Revenue Today" },
      value: formatCurrencyTHB(summary.revenueToday, locale),
      hint: {
        th: "นับเฉพาะออเดอร์ที่ชำระเงินแล้ววันนี้",
        en: "Paid orders recorded today",
      },
      mobileTone: "dashboard-kpi-revenue",
    },
    {
      label: { th: "รอดำเนินการ", en: "Pending" },
      value: formatCount(summary.pendingOrders, locale),
      hint: {
        th: "รอชำระเงินหรือรอตรวจสอบสลิป",
        en: "Pending payment or slip review",
      },
      mobileTone: "dashboard-kpi-pending",
    },
    {
      label: { th: "สต็อกต่ำ", en: "Low Stock" },
      value: formatCount(summary.lowStockProducts, locale),
      hint: {
        th: `สินค้า active ที่คงเหลือไม่เกิน ${LOW_STOCK_THRESHOLD}`,
        en: `Active products with stock <= ${LOW_STOCK_THRESHOLD}`,
      },
      mobileTone: "dashboard-kpi-low-stock",
    },
  ];

  const text = {
    title: locale === "th" ? "แดชบอร์ด" : "Dashboard",
    boardTitle: locale === "th" ? "ภาพรวม" : "Overview",
    subtitle: locale === "th" ? "ภาพรวมกิจกรรมผู้ดูแลของวันนี้" : "Overview of today's admin activity",
    recentOrders: locale === "th" ? "ออเดอร์ล่าสุด" : "Recent Orders",
    orderId: locale === "th" ? "รหัสออเดอร์" : "Order ID",
    customer: locale === "th" ? "ลูกค้า" : "Customer",
    total: locale === "th" ? "ยอดรวม" : "Total",
    status: locale === "th" ? "สถานะ" : "Status",
    today: locale === "th" ? "วันนี้" : "Today",
    loadError: locale === "th" ? "โหลดข้อมูลแดชบอร์ดไม่สำเร็จ" : "Failed to load dashboard data",
    noOrders: locale === "th" ? "ยังไม่มีคำสั่งซื้อล่าสุด" : "No recent orders yet",
    liveData: locale === "th" ? "ข้อมูลเรียลไทม์" : "Live Data",
  };

  return (
    <div className="dashboard-root space-y-6">
      {loadError ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {text.loadError}: {loadError}
        </p>
      ) : null}

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
        <h2 className="font-heading text-2xl font-semibold text-blue-900">{text.liveData}</h2>
      </section>

      <section className="dashboard-kpi-grid grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card) => (
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
              {summary.recentOrders.map((order) => (
                <tr key={order.id} className="border-t border-slate-200 text-slate-600 hover:bg-slate-50/70">
                  <td className="px-4 py-3 font-semibold text-slate-900 md:px-5">{order.order_no}</td>
                  <td className="px-4 py-3 md:px-5">{order.customer_name}</td>
                  <td className="px-4 py-3 md:px-5">{formatCurrencyTHB(order.grand_total, locale)}</td>
                  <td className="px-4 py-3 md:px-5">
                    <span
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${statusClass(order.status)}`}
                      title={formatOrderCreatedAt(order.created_at, locale)}
                    >
                      {statusText(order.status, locale)}
                    </span>
                  </td>
                </tr>
              ))}
              {summary.recentOrders.length === 0 ? (
                <tr className="border-t border-slate-200">
                  <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-500 md:px-5">
                    {text.noOrders}
                  </td>
                </tr>
              ) : null}
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

