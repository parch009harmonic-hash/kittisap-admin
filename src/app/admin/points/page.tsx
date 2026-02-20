import Link from "next/link";

import { getAdminLocale } from "../../../../lib/i18n/admin";

type UiPointRow = {
  id: string;
  customer: string;
  points: number;
  tier: "silver" | "gold" | "platinum";
  lastUpdated: string;
};

const MOCK_POINTS: UiPointRow[] = [];

function tierClass(tier: UiPointRow["tier"]) {
  if (tier === "platinum") return "bg-sky-100 text-sky-700";
  if (tier === "gold") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

export default async function AdminPointsPage() {
  const locale = await getAdminLocale();

  const text = {
    section: locale === "th" ? "แต้ม" : "Points",
    title: locale === "th" ? "ระบบแต้มสะสม" : "Points Program",
    subtitle:
      locale === "th"
        ? "จัดการคะแนนลูกค้าและระดับสมาชิก"
        : "Manage customer points and membership tiers",
    adjust: locale === "th" ? "ปรับแต้ม" : "Adjust Points",
    search: locale === "th" ? "ค้นหาลูกค้า..." : "Search customer...",
    allTier: locale === "th" ? "ทุกระดับ" : "All tiers",
    silver: locale === "th" ? "เงิน" : "Silver",
    gold: locale === "th" ? "ทอง" : "Gold",
    platinum: locale === "th" ? "แพลทินัม" : "Platinum",
    filter: locale === "th" ? "กรอง" : "Filter",
    customer: locale === "th" ? "ลูกค้า" : "Customer",
    points: locale === "th" ? "คะแนน" : "Points",
    tier: locale === "th" ? "ระดับ" : "Tier",
    updated: locale === "th" ? "อัปเดตล่าสุด" : "Last Updated",
    actions: locale === "th" ? "จัดการ" : "Actions",
    view: locale === "th" ? "ดู" : "View",
    noTitle: locale === "th" ? "ยังไม่มีข้อมูลแต้ม" : "No points data yet",
    noText:
      locale === "th"
        ? "เมื่อมีการสะสมคะแนนจากออเดอร์ ข้อมูลจะแสดงที่หน้านี้"
        : "Points will appear here once orders start accumulating rewards.",
    toOrders: locale === "th" ? "ไปหน้าคำสั่งซื้อ" : "Go to orders",
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
            {text.adjust}
          </button>
        </div>
      </header>

      <form className="sst-card-soft grid grid-cols-1 gap-3 rounded-2xl p-4 md:grid-cols-[1fr_220px_auto]">
        <input type="search" placeholder={text.search} className="input-base" />
        <select className="input-base" defaultValue="">
          <option value="">{text.allTier}</option>
          <option value="silver">{text.silver}</option>
          <option value="gold">{text.gold}</option>
          <option value="platinum">{text.platinum}</option>
        </select>
        <button
          type="submit"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
        >
          {text.filter}
        </button>
      </form>

      {MOCK_POINTS.length === 0 ? (
        <div className="sst-card-soft rounded-2xl border border-dashed border-slate-200 px-6 py-12 text-center">
          <p className="text-lg font-semibold text-slate-900">{text.noTitle}</p>
          <p className="mt-1 text-sm text-slate-600">{text.noText}</p>
          <div className="mt-4">
            <Link href="/admin/orders" className="btn-primary inline-flex rounded-full px-4 py-2 text-sm font-semibold">
              {text.toOrders}
            </Link>
          </div>
        </div>
      ) : (
        <div className="glass-card overflow-x-auto rounded-2xl">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50/75">
              <tr className="text-left text-slate-600">
                <th className="px-5 py-3 font-medium">{text.customer}</th>
                <th className="px-5 py-3 font-medium">{text.points}</th>
                <th className="px-5 py-3 font-medium">{text.tier}</th>
                <th className="px-5 py-3 font-medium">{text.updated}</th>
                <th className="px-5 py-3 font-medium">{text.actions}</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_POINTS.map((row) => (
                <tr key={row.id} className="border-t border-slate-200 text-slate-600 hover:bg-slate-50/70">
                  <td className="px-5 py-3 font-semibold text-slate-900">{row.customer}</td>
                  <td className="px-5 py-3">{row.points.toLocaleString()}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${tierClass(row.tier)}`}>
                      {row.tier}
                    </span>
                  </td>
                  <td className="px-5 py-3">{row.lastUpdated}</td>
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
