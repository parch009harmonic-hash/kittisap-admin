import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { listPublicProducts } from "../../../lib/db/publicProducts";
import {
  getWebBannerSettings,
  getWebStorefrontSettings,
  getWebHomepageAppearanceSettings,
  getWebHomepageImageStripSettings,
  getWebMiddleBannerSettings,
  getWebBrandGuaranteeSettings,
  getWebNewsCardsSettings,
  getWebWhyChooseUsSettings,
} from "../../../lib/db/web-settings";
import type { AppLocale } from "../../../lib/i18n/locale";
import {
  getDefaultWebBannerSettings,
  getDefaultWebStorefrontSettings,
  getDefaultWebHomepageAppearanceSettings,
  getDefaultWebHomepageImageStripSettings,
  getDefaultWebMiddleBannerSettings,
  getDefaultWebBrandGuaranteeSettings,
  getDefaultWebNewsCardsSettings,
  getDefaultWebWhyChooseUsSettings,
  WhyChooseUsIcon,
} from "../../../lib/types/web-settings";
import { ActivitiesNewsGrid } from "./ActivitiesNewsGrid";
import { FeaturedProductsLiveSection } from "./FeaturedProductsLiveSection";
import { FeaturedProductsShowcase } from "./FeaturedProductsShowcase";
import { MiddleBannerStrip } from "./MiddleBannerStrip";
import { MarketingTopNav } from "./MarketingTopNav";
import { NewsletterSubscribeSection } from "./NewsletterSubscribeSection";
import { StorefrontRealtimeRefresh } from "./StorefrontRealtimeRefresh";

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

function hasThaiChars(value: string) {
  return /[\u0E00-\u0E7F]/.test(value);
}

