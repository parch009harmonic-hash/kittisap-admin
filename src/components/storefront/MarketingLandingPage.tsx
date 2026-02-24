import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { listPublicProducts } from "../../../lib/db/publicProducts";
import type { AppLocale } from "../../../lib/i18n/locale";
import { MarketingTopNav } from "./MarketingTopNav";

type MarketingLandingPageProps = {
  locale: AppLocale;
  useLocalePrefix?: boolean;
  showOuterFrame?: boolean;
  showTopNav?: boolean;
};

function withLocale(locale: AppLocale, path: string, useLocalePrefix: boolean) {
  if (!useLocalePrefix && locale === "th") {
    return path;
  }
  return `/${locale}${path}`;
}

function copy(locale: AppLocale) {
  if (locale === "th") {
    return {
      brand: "Kittisap",
      nav: {
        home: "หน้าแรก",
        products: "สินค้าของเรา",
        pricing: "ตารางราคา",
        promotions: "กิจกรรม + ส่วนลด/คูปอง",
        contact: "ติดต่อเรา",
        auth: "สมัครสมาชิก/ล็อกอินลูกค้า",
      },
      cta: {
        auth: "เข้าสู่ระบบลูกค้า",
        products: "ดูสินค้า",
      },
      hero: {
        eyebrow: "KITTISAP CUSTOMER SITE",
        title: "แพลตฟอร์มลูกค้า เชื่อมสินค้าและคำสั่งซื้อชุดเดียวกับระบบแอดมิน",
        desc: "ลูกค้าดูสินค้า ตารางราคา โปรโมชัน สั่งซื้อ และชำระเงินผ่าน PromptPay ได้ครบในระบบเดียว",
      },
      sections: {
        updates: "สินค้าแนะนำ",
        updatesSub: "รายการสินค้าจริงจากฐานข้อมูลเดียวกับ /admin/products",
        news: "กิจกรรมและข่าวสาร",
        newsSub: "อัปเดตโปรโมชันและคูปองล่าสุด",
      },
      tags: {
        latest: "Live Products",
        updates: "Promotions",
      },
      card: {
        model: "สินค้า",
        meta: "ราคา • สต็อก",
        article: "หัวข้อข่าว / กิจกรรม",
        articleMeta: "วันที่ • หมวดหมู่",
      },
      footer: {
        title: "Kittisap",
        desc1: "เว็บไซต์ลูกค้าเชื่อมข้อมูลร่วมกับระบบแอดมินและ Supabase",
        desc2: "รองรับการสั่งซื้อ ชำระเงิน และตรวจสอบคำสั่งซื้ออย่างครบวงจร",
        quick: "Quick Links",
        contact: "Contact",
        admin: "เข้าสู่ระบบแอดมิน",
        dev: "Developer Console",
      },
    };
  }

  return {
    brand: "Kittisap",
    nav: {
      home: "Home",
      products: "Products",
      pricing: "Pricing",
      promotions: "Promotions + Coupons",
      contact: "Contact",
      auth: "Register/Login",
    },
    cta: {
      auth: "Customer Login",
      products: "Browse Products",
    },
    hero: {
      eyebrow: "KITTISAP CUSTOMER SITE",
      title: "Customer platform connected to the same catalog and orders as admin",
      desc: "Customers can browse products, pricing, promotions, and complete PromptPay checkout in one flow.",
    },
    sections: {
      updates: "Featured Products",
      updatesSub: "Live products from the same dataset as /admin/products",
      news: "Activities and Updates",
      newsSub: "Latest promotions and coupon updates",
    },
    tags: {
      latest: "Live Products",
      updates: "Promotions",
    },
    card: {
      model: "Product",
      meta: "Price • Stock",
      article: "News / Activity Headline",
      articleMeta: "Date • Category",
    },
    footer: {
      title: "Kittisap",
      desc1: "Customer site connected with admin and Supabase.",
      desc2: "Unified flow for browsing, ordering, payment and order tracking.",
      quick: "Quick Links",
      contact: "Contact",
      admin: "Admin Login",
      dev: "Developer Console",
    },
  };
}

function Frame({ children, showOuterFrame }: { children: ReactNode; showOuterFrame: boolean }) {
  if (!showOuterFrame) {
    return <>{children}</>;
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(1200px_600px_at_20%_-10%,rgba(245,158,11,0.12),transparent_60%),radial-gradient(900px_500px_at_100%_10%,rgba(59,130,246,0.10),transparent_60%),#0b0f16] text-slate-200">
      {children}
    </main>
  );
}

