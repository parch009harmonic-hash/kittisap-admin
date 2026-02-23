import type { Metadata } from "next";

import { getAppLocale } from "../../../../lib/i18n/locale";
import { CustomerAuthForm } from "../../../components/storefront/CustomerAuthForm";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "เข้าสู่ระบบลูกค้า | Kittisap",
    description: "เข้าสู่ระบบลูกค้าเพื่อสั่งซื้อสินค้าและติดตามคำสั่งซื้อ",
    alternates: {
      canonical: "/auth/login",
      languages: { th: "/auth/login", en: "/en/auth/login" },
    },
  };
}

export default async function CustomerLoginPage() {
  const locale = await getAppLocale();
  return <CustomerAuthForm mode="login" locale={locale} />;
}
