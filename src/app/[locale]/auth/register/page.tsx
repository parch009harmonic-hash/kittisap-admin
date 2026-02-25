import type { Metadata } from "next";
import { notFound } from "next/navigation";

import type { AppLocale } from "../../../../../lib/i18n/locale";
import { CustomerAuthForm } from "../../../../components/storefront/CustomerAuthForm";

type LocalizedRegisterPageProps = {
  params: Promise<{ locale: string }>;
};

function normalizeLocale(input: string): AppLocale | null {
  if (input === "th" || input === "en" || input === "lo") return input;
  return null;
}

export async function generateMetadata({ params }: LocalizedRegisterPageProps): Promise<Metadata> {
  const locale = normalizeLocale((await params).locale.toLowerCase());
  if (!locale) return { title: "Not found" };

  if (locale === "en") {
    return {
        title: "Register | Kittisap",
        description: "Create your customer account for ordering and tracking.",
        alternates: {
          canonical: "/en/auth/register",
          languages: { th: "/auth/register", en: "/en/auth/register", lo: "/lo/auth/register" },
        },
      };
  }

  if (locale === "lo") {
    return {
      title: "ສະໝັກສະມາຊິກ | Kittisap",
      description: "ສ້າງບັນຊີລູກຄ້າເພື່ອສັ່ງຊື້ ແລະຕິດຕາມຄໍາສັ່ງຊື້",
      alternates: {
        canonical: "/lo/auth/register",
        languages: { th: "/auth/register", en: "/en/auth/register", lo: "/lo/auth/register" },
      },
    };
  }

  return {
    title: "สมัครสมาชิก | Kittisap",
    description: "สมัครสมาชิกลูกค้าเพื่อสั่งซื้อสินค้าและติดตามคำสั่งซื้อ",
    alternates: {
      canonical: "/auth/register",
      languages: { th: "/auth/register", en: "/en/auth/register", lo: "/lo/auth/register" },
    },
  };
}

export default async function LocalizedRegisterPage({ params }: LocalizedRegisterPageProps) {
  const locale = normalizeLocale((await params).locale.toLowerCase());
  if (!locale) notFound();

  return <CustomerAuthForm mode="register" locale={locale} useLocalePrefix />;
}

