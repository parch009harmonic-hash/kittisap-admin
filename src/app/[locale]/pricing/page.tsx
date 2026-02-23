import type { Metadata } from "next";
import { notFound } from "next/navigation";

import type { AppLocale } from "../../../../lib/i18n/locale";
import { PricingTablePage } from "../../../components/storefront/PricingTablePage";

export const revalidate = 120;

type LocalizedPricingPageProps = {
  params: Promise<{ locale: string }>;
};

function normalizeLocale(input: string): AppLocale | null {
  if (input === "th" || input === "en") {
    return input;
  }
  return null;
}

export async function generateMetadata({ params }: LocalizedPricingPageProps): Promise<Metadata> {
  const locale = normalizeLocale((await params).locale.toLowerCase());
  if (!locale) {
    return { title: "Not found" };
  }

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

export default async function LocalizedPricingPage({ params }: LocalizedPricingPageProps) {
  const locale = normalizeLocale((await params).locale.toLowerCase());
  if (!locale) {
    notFound();
  }
  return <PricingTablePage locale={locale} />;
}
