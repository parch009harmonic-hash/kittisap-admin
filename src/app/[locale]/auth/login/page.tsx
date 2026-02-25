import type { Metadata } from "next";
import { notFound } from "next/navigation";

import type { AppLocale } from "../../../../../lib/i18n/locale";
import { CustomerAuthForm } from "../../../../components/storefront/CustomerAuthForm";

type LocalizedLoginPageProps = {
  params: Promise<{ locale: string }>;
};

function normalizeLocale(input: string): AppLocale | null {
  if (input === "th" || input === "en" || input === "lo") return input;
  return null;
}

export async function generateMetadata({ params }: LocalizedLoginPageProps): Promise<Metadata> {
  const locale = normalizeLocale((await params).locale.toLowerCase());
  if (!locale) return { title: "Not found" };

  if (locale === "en") {
    return {
        title: "Login | Kittisap",
        description: "Customer login for checkout and order tracking.",
        alternates: {
          canonical: "/en/auth/login",
          languages: { th: "/auth/login", en: "/en/auth/login", lo: "/lo/auth/login" },
        },
      };
  }

  if (locale === "lo") {
    return {
      title: "ເຂົ້າລະບົບລູກຄ້າ | Kittisap",
      description: "ເຂົ້າລະບົບເພື່ອສັ່ງຊື້ ແລະຕິດຕາມຄໍາສັ່ງຊື້",
      alternates: {
        canonical: "/lo/auth/login",
        languages: { th: "/auth/login", en: "/en/auth/login", lo: "/lo/auth/login" },
      },
    };
  }

  return {
    title: "เข้าสู่ระบบลูกค้า | Kittisap",
    description: "เข้าสู่ระบบลูกค้าเพื่อสั่งซื้อสินค้าและติดตามคำสั่งซื้อ",
    alternates: {
      canonical: "/auth/login",
      languages: { th: "/auth/login", en: "/en/auth/login", lo: "/lo/auth/login" },
    },
  };
}

export default async function LocalizedLoginPage({ params }: LocalizedLoginPageProps) {
  const locale = normalizeLocale((await params).locale.toLowerCase());
  if (!locale) notFound();

  return <CustomerAuthForm mode="login" locale={locale} useLocalePrefix />;
}

