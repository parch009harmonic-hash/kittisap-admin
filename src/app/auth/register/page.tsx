import type { Metadata } from "next";

import { getAppLocale } from "../../../../lib/i18n/locale";
import { CustomerAuthForm } from "../../../components/storefront/CustomerAuthForm";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "สมัครสมาชิก | Kittisap",
    description: "สมัครสมาชิกลูกค้าเพื่อสั่งซื้อและติดตามคำสั่งซื้อ",
    alternates: {
      canonical: "/auth/register",
      languages: { th: "/auth/register", en: "/en/auth/register" },
    },
  };
}

export default async function CustomerRegisterPage() {
  const locale = await getAppLocale();
  return <CustomerAuthForm mode="register" locale={locale} />;
}
