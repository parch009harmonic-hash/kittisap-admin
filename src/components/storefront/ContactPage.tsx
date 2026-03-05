import { getWebStorefrontSettings } from "../../../lib/db/web-settings";
import type { AppLocale } from "../../../lib/i18n/locale";
import { StorefrontTopMenu } from "./StorefrontTopMenu";

type ContactPageProps = {
  locale: AppLocale;
  useLocalePrefix?: boolean;
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

  if (locale === "lo") {
    return {
      title: "ຕິດຕໍ່ພວກເຮົາ",
      subtitle: "ສອບຖາມຂໍ້ມູນສິນຄ້າ ນັດໝາຍເຂົ້າຊົມ ແລະຕິດຕໍ່ທີມງານໄດ້ທຸກຊ່ອງທາງ",
      phone: "ໂທລະສັບ",
      line: "LINE",
      map: "ແຜນທີ່",
      hours: "ເວລາເຮັດການ",
      openMap: "ເປີດແຜນທີ່",
      callNow: "ໂທທັນທີ",
      openLine: "ເປີດ LINE",
      address: "ທີ່ຢູ່",
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

function hasThaiChars(value: string) {
  return /[\u0E00-\u0E7F]/.test(value);
}

function localizeSettingText(raw: string | null | undefined, locale: AppLocale, fallback: string) {
  const value = String(raw ?? "").trim();
  if (!value) return fallback;
  if (locale === "th") return value;
  return hasThaiChars(value) ? fallback : value;
}

function formatPhoneHref(phone: string) {
  const normalized = phone.replace(/[^0-9+]/g, "");
  return `tel:${normalized}`;
}

function extractIframeSrc(raw: string) {
  const match = raw.match(/src=["']([^"']+)["']/i);
  return match?.[1]?.trim() ?? "";
}

function decodeMapSegment(segment: string) {
  return decodeURIComponent(segment).replace(/\+/g, " ").trim();
}

function extractMapQuery(url: URL) {
  const q = url.searchParams.get("q") || url.searchParams.get("query");
  if (q?.trim()) {
    return q.trim();
  }

  const placeMatch = url.pathname.match(/\/place\/([^/]+)/i);
  if (placeMatch?.[1]) {
    return decodeMapSegment(placeMatch[1]);
  }

  const coordsMatch = url.pathname.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (coordsMatch?.[1] && coordsMatch?.[2]) {
    return `${coordsMatch[1]},${coordsMatch[2]}`;
  }

  return "";
}

function toEmbeddedMapUrl(queryOrUrl: string, fallbackQuery: string) {
  const trimmed = queryOrUrl.trim();
  if (!trimmed) {
    return `https://www.google.com/maps?q=${encodeURIComponent(fallbackQuery)}&output=embed`;
  }

  if (trimmed.includes("output=embed")) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("Invalid map protocol");
    }
    const query = extractMapQuery(parsed) || trimmed;
    return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
  } catch {
    return `https://www.google.com/maps?q=${encodeURIComponent(trimmed)}&output=embed`;
  }
}

function toOpenMapUrl(rawOpen: string, rawEmbed: string, fallbackQuery: string) {
  const fromOpen = rawOpen.trim();
  if (fromOpen) {
    try {
      const parsed = new URL(fromOpen);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return parsed.toString();
      }
    } catch {
      // Ignore invalid URL and use fallback below.
    }
  }

  const embeddedSource = extractIframeSrc(rawEmbed) || rawEmbed;
  const embeddedAsQuery = toEmbeddedMapUrl(embeddedSource, fallbackQuery);
  const parsed = new URL(embeddedAsQuery);
  const query = parsed.searchParams.get("q") || fallbackQuery;
  return `https://maps.google.com/?q=${encodeURIComponent(query)}`;
}

