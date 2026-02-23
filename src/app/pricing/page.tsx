import type { Metadata } from "next";

import { getAppLocale } from "../../../lib/i18n/locale";
import { PricingTablePage } from "../../components/storefront/PricingTablePage";

export const revalidate = 120;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getAppLocale();
  if (locale === "en") {
    return {
      title: "Pricing | Kittisap",
      description: "Live pricing table for all active Kittisap products.",
      alternates: {
        canonical: "/en/pricing",
        languages: {
          th: "/pricing",
          en: "/en/pricing",
        },
      },
    };
  }

  return {
    title: "ตารางราคา | Kittisap",
    description: "ตารางราคาสินค้าทั้งหมดที่เปิดขายในระบบ Kittisap",
    alternates: {
      canonical: "/pricing",
      languages: {
        th: "/pricing",
        en: "/en/pricing",
      },
    },
  };
}

export default async function PricingPage() {
  const locale = await getAppLocale();
  return <PricingTablePage locale={locale} />;
}
