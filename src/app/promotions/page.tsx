import type { Metadata } from "next";

import { getAppLocale } from "../../../lib/i18n/locale";
import { PromotionsPage } from "../../components/storefront/PromotionsPage";

export const revalidate = 120;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getAppLocale();

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

export default async function PublicPromotionsPage() {
  const locale = await getAppLocale();
  return <PromotionsPage locale={locale} />;
}