export async function ContactPage({ locale, useLocalePrefix = false }: ContactPageProps) {
  const t = text(locale);
  const storefrontSettings = await getWebStorefrontSettings();
  const localizedContactTitle = localizeSettingText(storefrontSettings.contactTitle, locale, t.title);
  const localizedContactSubtitle = localizeSettingText(storefrontSettings.contactSubtitle, locale, t.subtitle);
  const localizedCallNow = localizeSettingText(storefrontSettings.contactCallButtonLabel, locale, t.callNow);
  const localizedOpenMap = localizeSettingText(storefrontSettings.contactMapButtonLabel, locale, t.openMap);
  const localizedOpenLine = localizeSettingText(storefrontSettings.contactLineButtonLabel, locale, t.openLine);
  const contactPhone = storefrontSettings.contactPhone || storefrontSettings.callPhone;
  const lineId = storefrontSettings.contactLineId;
  const lineUrl = storefrontSettings.lineUrl || "https://line.me";
  const addressRaw =
    locale === "en"
      ? storefrontSettings.contactAddressEn || storefrontSettings.contactAddressTh
      : locale === "lo"
        ? storefrontSettings.contactAddressEn || storefrontSettings.contactAddressTh
        : storefrontSettings.contactAddressTh || storefrontSettings.contactAddressEn;
  const addressFallback =
    locale === "en"
      ? "Bangkok, Thailand"
      : locale === "lo"
        ? "ບາງກອກ, ປະເທດໄທ"
        : "กรุงเทพมหานคร ประเทศไทย";
  const address = localizeSettingText(addressRaw, locale, addressFallback);
  const fallbackMapQuery = address?.trim() || "Bangkok";
  const mapEmbedUrl = toEmbeddedMapUrl(
    extractIframeSrc(storefrontSettings.contactMapEmbedUrl) || storefrontSettings.contactMapEmbedUrl,
    fallbackMapQuery,
  );
  const mapOpenUrl = toOpenMapUrl(
    storefrontSettings.contactMapOpenUrl,
    storefrontSettings.contactMapEmbedUrl,
    fallbackMapQuery,
  );
  const hourLabelFallbacks =
    locale === "en"
      ? ["Mon - Fri", "Saturday", "Sunday"]
      : locale === "lo"
        ? ["ຈັນ - ສຸກ", "ເສົາ", "ອາທິດ"]
        : [
            storefrontSettings.contactHoursWeekdayLabel,
            storefrontSettings.contactHoursSaturdayLabel,
            storefrontSettings.contactHoursSundayLabel,
          ];
  const businessHours = [
    {
      day: localizeSettingText(storefrontSettings.contactHoursWeekdayLabel, locale, hourLabelFallbacks[0]),
      time: storefrontSettings.contactHoursWeekdayTime,
    },
    {
      day: localizeSettingText(storefrontSettings.contactHoursSaturdayLabel, locale, hourLabelFallbacks[1]),
      time: storefrontSettings.contactHoursSaturdayTime,
    },
    {
      day: localizeSettingText(storefrontSettings.contactHoursSundayLabel, locale, hourLabelFallbacks[2]),
      time: storefrontSettings.contactHoursSundayTime,
    },
  ];

  return (
    <>
      {!useLocalePrefix ? <StorefrontTopMenu locale={locale} useLocalePrefix={useLocalePrefix} /> : null}
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_#5c3f00_0%,_#1a1200_30%,_#090909_68%)] text-amber-50">
        <section className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 md:py-12">
          <header className="rounded-3xl border border-amber-500/35 bg-black/55 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur">
            <h1 className="font-heading text-3xl font-semibold text-amber-300 md:text-4xl">{localizedContactTitle}</h1>
            <p className="mt-2 text-sm text-amber-100/80 md:text-base">{localizedContactSubtitle}</p>
          </header>

          <section className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_1fr]">
            <article className="rounded-2xl border border-amber-500/30 bg-black/45 p-5">
              <dl className="grid gap-4 text-sm">
                <div className="rounded-xl border border-amber-500/20 bg-black/35 p-4">
                  <dt className="text-amber-200/80">{t.phone}</dt>
                  <dd className="mt-1 text-lg font-semibold text-amber-100">{contactPhone}</dd>
                </div>

                <div className="rounded-xl border border-amber-500/20 bg-black/35 p-4">
                  <dt className="text-amber-200/80">{t.line}</dt>
                  <dd className="mt-1 text-lg font-semibold text-amber-100">{lineId}</dd>
                </div>

                <div className="rounded-xl border border-amber-500/20 bg-black/35 p-4">
                  <dt className="text-amber-200/80">{t.address}</dt>
                  <dd className="mt-1 text-base font-medium text-amber-100">{address}</dd>
                </div>
              </dl>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <a
                  href={formatPhoneHref(contactPhone)}
                  className="inline-flex items-center justify-center rounded-xl border border-amber-400/60 bg-amber-400/20 px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-300/30"
                >
                  {localizedCallNow}
                </a>
                <a
                  href={mapOpenUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-xl border border-amber-500/35 bg-black/45 px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-black/60"
                >
                  {localizedOpenMap}
                </a>
                <a
                  href={lineUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-xl border border-amber-500/35 bg-black/45 px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-black/60"
                >
                  {localizedOpenLine}
                </a>
              </div>
            </article>

            <article className="rounded-2xl border border-amber-500/25 bg-black/45 p-5">
              <h2 className="text-lg font-semibold text-amber-300">{t.hours}</h2>
              <ul className="mt-3 space-y-2 text-sm text-amber-100/85">
                {businessHours.map((row) => (
                  <li key={`${row.day}-${row.time}`} className="flex items-center justify-between gap-3 rounded-lg border border-amber-500/15 bg-black/30 px-3 py-2">
                    <span>{row.day}</span>
                    <span className="font-semibold text-amber-200">{row.time}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 overflow-hidden rounded-xl border border-amber-500/20">
                <iframe
                  src={mapEmbedUrl}
                  title={t.map}
                  className="h-64 w-full"
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </article>
          </section>
        </section>
      </main>
    </>
  );
}
