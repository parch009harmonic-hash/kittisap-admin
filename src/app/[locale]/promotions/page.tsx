import type { Metadata } from "next";
import { notFound } from "next/navigation";

import type { AppLocale } from "../../../../lib/i18n/locale";
import { PromotionsPage } from "../../../components/storefront/PromotionsPage";

export const revalidate = 120;

type LocalizedPromotionsPageProps = {
  params: Promise<{ locale: string }>;
};

function normalizeLocale(input: string): AppLocale | null {
  if (input === "th" || input === "en") {
    return input;
  }
  return null;
}

export async function generateMetadata({ params }: LocalizedPromotionsPageProps): Promise<Metadata> {
  const locale = normalizeLocale((await params).locale.toLowerCase());
  if (!locale) {
    return { title: "Not found" };
  }

  if (locale === "en") {
    return {
      title: "Promotions | Kittisap",
      description: "Explore activities, campaign updates, and validate coupon codes securely.",
      alternates: {
        canonical: "/en/promotions",
        languages: {
          th: "/promotions",
          en: "/en/promotions",
        },
      },
    };
  }

  return {
    title: "กิจกรรมและโปรโมชัน | Kittisap",
    description: "อัปเดตกิจกรรม ข่าวสาร และตรวจสอบคูปองส่วนลดแบบปลอดภัย",
    alternates: {
      canonical: "/promotions",
      languages: {
        th: "/promotions",
        en: "/en/promotions",
      },
    },
  };
}

export default async function LocalizedPromotionsPage({ params }: LocalizedPromotionsPageProps) {
  const locale = normalizeLocale((await params).locale.toLowerCase());
  if (!locale) {
    notFound();
  }

  return <PromotionsPage locale={locale} />;
}