function PlaceholderCard({ title, meta }: { title: string; meta: string }) {
  return (
    <a href="#" className="tap-ripple app-press overflow-hidden rounded-2xl border border-slate-400/20 bg-gradient-to-b from-slate-900/90 to-slate-950/80 shadow-[0_14px_50px_rgba(0,0,0,0.28)] transition hover:-translate-y-0.5 hover:border-amber-400/40">
      <div className="aspect-[16/10] bg-[linear-gradient(135deg,rgba(245,158,11,0.22),rgba(59,130,246,0.12)),radial-gradient(800px_300px_at_20%_20%,rgba(255,255,255,0.08),transparent_45%)]" />
      <div className="p-4">
        <p className="text-sm font-extrabold tracking-tight text-slate-100">{title}</p>
        <p className="mt-1 text-xs text-slate-300/70">{meta}</p>
      </div>
    </a>
  );
}

type ShowroomItem = {
  id: string;
  slug: string;
  title: string;
  price: number;
  stock: number;
  coverUrl: string | null;
};

async function loadShowroomItems(locale: AppLocale): Promise<ShowroomItem[]> {
  try {
    const source = await listPublicProducts({ page: 1, pageSize: 4 });
    return source.items.map((item) => ({
      id: item.id,
      slug: item.slug,
      title: locale === "en" ? item.title_en || item.title_th : item.title_th,
      price: item.price,
      stock: item.stock,
      coverUrl: item.cover_url,
    }));
  } catch {
    return [];
  }
}

function ProductCard({
  locale,
  useLocalePrefix,
  item,
}: {
  locale: AppLocale;
  useLocalePrefix: boolean;
  item: ShowroomItem;
}) {
  const detailPath = withLocale(locale, `/products/${item.slug}`, useLocalePrefix);

  return (
    <Link href={detailPath} className="tap-ripple app-press overflow-hidden rounded-2xl border border-slate-400/20 bg-gradient-to-b from-slate-900/90 to-slate-950/80 shadow-[0_14px_50px_rgba(0,0,0,0.28)] transition hover:-translate-y-0.5 hover:border-amber-400/40">
      {item.coverUrl ? (
        <div className="relative aspect-[16/10] w-full overflow-hidden">
          <Image src={item.coverUrl} alt={item.title} fill sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw" className="object-cover" loading="lazy" />
        </div>
      ) : (
        <div className="aspect-[16/10] bg-[linear-gradient(135deg,rgba(245,158,11,0.22),rgba(59,130,246,0.12)),radial-gradient(800px_300px_at_20%_20%,rgba(255,255,255,0.08),transparent_45%)]" />
      )}
      <div className="p-4">
        <p className="text-sm font-extrabold tracking-tight text-slate-100">{item.title}</p>
        <p className="mt-1 text-xs text-slate-300/70">THB {item.price.toLocaleString()} • Stock {item.stock}</p>
      </div>
    </Link>
  );
}

