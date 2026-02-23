import Link from "next/link";

import { PROMOTIONS } from "../../../data/promotions";
import type { AppLocale } from "../../../lib/i18n/locale";
import { CouponValidator } from "./CouponValidator";

type PromotionsPageProps = {
  locale: AppLocale;
};

function text(locale: AppLocale) {
  if (locale === "th") {
    return {
      title: "กิจกรรมและโปรโมชัน",
      subtitle: "ติดตามข่าวสาร กิจกรรมล่าสุด และตรวจสอบคูปองส่วนลดได้ในหน้าเดียว",
      event: "กิจกรรม",
      news: "ข่าวสาร",
      campaign: "แคมเปญ",
      readMore: "ดูรายละเอียด",
    };
  }

  return {
    title: "Promotions & Activities",
    subtitle: "Stay updated with events, news, and coupon validation in one place.",
    event: "Event",
    news: "News",
    campaign: "Campaign",
    readMore: "Read more",
  };
}

function getBadgeLabel(locale: AppLocale, badge: "event" | "news" | "campaign") {
  const t = text(locale);
  if (badge === "event") return t.event;
  if (badge === "news") return t.news;
  return t.campaign;
}

function buildPromotionsHref(locale: AppLocale, href?: string) {
  if (!href) {
    return locale === "th" ? "/promotions" : `/${locale}/promotions`;
  }

  if (href.startsWith("http")) {
    return href;
  }

  if (locale === "th") {
    return href;
  }

  return href === "/" ? `/${locale}` : `/${locale}${href}`;
}

export function PromotionsPage({ locale }: PromotionsPageProps) {
  const t = text(locale);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_#5c3f00_0%,_#1a1200_30%,_#090909_68%)] text-amber-50">
      <section className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 md:py-12">
        <header className="rounded-3xl border border-amber-500/35 bg-black/55 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur">
          <h1 className="font-heading text-3xl font-semibold text-amber-300 md:text-4xl">{t.title}</h1>
          <p className="mt-2 text-sm text-amber-100/80 md:text-base">{t.subtitle}</p>
        </header>

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {PROMOTIONS.map((item) => {
            const title = locale === "en" ? item.titleEn : item.title;
            const summary = locale === "en" ? item.summaryEn : item.summary;
            return (
              <article
                key={item.id}
                className="rounded-2xl border border-amber-500/25 bg-black/45 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.3)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full border border-amber-400/30 bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-200">
                    {getBadgeLabel(locale, item.badge)}
                  </span>
                  <span className="text-xs text-amber-100/60">{item.dateLabel}</span>
                </div>
                <h2 className="mt-4 text-lg font-semibold text-amber-100">{title}</h2>
                <p className="mt-2 text-sm text-amber-100/75">{summary}</p>
                <Link
                  href={buildPromotionsHref(locale, item.href)}
                  className="mt-4 inline-flex rounded-lg border border-amber-500/35 bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-100 hover:bg-amber-500/25"
                >
                  {t.readMore}
                </Link>
              </article>
            );
          })}
        </section>

        <div className="mt-6">
          <CouponValidator locale={locale} />
        </div>
      </section>
    </main>
  );
}
