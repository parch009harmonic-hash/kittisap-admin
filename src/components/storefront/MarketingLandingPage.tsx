import Link from "next/link";
import type { ReactNode } from "react";

import type { AppLocale } from "../../../lib/i18n/locale";

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

function text(locale: AppLocale) {
  if (locale === "th") {
    return {
      nav: {
        about: "เกี่ยวกับเรา",
        services: "บริการ",
        why: "ทำไมต้องเรา",
        faq: "คำถามที่พบบ่อย",
        contact: "ติดต่อ",
        quote: "ขอใบเสนอราคา",
      },
      hero: {
        title: "บริการดูแลรถและบริการเสริมแบบพรีเมียมถึงที่",
        desc: "เข้าชมเว็บได้โดยไม่ต้องล็อกอิน และล็อกอินเฉพาะตอนสั่งซื้อสินค้า/บริการเท่านั้น",
        primary: "ดูสินค้า",
        secondary: "อ่านบริการ",
      },
      about: {
        title: "เกี่ยวกับเรา",
        lead: "ไม่ต้องขับรถออกไป เพราะบริการคุณภาพมาหาคุณแทน",
        desc: "เราใช้มาตรฐานงานระดับมืออาชีพ และระบบตรวจสอบงานทุกขั้นตอน เพื่อให้มั่นใจในความสะอาด ความปลอดภัย และความโปร่งใส",
      },
      services: {
        title: "บริการของเรา",
        cards: ["ดูแลรถยนต์", "ทำความสะอาดภายใน", "ดูแลแอร์และระบบ"],
      },
      why: {
        title: "ทำไมต้องเลือกเรา",
        items: [
          "บริการถึงบ้าน นัดง่าย",
          "มาตรฐานพรีเมียม",
          "ทีมงานมีประสบการณ์",
          "ตรวจสอบงานได้โปร่งใส",
          "รองรับหลายช่องทางติดต่อ",
          "พัฒนาบริการต่อเนื่อง",
        ],
      },
      reviews: {
        title: "เสียงจากลูกค้า",
      },
      news: {
        title: "บทความและข่าวสาร",
      },
      faq: {
        title: "คำถามที่พบบ่อย",
      },
      booking: {
        title: "จองคิวบริการ",
        name: "ชื่อ",
        phone: "เบอร์โทร",
        email: "อีเมล",
        service: "บริการที่ต้องการ",
        details: "รายละเอียด",
        submit: "ส่งข้อมูล",
      },
      footer: {
        admin: "เข้าสู่ระบบแอดมิน",
        dev: "Developer Console",
      },
    };
  }

  return {
    nav: {
      about: "About",
      services: "Services",
      why: "Why Us",
      faq: "FAQ",
      contact: "Contact",
      quote: "Get Quote",
    },
    hero: {
      title: "Premium vehicle care and home services at your doorstep",
      desc: "Public visitors can browse without login. Login is required only when placing order.",
      primary: "Browse products",
      secondary: "Our services",
    },
    about: {
      title: "About Us",
      lead: "No need to drive to service center. Quality care comes to you.",
      desc: "We operate with professional standards and transparent workflow to ensure safety and trusted quality.",
    },
    services: {
      title: "Our Services",
      cards: ["Car Maintenance", "Cleaning Services", "Air Cleaning Service"],
    },
    why: {
      title: "Why Choose Us",
      items: [
        "Doorstep service, easy booking",
        "Premium standard",
        "Experienced team",
        "Auditable transparency",
        "Multi-channel convenience",
        "Continuous improvement",
      ],
    },
    reviews: {
      title: "Customer Reviews",
    },
    news: {
      title: "Articles & News",
    },
    faq: {
      title: "Frequently Asked Questions",
    },
    booking: {
      title: "Book a Service Queue",
      name: "Name",
      phone: "Phone",
      email: "Email",
      service: "Requested Service",
      details: "Details",
      submit: "Send Message",
    },
    footer: {
      admin: "Admin Login",
      dev: "Developer Console",
    },
  };
}

function Frame({ children, showOuterFrame }: { children: ReactNode; showOuterFrame: boolean }) {
  if (!showOuterFrame) return <>{children}</>;
  return <main className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">{children}</main>;
}

