import { CONTACT_INFO } from "../../../data/contact";
import type { AppLocale } from "../../../lib/i18n/locale";

type ContactPageProps = {
  locale: AppLocale;
};

function text(locale: AppLocale) {
  if (locale === "th") {
    return {
      title: "ติดต่อเรา",
      subtitle: "สอบถามข้อมูลสินค้า นัดหมายเข้าชม และติดต่อทีมงานได้ทุกช่องทาง",
      phone: "โทรศัพท์",
      line: "LINE",
      map: "แผนที่",
      hours: "เวลาทำการ",
      openMap: "เปิดแผนที่",
      callNow: "โทรทันที",
      openLine: "เปิด LINE",
      address: "ที่อยู่",
    };
  }

  return {
    title: "Contact Us",
    subtitle: "Get product advice, schedule visits, and reach our team through all channels.",
    phone: "Phone",
    line: "LINE",
    map: "Map",
    hours: "Business Hours",
    openMap: "Open Map",
    callNow: "Call Now",
    openLine: "Open LINE",
    address: "Address",
  };
}

function formatPhoneHref(phone: string) {
  const normalized = phone.replace(/[^0-9+]/g, "");
  return `tel:${normalized}`;
}

export function ContactPage({ locale }: ContactPageProps) {
  const t = text(locale);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_#5c3f00_0%,_#1a1200_30%,_#090909_68%)] text-amber-50">
      <section className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 md:py-12">
        <header className="rounded-3xl border border-amber-500/35 bg-black/55 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur">
          <h1 className="font-heading text-3xl font-semibold text-amber-300 md:text-4xl">{t.title}</h1>
          <p className="mt-2 text-sm text-amber-100/80 md:text-base">{t.subtitle}</p>
        </header>

        <section className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_1fr]">
          <article className="rounded-2xl border border-amber-500/30 bg-black/45 p-5">
            <dl className="grid gap-4 text-sm">
              <div className="rounded-xl border border-amber-500/20 bg-black/35 p-4">
                <dt className="text-amber-200/80">{t.phone}</dt>
                <dd className="mt-1 text-lg font-semibold text-amber-100">{CONTACT_INFO.telephone}</dd>
              </div>

              <div className="rounded-xl border border-amber-500/20 bg-black/35 p-4">
                <dt className="text-amber-200/80">{t.line}</dt>
                <dd className="mt-1 text-lg font-semibold text-amber-100">{CONTACT_INFO.lineId}</dd>
              </div>

              <div className="rounded-xl border border-amber-500/20 bg-black/35 p-4">
                <dt className="text-amber-200/80">{t.address}</dt>
                <dd className="mt-1 text-base font-medium text-amber-100">
                  {locale === "en" ? CONTACT_INFO.addressEn : CONTACT_INFO.addressTh}
                </dd>
              </div>
            </dl>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <a
                href={formatPhoneHref(CONTACT_INFO.telephone)}
                className="inline-flex items-center justify-center rounded-xl border border-amber-400/60 bg-amber-400/20 px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-300/30"
              >
                {t.callNow}
              </a>
              <a
                href={CONTACT_INFO.mapOpenUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-xl border border-amber-500/35 bg-black/45 px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-black/60"
              >
                {t.openMap}
              </a>
              <a
                href={CONTACT_INFO.lineUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-xl border border-amber-500/35 bg-black/45 px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-black/60"
              >
                {t.openLine}
              </a>
            </div>
          </article>

          <article className="rounded-2xl border border-amber-500/25 bg-black/45 p-5">
            <h2 className="text-lg font-semibold text-amber-300">{t.hours}</h2>
            <ul className="mt-3 space-y-2 text-sm text-amber-100/85">
              {CONTACT_INFO.hours.map((row) => (
                <li key={row.dayEn} className="flex items-center justify-between gap-3 rounded-lg border border-amber-500/15 bg-black/30 px-3 py-2">
                  <span>{locale === "en" ? row.dayEn : row.dayTh}</span>
                  <span className="font-semibold text-amber-200">
                    {row.open} - {row.close}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-4 overflow-hidden rounded-xl border border-amber-500/20">
              <iframe
                src={CONTACT_INFO.mapEmbedUrl}
                title={t.map}
                className="h-64 w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}
