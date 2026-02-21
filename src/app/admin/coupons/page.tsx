import Link from "next/link";

import { getAdminLocale } from "../../../../lib/i18n/admin";

type UiCoupon = {
  id: string;
  code: string;
  type: "percent" | "fixed";
  value: string;
  usage: string;
  status: "active" | "expired";
};

const MOCK_COUPONS: UiCoupon[] = [];
const MOCK_POINTS: { id: string; customer: string; points: number; tier: "silver" | "gold" | "platinum" }[] = [];

function statusClass(status: UiCoupon["status"]) {
  if (status === "active") return "bg-emerald-100 text-emerald-700";
  return "bg-rose-100 text-rose-700";
}

export default async function AdminCouponsPage() {
  const locale = await getAdminLocale();

  const text = {
    section: locale === "th" ? "คูปองและแต้ม" : "Coupons & Points",
    title: locale === "th" ? "คูปองส่วนลดและแต้มสะสม" : "Coupons & Points",
    subtitle:
      locale === "th"
        ? "จัดการโค้ดส่วนลด โปรโมชัน และระบบแต้มสะสม"
        : "Manage coupons, promotions, and points system.",
    addCoupon: locale === "th" ? "เพิ่มคูปอง" : "Add Coupon",
    pointsSection: locale === "th" ? "แต้มสะสมลูกค้า" : "Customer Points",
    pointsSubtitle:
      locale === "th"
        ? "จัดการคะแนนสะสมและระดับสมาชิกในหน้าเดียว"
        : "Manage loyalty points and customer tiers in one place.",
    adjustPoints: locale === "th" ? "ปรับแต้ม" : "Adjust Points",
    pointSearch: locale === "th" ? "ค้นหาลูกค้า..." : "Search customer...",
    allTier: locale === "th" ? "ทุกระดับ" : "All tiers",
    silver: locale === "th" ? "เงิน" : "Silver",
    gold: locale === "th" ? "ทอง" : "Gold",
    platinum: locale === "th" ? "แพลทินัม" : "Platinum",
    noPointsTitle: locale === "th" ? "ยังไม่มีข้อมูลแต้ม" : "No points data yet",
    noPointsText:
      locale === "th"
        ? "เมื่อมีการสะสมคะแนนจากออเดอร์ ข้อมูลจะแสดงที่หน้านี้"
        : "Points will appear here once orders start accumulating rewards.",
    search: locale === "th" ? "ค้นหารหัสคูปอง..." : "Search coupon code...",
    allStatus: locale === "th" ? "ทุกสถานะ" : "All status",
    active: locale === "th" ? "ใช้งาน" : "active",
    expired: locale === "th" ? "หมดอายุ" : "expired",
    filter: locale === "th" ? "กรอง" : "Filter",
    code: locale === "th" ? "รหัส" : "Code",
    type: locale === "th" ? "ประเภท" : "Type",
    value: locale === "th" ? "มูลค่า" : "Value",
    usage: locale === "th" ? "การใช้งาน" : "Usage",
    status: locale === "th" ? "สถานะ" : "Status",
    actions: locale === "th" ? "จัดการ" : "Actions",
    view: locale === "th" ? "ดู" : "View",
    noTitle: locale === "th" ? "ยังไม่มีคูปอง" : "No coupons yet",
    noText:
      locale === "th"
        ? "คุณสามารถเริ่มสร้างคูปองส่วนลดแรกได้ทันที"
        : "You can create your first coupon now.",
    toProducts: locale === "th" ? "ไปหน้าสินค้า" : "Go to products",
    toOrders: locale === "th" ? "ไปหน้าคำสั่งซื้อ" : "Go to orders",
    coupon: locale === "th" ? "คูปอง" : "Coupon",
    useCoupon: locale === "th" ? "ใช้คูปอง" : "Use Coupon",
    availability: locale === "th" ? "การใช้งาน" : "Availability",
    beginDate: locale === "th" ? "เริ่มต้น" : "Begin date",
    expiryDate: locale === "th" ? "หมดอายุ" : "Expiration date",
    condition: locale === "th" ? "เงื่อนไข" : "Condition",
    limit: locale === "th" ? "จำนวนสิทธิ์" : "Limit",
    validOn: locale === "th" ? "ใช้ได้กับ" : "Valid on",
    everyday: locale === "th" ? "ทุกวัน" : "Everyday",
    noCouponYet: locale === "th" ? "ยังไม่มีคูปองในระบบ" : "No coupon in the system yet",
  };

  const featuredCoupon = MOCK_COUPONS[0] ?? null;
  const couponTitle = featuredCoupon
    ? featuredCoupon.type === "percent"
      ? locale === "th"
        ? `ส่วนลด ${featuredCoupon.value}`
        : `${featuredCoupon.value} Discount`
      : locale === "th"
        ? `ส่วนลด ${featuredCoupon.value}`
        : `Save ${featuredCoupon.value}`
    : locale === "th"
      ? "คูปองสำหรับลูกค้า"
      : "Customer coupon";

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
          <div className="flex items-center gap-2">
            <button type="button" className="coupon-page-add-btn btn-primary rounded-full px-5 py-2 text-sm font-semibold">
              {text.addCoupon}
            </button>
          </div>
        </div>
      </header>

      <form className="sst-card-soft grid grid-cols-1 gap-3 rounded-2xl p-4 md:grid-cols-[1fr_220px_auto]">
        <input type="search" placeholder={text.search} className="input-base" />
        <select className="input-base" defaultValue="">
          <option value="">{text.allStatus}</option>
          <option value="active">{text.active}</option>
          <option value="expired">{text.expired}</option>
        </select>
        <button
          type="submit"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
        >
          {text.filter}
        </button>
      </form>

      <section className="coupon-mobile-preview sst-card-soft md:hidden">
        <div className="coupon-mobile-preview-head">
          <span>{text.coupon}</span>
          <span>{featuredCoupon ? featuredCoupon.code : text.noCouponYet}</span>
        </div>
        <div className="coupon-mobile-preview-media" />
        <button type="button" className="coupon-mobile-preview-btn">
          {text.useCoupon}
        </button>
        <p className="coupon-mobile-preview-title">{couponTitle}</p>
        <div className="coupon-mobile-preview-info">
          <h3>{text.availability}</h3>
          <dl>
            <dt>{text.beginDate}</dt>
            <dd>{featuredCoupon ? featuredCoupon.usage : "-"}</dd>
            <dt>{text.expiryDate}</dt>
            <dd>{featuredCoupon?.status === "expired" ? text.expired : text.active}</dd>
          </dl>
        </div>
        <div className="coupon-mobile-preview-info">
          <h3>{text.condition}</h3>
          <dl>
            <dt>{text.limit}</dt>
            <dd>{featuredCoupon ? featuredCoupon.value : "-"}</dd>
            <dt>{text.validOn}</dt>
            <dd>{text.everyday}</dd>
          </dl>
        </div>
      </section>

      {MOCK_COUPONS.length === 0 ? (
        <div className="sst-card-soft rounded-2xl border border-dashed border-slate-200 px-6 py-12 text-center">
          <p className="text-lg font-semibold text-slate-900">{text.noTitle}</p>
          <p className="mt-1 text-sm text-slate-600">{text.noText}</p>
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
                <th className="px-5 py-3 font-medium">{text.code}</th>
                <th className="px-5 py-3 font-medium">{text.type}</th>
                <th className="px-5 py-3 font-medium">{text.value}</th>
                <th className="px-5 py-3 font-medium">{text.usage}</th>
                <th className="px-5 py-3 font-medium">{text.status}</th>
                <th className="px-5 py-3 font-medium">{text.actions}</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_COUPONS.map((coupon) => (
                <tr key={coupon.id} className="border-t border-slate-200 text-slate-600 hover:bg-slate-50/70">
                  <td className="px-5 py-3 font-semibold text-slate-900">{coupon.code}</td>
                  <td className="px-5 py-3">{coupon.type}</td>
                  <td className="px-5 py-3">{coupon.value}</td>
                  <td className="px-5 py-3">{coupon.usage}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${statusClass(coupon.status)}`}>
                      {coupon.status}
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

      <section className="sst-card-soft space-y-4 rounded-2xl p-4 md:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-xl font-semibold text-slate-900">{text.pointsSection}</h2>
            <p className="mt-1 text-sm text-slate-600">{text.pointsSubtitle}</p>
          </div>
          <button type="button" className="coupon-page-add-btn btn-primary rounded-full px-4 py-2 text-sm font-semibold">
            {text.adjustPoints}
          </button>
        </div>

        <form className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px_auto]">
          <input type="search" placeholder={text.pointSearch} className="input-base" />
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
          <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-10 text-center">
            <p className="text-lg font-semibold text-slate-900">{text.noPointsTitle}</p>
            <p className="mt-1 text-sm text-slate-600">{text.noPointsText}</p>
            <div className="mt-4">
              <Link href="/admin/orders" className="btn-primary inline-flex rounded-full px-4 py-2 text-sm font-semibold">
                {text.toOrders}
              </Link>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