function localizeSettingText(raw: string | null | undefined, locale: AppLocale, fallback: string) {
  const value = (raw ?? "").trim();
  if (!value) return fallback;
  if (locale === "th") return value;
  return hasThaiChars(value) ? fallback : value;
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
      },
      cta: {
        products: "ดูสินค้า",
      },
      hero: {
        eyebrow: "KITTISAP CUSTOMER SITE",
        title: "แพลตฟอร์มลูกค้า เชื่อมสินค้าและคำสั่งซื้อชุดเดียวกับระบบแอดมิน",
        desc: "ลูกค้าดูสินค้า ตารางราคา โปรโมชัน สั่งซื้อ และชำระเงินผ่าน PromptPay ได้ครบในระบบเดียว",
      },
      sections: {
        updates: "สินค้าแนะนำ",
        updatesSub: "",
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
      newsletter: {
        title: "รับข่าวสารและโปรโมชันล่าสุด",
        subtitle: "กรอกชื่อและอีเมลของคุณ เพื่อรับข้อเสนอพิเศษและอัปเดตกิจกรรมใหม่ก่อนใคร",
        nameLabel: "ชื่อ",
        emailLabel: "อีเมล",
        namePlaceholder: "ชื่อของคุณ",
        emailPlaceholder: "you@example.com",
        cta: "สมัครรับข่าวสาร",
        success: "สมัครรับข่าวสารเรียบร้อยแล้ว",
        error: "สมัครรับข่าวสารไม่สำเร็จ",
      },
    };
  }

  if (locale === "lo") {
    return {
      brand: "Kittisap",
      nav: {
        home: "ໜ້າຫຼັກ",
        products: "ສິນຄ້າຂອງພວກເຮົາ",
        pricing: "ຕາຕະລາງລາຄາ",
        promotions: "ກິດຈະກຳ + ຄູປອງ",
        contact: "ຕິດຕໍ່",
      },
      cta: {
        products: "ເບິ່ງສິນຄ້າ",
      },
      hero: {
        eyebrow: "KITTISAP CUSTOMER SITE",
        title: "ແພລດຟອມລູກຄ້າ ເຊື່ອມສິນຄ້າ ແລະຄໍາສັ່ງຊື້ກັບລະບົບແອດມິນ",
        desc: "ລູກຄ້າເລືອກເບິ່ງສິນຄ້າ ລາຄາ ໂປຣໂມຊັນ ສັ່ງຊື້ ແລະຊໍາລະເງິນໃນລະບົບດຽວ",
      },
      sections: {
        updates: "ສິນຄ້າແນະນໍາ",
        updatesSub: "",
        news: "ກິດຈະກໍາ ແລະຂ່າວສານ",
        newsSub: "ອັບເດດໂປຣໂມຊັນ ແລະຄູປອງຫຼ້າສຸດ",
      },
      tags: {
        latest: "Live Products",
        updates: "Promotions",
      },
      card: {
        model: "ສິນຄ້າ",
        meta: "ລາຄາ • ສະຕັອກ",
        article: "ຫົວຂໍ້ຂ່າວ / ກິດຈະກໍາ",
        articleMeta: "ວັນທີ • ໝວດໝູ່",
      },
      footer: {
        title: "Kittisap",
        desc1: "ເວັບໄຊລູກຄ້າເຊື່ອມຂໍ້ມູນກັບລະບົບແອດມິນ ແລະ Supabase",
        desc2: "ຮອງຮັບການສັ່ງຊື້ ຊໍາລະເງິນ ແລະກວດສອບສະຖານະຄໍາສັ່ງຊື້ຄົບວົງຈອນ",
        quick: "Quick Links",
        contact: "Contact",
        admin: "Admin Login",
        dev: "Developer Console",
      },
      newsletter: {
        title: "ຮັບຂ່າວສານ ແລະ ໂປຣໂມຊັນຫຼ້າສຸດ",
        subtitle: "ກອກຊື່ ແລະ ອີເມວ ເພື່ອຮັບຂໍ້ສະເໜີພິເສດ ແລະ ການອັບເດດໃໝ່ກ່ອນໃຜ",
        nameLabel: "ຊື່",
        emailLabel: "ອີເມວ",
        namePlaceholder: "ຊື່ຂອງທ່ານ",
        emailPlaceholder: "you@example.com",
        cta: "ສະໝັກຮັບຂ່າວສານ",
        success: "ສະໝັກຮັບຂ່າວສານສຳເລັດແລ້ວ",
        error: "ສະໝັກຮັບຂ່າວສານບໍ່ສຳເລັດ",
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
    },
    cta: {
      products: "Browse Products",
    },
    hero: {
      eyebrow: "KITTISAP CUSTOMER SITE",
      title: "Customer platform connected to the same catalog and orders as admin",
      desc: "Customers can browse products, pricing, promotions, and complete PromptPay checkout in one flow.",
    },
    sections: {
      updates: "Featured Products",
      updatesSub: "",
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
    newsletter: {
      title: "Get Latest News and Promotions",
      subtitle: "Enter your name and email to receive exclusive offers and campaign updates.",
      nameLabel: "Name",
      emailLabel: "Email",
      namePlaceholder: "Your name",
      emailPlaceholder: "you@example.com",
      cta: "Subscribe",
      success: "Subscription received successfully.",
      error: "Subscription failed",
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

function PlaceholderCard({ title, meta, href }: { title: string; meta: string; href: string }) {
  return (
    <Link href={href} className="tap-ripple app-press overflow-hidden rounded-2xl border border-slate-400/20 bg-gradient-to-b from-slate-900/90 to-slate-950/80 shadow-[0_14px_50px_rgba(0,0,0,0.28)] transition hover:-translate-y-0.5 hover:border-amber-400/40">
      <div className="aspect-[16/10] bg-[linear-gradient(135deg,rgba(245,158,11,0.22),rgba(59,130,246,0.12)),radial-gradient(800px_300px_at_20%_20%,rgba(255,255,255,0.08),transparent_45%)]" />
      <div className="p-4">
        <p className="text-sm font-extrabold tracking-tight text-slate-100">{title}</p>
        <p className="mt-1 text-xs text-slate-300/70">{meta}</p>
      </div>
    </Link>
  );
}

function WhyChooseUsIconSvg({ icon }: { icon: WhyChooseUsIcon }) {
  if (icon === "shield") {
    return <path d="M12 3l7 3v5c0 4.7-2.9 8.8-7 10-4.1-1.2-7-5.3-7-10V6l7-3zm0 5v7m-3-4h6" />;
  }
  if (icon === "spark") {
    return <path d="M12 3l2.2 4.8L19 10l-4.8 2.2L12 17l-2.2-4.8L5 10l4.8-2.2L12 3zm7 13l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2zM5 14l.8 1.8L8 16.6l-2.2.8L5 19l-.8-1.6L2 16.6l2.2-.8L5 14z" />;
  }
  if (icon === "award") {
    return <path d="M12 3a5 5 0 0 1 5 5c0 2.8-2.2 5-5 5s-5-2.2-5-5a5 5 0 0 1 5-5zm0 10v8l-2.5-2-2.5 2v-6.2M12 13l2.5 2 2.5-2v6.2" />;
  }
  if (icon === "layers") {
    return <path d="M12 4l8 4-8 4-8-4 8-4zm-8 8l8 4 8-4M4 16l8 4 8-4" />;
  }
  if (icon === "rocket") {
    return <path d="M14 5c3 .2 4.8 2 5 5-2 2-4 4-6.5 5.5L9 19l.5-3.5C11 13 13 11 15 9c.3-1.6.1-2.8-1-4zM8 16l-3 3m2-8l-2.5.5L4 14l2.5-.5L7 11z" />;
  }
  if (icon === "support") {
    return <path d="M4 12a8 8 0 1 1 16 0v3a2 2 0 0 1-2 2h-2v-5h4M4 12H8v5H6a2 2 0 0 1-2-2v-3zm4 8h8" />;
  }
  if (icon === "speed") {
    return <path d="M4 14a8 8 0 1 1 16 0h-3a5 5 0 1 0-10 0H4zm8-5l4 3-4 3z" />;
  }
  return <path d="M20 7L9 18l-5-5" />;
}

type ShowroomItem = {
  id: string;
  slug: string;
  title: string;
  price: number;
  stock: number;
  coverUrl: string | null;
  description: string | null;
};

async function loadShowroomItems(locale: AppLocale): Promise<ShowroomItem[]> {
  try {
    const featuredSource = await listPublicProducts({ featuredOnly: true, page: 1, pageSize: 4 });
    const source = featuredSource.items.length > 0 ? featuredSource : await listPublicProducts({ page: 1, pageSize: 4 });
    return source.items.map((item) => ({
      id: item.id,
      slug: item.slug,
      title:
        locale === "en"
          ? item.title_en || item.title_th
          : locale === "lo"
            ? item.title_lo || item.title_en || item.title_th
            : item.title_th,
      price: item.price,
      stock: item.stock,
      coverUrl: item.cover_url,
        description:
          locale === "en"
            ? item.description_en?.trim() || item.description_th?.trim() || null
            : locale === "lo"
              ? item.description_lo?.trim() || item.description_en?.trim() || item.description_th?.trim() || null
              : item.description_th?.trim() || item.description_en?.trim() || null,
    }));
  } catch {
    return [];
  }
}

export async function MarketingLandingPage({
  locale,
  useLocalePrefix = false,
  showOuterFrame = true,
  showTopNav = true,
}: MarketingLandingPageProps) {
  const t = copy(locale);
  const showroomItems = await loadShowroomItems(locale);
  let bannerSettings = getDefaultWebBannerSettings();
  let storefrontSettings = getDefaultWebStorefrontSettings();
  let homepageAppearance = getDefaultWebHomepageAppearanceSettings();
  let homepageImageStrip = getDefaultWebHomepageImageStripSettings();
  let middleBannerSettings = getDefaultWebMiddleBannerSettings();
  let brandGuaranteeSettings = getDefaultWebBrandGuaranteeSettings();
  let newsCardsSettings = getDefaultWebNewsCardsSettings();
  let whyChooseUsSettings = getDefaultWebWhyChooseUsSettings();
  const settingsResults = await Promise.allSettled([
    getWebBannerSettings(),
    getWebStorefrontSettings(),
    getWebHomepageAppearanceSettings(),
    getWebHomepageImageStripSettings(),
    getWebWhyChooseUsSettings(),
    getWebMiddleBannerSettings(),
    getWebBrandGuaranteeSettings(),
    getWebNewsCardsSettings(),
  ]);
  const [
    bannerResult,
    storefrontResult,
    homepageAppearanceResult,
    homepageImageStripResult,
    whyChooseUsResult,
    middleBannerResult,
    brandGuaranteeResult,
    newsCardsResult,
  ] = settingsResults;
  if (bannerResult.status === "fulfilled") bannerSettings = bannerResult.value;
  if (storefrontResult.status === "fulfilled") storefrontSettings = storefrontResult.value;
  if (homepageAppearanceResult.status === "fulfilled") homepageAppearance = homepageAppearanceResult.value;
  if (homepageImageStripResult.status === "fulfilled") homepageImageStrip = homepageImageStripResult.value;
  if (whyChooseUsResult.status === "fulfilled") whyChooseUsSettings = whyChooseUsResult.value;
  if (middleBannerResult.status === "fulfilled") middleBannerSettings = middleBannerResult.value;
  if (brandGuaranteeResult.status === "fulfilled") brandGuaranteeSettings = brandGuaranteeResult.value;
  if (newsCardsResult.status === "fulfilled") newsCardsSettings = newsCardsResult.value;
  const homePath = withLocale(locale, "/", useLocalePrefix);
  const productsPath = withLocale(locale, "/products", useLocalePrefix);
  const pricingPath = withLocale(locale, "/pricing", useLocalePrefix);
  const promotionsPath = withLocale(locale, "/promotions", useLocalePrefix);
  const contactPath = withLocale(locale, "/contact", useLocalePrefix);
  const localizedHeroEyebrow = localizeSettingText(bannerSettings.eyebrow, locale, t.hero.eyebrow);
  const localizedHeroTitle = localizeSettingText(bannerSettings.title, locale, t.hero.title);
  const localizedHeroDesc = localizeSettingText(bannerSettings.description, locale, t.hero.desc);
  const localizedPrimaryButton = localizeSettingText(bannerSettings.primaryButtonLabel, locale, t.nav.products);
  const localizedSecondaryButton = localizeSettingText(bannerSettings.secondaryButtonLabel, locale, t.nav.promotions);
  const localizedIntroTitle = localizeSettingText(
    homepageAppearance.introTitle,
    locale,
    locale === "en" ? "KITTISAP ATV" : locale === "lo" ? "KITTISAP ATV" : homepageAppearance.introTitle,
  );
  const localizedIntroContent = localizeSettingText(homepageAppearance.introContent, locale, t.hero.desc);
  const localizedBrandTitle = localizeSettingText(
    brandGuaranteeSettings.sectionTitle,
    locale,
    locale === "en" ? "Trusted Brands and Standards" : locale === "lo" ? "ແບຣນ ແລະ ມາດຕະຖານທີ່ໄວ້ວາງໃຈ" : brandGuaranteeSettings.sectionTitle,
  );
  const localizedBrandSubtitle = localizeSettingText(
    brandGuaranteeSettings.sectionSubtitle,
    locale,
    locale === "en"
      ? "Partners and standards trusted by our customers"
      : locale === "lo"
        ? "ພາກສ່ວນຮ່ວມ ແລະ ມາດຕະຖານທີ່ລູກຄ້າໄວ້ວາງໃຈ"
        : brandGuaranteeSettings.sectionSubtitle,
  );
  const localizedWhyTitle = localizeSettingText(
    whyChooseUsSettings.sectionTitle,
    locale,
    locale === "en" ? "Why Choose KITTISAP ATV" : locale === "lo" ? "ເປັນຫຍັງຕ້ອງເລືອກ KITTISAP ATV" : whyChooseUsSettings.sectionTitle,
  );
  const localizedWhySubtitle = localizeSettingText(
    whyChooseUsSettings.sectionSubtitle,
    locale,
    locale === "en"
      ? "Built for riders and businesses that need confidence"
      : locale === "lo"
        ? "ອອກແບບສຳລັບຜູ້ໃຊ້ ແລະ ທຸລະກິດທີ່ຕ້ອງການຄວາມໜ້າເຊື່ອຖື"
        : whyChooseUsSettings.sectionSubtitle,
  );
  const localizedWhyTagline = localizeSettingText(
    whyChooseUsSettings.sectionTagline,
    locale,
    locale === "en"
      ? "Performance, support and reliability in one place"
      : locale === "lo"
        ? "ສົມທົບປະສິດທິພາບ ການບໍລິການ ແລະ ຄວາມໄວ້ວາງໃຈ"
        : whyChooseUsSettings.sectionTagline,
  );
  const heroImageUrl = bannerSettings.imageUrl || showroomItems[0]?.coverUrl || null;
  const heroImageAlt = localizedHeroTitle || showroomItems[0]?.title || "Banner image";
  const bannerMotionClass = bannerSettings.imageMotion === "none" ? "" : `banner-motion-${bannerSettings.imageMotion}`;
  const bannerFrameClass = `banner-frame-${bannerSettings.imageFrameStyle}`;
  const contentAlignClass =
    bannerSettings.contentAlign === "center"
      ? "items-center text-center"
      : bannerSettings.contentAlign === "right"
        ? "items-end text-right"
        : "items-start text-left";
  const buttonAlignClass =
    bannerSettings.contentAlign === "center"
      ? "justify-center"
      : bannerSettings.contentAlign === "right"
        ? "justify-end"
        : "justify-start";
  const titleEffectClass =
    bannerSettings.textEffect === "gradient"
      ? "bg-gradient-to-r from-amber-200 via-white to-cyan-200 bg-clip-text text-transparent"
      : "";
  const titleEffectStyle =
    bannerSettings.textEffect === "shadow"
      ? { textShadow: "0 10px 26px rgba(15,23,42,0.45)" }
      : bannerSettings.textEffect === "glow"
        ? { textShadow: "0 0 24px rgba(56,189,248,0.5)" }
        : undefined;
  const heroTitleMaxPx =
    locale === "th"
      ? Math.round(bannerSettings.titleFontSizePx * (bannerSettings.titleFontScaleThaiPercent / 100))
      : bannerSettings.titleFontSizePx;

  return (
    <Frame showOuterFrame={showOuterFrame}>
      <div
        style={{
          backgroundColor: homepageAppearance.pageBackgroundColor,
          color: homepageAppearance.textColor,
        }}
      >
        <StorefrontRealtimeRefresh />
        {showTopNav ? (
          <MarketingTopNav
            locale={locale}
            useLocalePrefix={useLocalePrefix}
            brand={storefrontSettings.brandName || t.brand}
            nav={t.nav}
            cta={{
              ...t.cta,
              call:
                storefrontSettings.callButtonLabel ||
                (locale === "th" ? "โทรหาเรา" : locale === "lo" ? "ໂທຫາພວກເຮົາ" : "Call Us"),
              phone: storefrontSettings.callPhone || "+66843374982",
            }}
          />
        ) : null}

      <section id="showroom" className="mx-auto w-full max-w-7xl px-4 py-7">
        <article
          className="relative overflow-hidden rounded-[28px] border border-slate-400/20 shadow-[0_18px_60px_rgba(0,0,0,0.45)]"
          style={{ background: `linear-gradient(135deg, ${bannerSettings.backgroundFrom}, ${bannerSettings.backgroundTo})` }}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(closest-side,rgba(245,158,11,0.26),transparent_55%),radial-gradient(closest-side,rgba(59,130,246,0.16),transparent_62%),linear-gradient(120deg,transparent_35%,rgba(255,255,255,0.08)_45%,transparent_55%)] opacity-70" />

          <div className="relative grid gap-5 p-6 md:p-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)] lg:gap-6">
            <div
              className={`flex max-w-full flex-col ${contentAlignClass}`}
              style={{
                minHeight: bannerSettings.autoHeight
                  ? undefined
                  : `clamp(240px, 34vw, ${bannerSettings.minHeightPx}px)`,
              }}
            >
              <p className="inline-flex items-center gap-2 uppercase tracking-[0.2em] text-amber-200" style={{ fontSize: `${bannerSettings.eyebrowFontSizePx}px`, fontWeight: 800 }}>{localizedHeroEyebrow}</p>
              <h1
                className={`mt-2 max-w-[20ch] leading-tight tracking-tight md:max-w-[18ch] md:text-5xl ${titleEffectClass}`}
                style={{
                  fontSize: `clamp(30px,3.8vw,${heroTitleMaxPx}px)`,
                  color: bannerSettings.textEffect === "gradient" ? undefined : "#f8fafc",
                  ...titleEffectStyle,
                }}
              >
                {localizedHeroTitle}
              </h1>
              <p className="mt-3 max-w-[58ch] text-slate-200/80" style={{ fontSize: `clamp(14px,1.6vw,${bannerSettings.descriptionFontSizePx}px)` }}>{localizedHeroDesc}</p>
              {bannerSettings.showButtons ? (
                <div className={`mt-5 flex w-full flex-wrap gap-2 ${buttonAlignClass}`}>
                  <Link href={productsPath} className="inline-flex rounded-full border border-amber-400/40 bg-amber-500/15 px-4 py-2 text-xs font-extrabold text-amber-200">{localizedPrimaryButton}</Link>
                  <Link href={promotionsPath} className="inline-flex rounded-full border border-slate-400/30 bg-white/5 px-4 py-2 text-xs font-extrabold text-slate-100">{localizedSecondaryButton}</Link>
                </div>
              ) : null}
            </div>

            <aside>
              <div
                className={`relative aspect-[16/10] overflow-hidden bg-[linear-gradient(135deg,rgba(245,158,11,0.22),rgba(59,130,246,0.12)),repeating-linear-gradient(135deg,rgba(255,255,255,0.06)_0_10px,transparent_10px_20px)] ${
                  bannerSettings.imageFrameEnabled ? bannerFrameClass : ""
                }`}
                style={{
                  borderRadius: `${bannerSettings.imageFrameRadiusPx}px`,
                  borderColor: bannerSettings.imageFrameColor,
                  borderWidth: bannerSettings.imageFrameEnabled ? `${bannerSettings.imageFrameBorderWidthPx}px` : "0px",
                  borderStyle: bannerSettings.imageFrameEnabled ? "solid" : "none",
                }}
              >
                {heroImageUrl ? (
                  <Image
                    src={heroImageUrl}
                    alt={heroImageAlt}
                    fill
                    sizes="(max-width: 768px) 100vw, 40vw"
                    priority
                    fetchPriority="high"
                    className={`object-cover ${bannerMotionClass}`}
                  />
                ) : null}
              </div>
            </aside>
          </div>
        </article>
      </section>

      <section
        className="mx-auto w-full max-w-7xl px-4"
        style={{ marginTop: `${homepageAppearance.sectionGapPx}px` }}
      >
        <article
          className="rounded-3xl px-6 py-10 text-center shadow-sm md:px-12 md:py-12"
          style={{ backgroundColor: homepageAppearance.introCardBackgroundColor }}
        >
          <h2
            className="tracking-tight"
            style={{
              color: homepageAppearance.introTitleColor,
              fontWeight: homepageAppearance.introTitleFontWeight,
              fontSize: `clamp(28px, 3.2vw, ${homepageAppearance.introTitleFontSizePx}px)`,
              textShadow: homepageAppearance.introTextGlow ? "0 0 18px rgba(56, 189, 248, 0.28)" : "none",
            }}
          >
            {localizedIntroTitle}
          </h2>
          <p
            className="mx-auto mt-4 max-w-5xl whitespace-pre-line leading-8"
            style={{
              color: homepageAppearance.introContentColor,
              fontWeight: homepageAppearance.introContentFontWeight,
              fontSize: `clamp(16px, 1.8vw, ${homepageAppearance.introContentFontSizePx}px)`,
              textShadow: homepageAppearance.introTextGlow ? "0 0 14px rgba(56, 189, 248, 0.22)" : "none",
            }}
          >
            {localizedIntroContent}
          </p>
        </article>
      </section>

      {homepageImageStrip.items.length > 0 ? (
        <section
          className="mx-auto w-full max-w-7xl px-4"
          style={{ marginTop: `${homepageImageStrip.sectionGapPx}px` }}
        >
          <div
            className={`grid gap-4 ${
              homepageImageStrip.items.length >= 4
                ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4"
                : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
            }`}
          >
            {homepageImageStrip.items.slice(0, 4).map((item) => (
              <article
                key={item.id}
                className="overflow-hidden rounded-2xl border border-slate-300/30 bg-white shadow-sm"
              >
                <div className="relative aspect-[16/7]">
                  <Image
                    src={item.imageUrl}
                    alt={item.altText || "Homepage image"}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 33vw, 25vw"
                    className="object-cover"
                    loading="lazy"
                  />
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section id="updates" className="mx-auto w-full max-w-7xl px-4 py-12">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-100 md:text-3xl">{t.sections.updates}</h2>
            {t.sections.updatesSub ? <p className="mt-1 text-sm text-slate-300/70">{t.sections.updatesSub}</p> : null}
          </div>
          <span className="rounded-full border border-slate-400/20 bg-white/5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-200/85">{t.tags.latest}</span>
        </div>

        {showroomItems.length > 0 ? (
          <FeaturedProductsLiveSection initialItems={showroomItems} locale={locale} useLocalePrefix={useLocalePrefix} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <PlaceholderCard key={item} title={t.card.model} meta={t.card.meta} href={productsPath} />
            ))}
          </div>
        )}
      </section>

      <MiddleBannerStrip
        items={middleBannerSettings.items}
        backgroundColor={middleBannerSettings.backgroundColor}
        sectionGapRem={middleBannerSettings.sectionGapRem}
      />

      {brandGuaranteeSettings.items.length > 0 ? (
        <section
          className="mx-auto w-full max-w-7xl px-4"
          style={{ marginTop: `${brandGuaranteeSettings.sectionGapPx}px` }}
        >
          <div className="mb-4">
            <h2 className="text-2xl font-black tracking-tight text-slate-100 md:text-3xl">{localizedBrandTitle}</h2>
            {localizedBrandSubtitle ? (
              <p className="mt-1 text-sm text-slate-300/70">{localizedBrandSubtitle}</p>
            ) : null}
          </div>

          <div className="overflow-x-auto pb-1 [scrollbar-width:thin]">
            <div
              className={`flex min-w-max gap-4 ${
                brandGuaranteeSettings.align === "left"
                  ? "justify-start"
                  : brandGuaranteeSettings.align === "right"
                    ? "justify-end"
                    : "justify-center"
              }`}
            >
              {brandGuaranteeSettings.items.map((item) => {
                const effectClass =
                  brandGuaranteeSettings.effect === "lift"
                    ? "hover:-translate-y-1 hover:shadow-xl"
                    : brandGuaranteeSettings.effect === "glow"
                      ? "hover:shadow-[0_0_30px_rgba(59,130,246,0.45)]"
                      : brandGuaranteeSettings.effect === "pulse"
                        ? "hover:scale-[1.04]"
                        : "";
                const card = (
                  <article className={`rounded-2xl border border-slate-200/40 bg-white p-4 transition ${effectClass}`}>
                    <div className="relative h-[90px] w-[150px]">
                      <Image src={item.logoUrl} alt={item.altText || ""} fill className="object-contain" loading="lazy" unoptimized />
                    </div>
                  </article>
                );
                return item.linkUrl ? (
                  <a key={item.id} href={item.linkUrl} target="_blank" rel="noreferrer" className="inline-block">
                    {card}
                  </a>
                ) : (
                  <div key={item.id} className="inline-block">
                    {card}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      {whyChooseUsSettings.items.length > 0 ? (
        <section
          className="mx-auto w-full max-w-7xl px-4"
          style={{ marginTop: `${whyChooseUsSettings.sectionGapPx}px` }}
        >
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-100 md:text-4xl">{localizedWhyTitle}</h2>
              {localizedWhySubtitle ? (
                <p className="mt-1 text-sm text-slate-300/75">{localizedWhySubtitle}</p>
              ) : null}
            </div>
            {localizedWhyTagline ? (
              <p className="text-sm text-slate-300/70">{localizedWhyTagline}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {whyChooseUsSettings.items.slice(0, 6).map((item) => (
              <article key={item.id} className="rounded-2xl border border-slate-300/25 bg-white/5 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.15)] backdrop-blur-[1px]">
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100/95 text-blue-600">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden>
                    <WhyChooseUsIconSvg icon={item.icon} />
                  </svg>
                </div>
                <h3 className="text-xl font-black tracking-tight text-slate-100">{item.title}</h3>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-300/85">{item.description}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section id="news" className="mx-auto w-full max-w-7xl px-4 py-12" style={{ marginTop: `${newsCardsSettings.sectionGapPx}px` }}>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-100 md:text-3xl">{t.sections.news}</h2>
            <p className="mt-1 text-sm text-slate-300/70">{t.sections.newsSub}</p>
          </div>
          <span className="rounded-full border border-slate-400/20 bg-white/5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-200/85">{t.tags.updates}</span>
        </div>
        <ActivitiesNewsGrid items={newsCardsSettings.items} placeholderTitle={t.card.article} placeholderMeta={t.card.articleMeta} />
      </section>

      <NewsletterSubscribeSection
        title={t.newsletter.title}
        subtitle={t.newsletter.subtitle}
        nameLabel={t.newsletter.nameLabel}
        emailLabel={t.newsletter.emailLabel}
        namePlaceholder={t.newsletter.namePlaceholder}
        emailPlaceholder={t.newsletter.emailPlaceholder}
        ctaLabel={t.newsletter.cta}
        successMessage={t.newsletter.success}
        errorMessage={t.newsletter.error}
      />

      <footer
        id="contact"
        className="border-t border-slate-400/20 py-10 text-slate-300/85"
        style={{ color: homepageAppearance.textColor }}
      >
        <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 md:grid-cols-[1.2fr_1fr_1fr]">
          <div>
            <p className="text-base font-black text-slate-100">{storefrontSettings.footerTitle || t.footer.title}</p>
            <p className="mt-2 text-sm text-slate-300/75">{storefrontSettings.footerDescription1 || t.footer.desc1}</p>
            <p className="text-sm text-slate-300/75">{storefrontSettings.footerDescription2 || t.footer.desc2}</p>
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
            <p className="text-base font-black text-slate-100">{storefrontSettings.footerContactTitle || t.footer.contact}</p>
            <div className="mt-2 space-y-1 text-sm">
              <a href={`tel:${storefrontSettings.callPhone || "+66843374982"}`} className="block hover:text-amber-200">
                {storefrontSettings.footerCallLabel || "Call"}
              </a>
              <a href={storefrontSettings.lineUrl || "https://line.me"} className="block hover:text-amber-200">
                {storefrontSettings.footerLineLabel || "LINE"}
              </a>
              <a href={storefrontSettings.facebookUrl || "https://facebook.com"} className="block hover:text-amber-200">
                {storefrontSettings.footerFacebookLabel || "Facebook"}
              </a>
            </div>
          </div>
        </div>

        <div
          className="mx-auto mt-5 w-full max-w-7xl border-t border-slate-400/20 px-4 pt-4 text-xs"
          style={{
            backgroundColor: homepageAppearance.footerBottomBackgroundColor,
            color: homepageAppearance.textColor,
          }}
        >
          © {new Date().getFullYear()} {storefrontSettings.footerTitle || t.footer.title}
          <span className="mx-2">|</span>
          <Link href="/login" className="hover:text-amber-200">{t.footer.admin}</Link>
          <span className="mx-2">|</span>
          <Link href="/admin/developer" className="hover:text-amber-200">{t.footer.dev}</Link>
        </div>
      </footer>
      </div>
    </Frame>
  );
}

