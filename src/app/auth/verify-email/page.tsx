import type { Metadata } from "next";

import { getAppLocale } from "../../../../lib/i18n/locale";
import { EmailVerifyPendingCard } from "../../../components/storefront/EmailVerifyPendingCard";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "ยืนยันอีเมล | Kittisap",
    description: "ยืนยันอีเมลเพื่อเปิดใช้งานบัญชีลูกค้า",
    alternates: {
      canonical: "/auth/verify-email",
      languages: { th: "/auth/verify-email", en: "/en/auth/verify-email" },
    },
  };
}

export default async function VerifyEmailPage() {
  const locale = await getAppLocale();
  return <EmailVerifyPendingCard locale={locale} />;
}