export async function MarketingLandingPage({
  locale,
  useLocalePrefix = false,
  showOuterFrame = true,
  showTopNav = true,
}: MarketingLandingPageProps) {
  const t = copy(locale);
  const showroomItems = await loadShowroomItems(locale);
  const homePath = withLocale(locale, "/", useLocalePrefix);
  const productsPath = withLocale(locale, "/products", useLocalePrefix);
  const pricingPath = withLocale(locale, "/pricing", useLocalePrefix);
  const promotionsPath = withLocale(locale, "/promotions", useLocalePrefix);
  const contactPath = withLocale(locale, "/contact", useLocalePrefix);

  return (
    <Frame showOuterFrame={showOuterFrame}>
      {showTopNav ? (
        <MarketingTopNav locale={locale} useLocalePrefix={useLocalePrefix} brand={t.brand} nav={t.nav} cta={t.cta} />
      ) : null}

      <section id="showroom" className="mx-auto w-full max-w-7xl px-4 py-7">
        <article className="relative overflow-hidden rounded-[28px] border border-slate-400/20 bg-gradient-to-br from-slate-900/95 to-slate-950/90 shadow-[0_18px_60px_rgba(0,0,0,0.45)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(closest-side,rgba(245,158,11,0.26),transparent_55%),radial-gradient(closest-side,rgba(59,130,246,0.16),transparent_62%),linear-gradient(120deg,transparent_35%,rgba(255,255,255,0.08)_45%,transparent_55%)] opacity-70" />

          <div className="relative grid gap-5 p-6 md:grid-cols-[1.15fr_0.85fr] md:p-8">
            <div>
              <p className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-amber-200">{t.hero.eyebrow}</p>
              <h1 className="mt-2 text-3xl font-black leading-tight tracking-tight text-slate-50 md:text-5xl">{t.hero.title}</h1>
              <p className="mt-3 max-w-3xl text-sm text-slate-200/80 md:text-base">{t.hero.desc}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link href={productsPath} className="inline-flex rounded-full border border-amber-400/40 bg-amber-500/15 px-4 py-2 text-xs font-extrabold text-amber-200">{t.nav.products}</Link>
                <Link href={promotionsPath} className="inline-flex rounded-full border border-slate-400/30 bg-white/5 px-4 py-2 text-xs font-extrabold text-slate-100">{t.nav.promotions}</Link>
              </div>
            </div>

            <aside className="rounded-2xl border border-white/15 bg-white/5 p-3">
              <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-white/15 bg-[linear-gradient(135deg,rgba(245,158,11,0.22),rgba(59,130,246,0.12)),repeating-linear-gradient(135deg,rgba(255,255,255,0.06)_0_10px,transparent_10px_20px)]">
                {showroomItems[0]?.coverUrl ? (
                  <Image
                    src={showroomItems[0].coverUrl}
                    alt={showroomItems[0].title}
                    fill
                    sizes="(max-width: 768px) 100vw, 40vw"
                    priority
                    fetchPriority="high"
                    className="object-cover"
                  />
                ) : null}
              </div>
              <p className="mt-2 text-xs text-slate-200/70">Slider image placeholder</p>
            </aside>
          </div>
        </article>
      </section>

      <section id="updates" className="mx-auto w-full max-w-7xl px-4 py-12">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-100 md:text-3xl">{t.sections.updates}</h2>
            <p className="mt-1 text-sm text-slate-300/70">{t.sections.updatesSub}</p>
          </div>
          <span className="rounded-full border border-slate-400/20 bg-white/5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-200/85">{t.tags.latest}</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {showroomItems.length > 0
            ? showroomItems.map((item) => (
              <ProductCard key={item.id} locale={locale} useLocalePrefix={useLocalePrefix} item={item} />
            ))
            : [1, 2, 3, 4].map((item) => (
              <PlaceholderCard key={item} title={t.card.model} meta={t.card.meta} />
            ))}
        </div>
      </section>

      <section id="news" className="mx-auto w-full max-w-7xl px-4 py-12">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-100 md:text-3xl">{t.sections.news}</h2>
            <p className="mt-1 text-sm text-slate-300/70">{t.sections.newsSub}</p>
          </div>
          <span className="rounded-full border border-slate-400/20 bg-white/5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-200/85">{t.tags.updates}</span>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <PlaceholderCard key={item} title={t.card.article} meta={t.card.articleMeta} />
          ))}
        </div>
      </section>

      <footer id="contact" className="border-t border-slate-400/20 py-10 text-slate-300/85">
        <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 md:grid-cols-[1.2fr_1fr_1fr]">
          <div>
            <p className="text-base font-black text-slate-100">{t.footer.title}</p>
            <p className="mt-2 text-sm text-slate-300/75">{t.footer.desc1}</p>
            <p className="text-sm text-slate-300/75">{t.footer.desc2}</p>
          </div>

          <div>
            <p className="text-base font-black text-slate-100">{t.footer.quick}</p>
            <div className="mt-2 space-y-1 text-sm">
              <Link href={homePath} className="block hover:text-amber-200">{t.nav.home}</Link>
              <Link href={productsPath} className="block hover:text-amber-200">{t.nav.products}</Link>
              <Link href={pricingPath} className="block hover:text-amber-200">{t.nav.pricing}</Link>
              <Link href={promotionsPath} className="block hover:text-amber-200">{t.nav.promotions}</Link>
              <Link href={contactPath} className="block hover:text-amber-200">{t.nav.contact}</Link>
            </div>
          </div>

          <div>
            <p className="text-base font-black text-slate-100">{t.footer.contact}</p>
            <div className="mt-2 space-y-1 text-sm">
              <a href="tel:+66843374982" className="block hover:text-amber-200">Call</a>
              <a href="https://line.me" className="block hover:text-amber-200">LINE</a>
              <a href="https://facebook.com" className="block hover:text-amber-200">Facebook</a>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-5 w-full max-w-7xl border-t border-slate-400/20 px-4 pt-4 text-xs text-slate-400">
          © {new Date().getFullYear()} {t.footer.title}
          <span className="mx-2">|</span>
          <Link href="/login" className="hover:text-amber-200">{t.footer.admin}</Link>
          <span className="mx-2">|</span>
          <Link href="/admin/developer" className="hover:text-amber-200">{t.footer.dev}</Link>
        </div>
      </footer>
    </Frame>
  );
}

