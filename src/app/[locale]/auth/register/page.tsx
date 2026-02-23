import type { Metadata } from "next";
import { notFound } from "next/navigation";

import type { AppLocale } from "../../../../../lib/i18n/locale";
import { CustomerAuthForm } from "../../../../components/storefront/CustomerAuthForm";

type LocalizedRegisterPageProps = {
  params: Promise<{ locale: string }>;
};

function normalizeLocale(input: string): AppLocale | null {
  if (input === "th" || input === "en") return input;
  return null;
}

export async function generateMetadata({ params }: LocalizedRegisterPageProps): Promise<Metadata> {
  const locale = normalizeLocale((await params).locale.toLowerCase());
  if (!locale) return { title: "Not found" };

  return locale === "en"
    ? {
        title: "Register | Kittisap",
        description: "Create your customer account for ordering and tracking.",
        alternates: {
          canonical: "/en/auth/register",
          languages: { th: "/auth/register", en: "/en/auth/register" },
        },
      }
    : {
        title: "สมัครสมาชิก | Kittisap",
        description: "สมัครสมาชิกลูกค้าเพื่อสั่งซื้อและติดตามคำสั่งซื้อ",
        alternates: {
          canonical: "/auth/register",
          languages: { th: "/auth/register", en: "/en/auth/register" },
        },
      };
}

export default async function LocalizedRegisterPage({ params }: LocalizedRegisterPageProps) {
  const locale = normalizeLocale((await params).locale.toLowerCase());
  if (!locale) notFound();

  return <CustomerAuthForm mode="register" locale={locale} useLocalePrefix />;
}