export function MarketingLandingPage({
  locale,
  useLocalePrefix = false,
  showOuterFrame = true,
  showTopNav = true,
}: MarketingLandingPageProps) {
  const t = text(locale);

  return (
    <Frame showOuterFrame={showOuterFrame}>
      {showTopNav ? (
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-[var(--bg)]/90 backdrop-blur">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3">
            <Link href={withLocale(locale, "/", useLocalePrefix)} className="flex items-center gap-2 font-semibold">
              <span className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-700 to-blue-900" />
              <span>Clean Kittisap</span>
            </Link>
            <nav className="hidden items-center gap-2 text-sm font-semibold text-slate-700 md:flex">
              <a href="#about" className="rounded-lg px-3 py-2 hover:bg-slate-100">{t.nav.about}</a>
              <a href="#services" className="rounded-lg px-3 py-2 hover:bg-slate-100">{t.nav.services}</a>
              <a href="#why" className="rounded-lg px-3 py-2 hover:bg-slate-100">{t.nav.why}</a>
              <a href="#faq" className="rounded-lg px-3 py-2 hover:bg-slate-100">{t.nav.faq}</a>
              <a href="#contact" className="rounded-lg px-3 py-2 hover:bg-slate-100">{t.nav.contact}</a>
            </nav>
            <a href="#contact" className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold shadow-sm">
              {t.nav.quote}
            </a>
          </div>
        </header>
      ) : null}

      <section className="mx-auto w-full max-w-7xl px-4 py-8 md:py-12">
        <article className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 to-slate-700 text-white shadow-[0_20px_45px_-30px_rgba(15,23,42,0.45)]">
          <div className="grid gap-6 p-6 md:grid-cols-[1.1fr_0.9fr] md:p-8">
            <div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-xs font-semibold">On-site Service</span>
                <span className="rounded-full border border-blue-200/40 bg-blue-500/20 px-4 py-2 text-xs font-semibold">Web + App + Admin</span>
              </div>
              <h1 className="mt-4 font-heading text-3xl font-semibold leading-tight md:text-5xl">{t.hero.title}</h1>
              <p className="mt-3 max-w-2xl text-sm text-white/85 md:text-base">{t.hero.desc}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link href={withLocale(locale, "/products", useLocalePrefix)} className="rounded-full bg-white px-5 py-2.5 text-xs font-extrabold uppercase tracking-[0.16em] text-slate-900">
                  {t.hero.primary}
                </Link>
                <a href="#services" className="rounded-full border border-white/40 px-5 py-2.5 text-xs font-extrabold uppercase tracking-[0.16em] text-white">
                  {t.hero.secondary}
                </a>
              </div>
            </div>

            <aside className="rounded-2xl border border-white/20 bg-white/10 p-4">
              <div className="space-y-3 text-sm">
                <div className="border-b border-white/20 pb-3">
                  <p className="font-semibold">Auditable Security</p>
                  <p className="text-white/80">Trackable process for each operation.</p>
                </div>
                <div className="border-b border-white/20 pb-3">
                  <p className="font-semibold">Experienced Team</p>
                  <p className="text-white/80">Professional standard and service discipline.</p>
                </div>
                <div>
                  <p className="font-semibold">One-stop Service</p>
                  <p className="text-white/80">Car care, cleaning, and related services in one place.</p>
                </div>
              </div>
            </aside>
          </div>
        </article>
      </section>

      <section id="about" className="mx-auto w-full max-w-7xl px-4 py-10">
        <h2 className="font-heading text-2xl font-semibold md:text-3xl">{t.about.title}</h2>
        <p className="mt-3 text-lg font-medium text-slate-800">{t.about.lead}</p>
        <p className="mt-2 max-w-4xl text-sm text-slate-600 md:text-base">{t.about.desc}</p>
      </section>

      <section id="services" className="mx-auto w-full max-w-7xl px-4 py-10">
        <h2 className="font-heading text-2xl font-semibold md:text-3xl">{t.services.title}</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {t.services.cards.map((item) => (
            <article key={item} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.45)]">
              <div className="h-40 rounded-xl border border-slate-200 bg-slate-100" />
              <h3 className="mt-4 text-lg font-semibold">{item}</h3>
              <p className="mt-1 text-sm text-slate-600">Premium quality service with convenient scheduling.</p>
            </article>
          ))}
        </div>
      </section>

      <section id="why" className="mx-auto w-full max-w-7xl px-4 py-10">
        <h2 className="font-heading text-2xl font-semibold md:text-3xl">{t.why.title}</h2>
        <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {t.why.items.map((item) => (
            <article key={item} className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.45)]">
              <p className="text-sm font-semibold text-slate-800">{item}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-10">
        <h2 className="font-heading text-2xl font-semibold md:text-3xl">{t.reviews.title}</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <article key={item} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.45)]">
              <p className="text-sm text-slate-700">บริการตรงเวลา งานละเอียด ใช้งานสะดวกมาก</p>
              <p className="mt-3 text-xs font-semibold text-slate-500">Customer #{item}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-10">
        <h2 className="font-heading text-2xl font-semibold md:text-3xl">{t.news.title}</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {["5 เคล็ดลับดูแลรถ", "ทำไมต้องล้างแอร์", "เทคโนโลยีตรวจสอบงาน"].map((item) => (
            <article key={item} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.45)]">
              <h3 className="text-base font-semibold text-slate-900">{item}</h3>
              <a href="#" className="mt-3 inline-block text-sm font-semibold text-blue-700">Read More</a>
            </article>
          ))}
        </div>
      </section>

      <section id="faq" className="mx-auto w-full max-w-7xl px-4 py-10">
        <h2 className="font-heading text-2xl font-semibold md:text-3xl">{t.faq.title}</h2>
        <div className="mt-6 space-y-3">
          {[
            locale === "th" ? "ให้บริการพื้นที่ไหนบ้าง?" : "Which service areas are available?",
            locale === "th" ? "มีค่าเดินทางเพิ่มไหม?" : "Is there an extra travel fee?",
            locale === "th" ? "เปิดให้บริการช่วงเวลาใด?" : "What are your opening hours?",
          ].map((item) => (
            <details key={item} className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.45)]">
              <summary className="cursor-pointer font-semibold">{item}</summary>
              <p className="mt-2 text-sm text-slate-600">{locale === "th" ? "สามารถติดต่อทีมเพื่อยืนยันข้อมูลล่าสุดได้ทันที" : "Please contact our team for the latest confirmation."}</p>
            </details>
          ))}
        </div>
      </section>

      <section id="contact" className="mx-auto w-full max-w-7xl px-4 py-10">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.45)] md:p-6">
          <h2 className="font-heading text-2xl font-semibold md:text-3xl">{t.booking.title}</h2>
          <form className="mt-5 grid gap-3 md:grid-cols-2" action="#">
            <input className="rounded-xl border border-slate-300 px-4 py-3" placeholder={t.booking.name} required />
            <input className="rounded-xl border border-slate-300 px-4 py-3" placeholder={t.booking.phone} required />
            <input className="rounded-xl border border-slate-300 px-4 py-3" placeholder={t.booking.email} type="email" required />
            <input className="rounded-xl border border-slate-300 px-4 py-3" placeholder={t.booking.service} required />
            <textarea className="min-h-28 rounded-xl border border-slate-300 px-4 py-3 md:col-span-2" placeholder={t.booking.details} required />
            <div className="md:col-span-2 md:text-right">
              <button type="submit" className="rounded-full bg-slate-900 px-6 py-3 text-xs font-extrabold uppercase tracking-[0.16em] text-white">
                {t.booking.submit}
              </button>
            </div>
          </form>
        </article>
      </section>

      <footer className="mx-auto w-full max-w-7xl px-4 py-10 text-sm text-slate-600">
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-6">
          <div>© {new Date().getFullYear()} Clean Kittisap. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hover:text-slate-900">{t.footer.admin}</Link>
            <Link href="/admin/developer" className="hover:text-slate-900">{t.footer.dev}</Link>
          </div>
        </div>
      </footer>
    </Frame>
  );
}
