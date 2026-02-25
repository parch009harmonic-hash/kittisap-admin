import type { Metadata } from "next";
import { notFound } from "next/navigation";

import type { AppLocale } from "../../../../../lib/i18n/locale";
import { EmailVerifyPendingCard } from "../../../../components/storefront/EmailVerifyPendingCard";

type LocalizedVerifyPageProps = {
  params: Promise<{ locale: string }>;
};

function normalizeLocale(input: string): AppLocale | null {
  if (input === "th" || input === "en" || input === "lo") return input;
  return null;
}

export async function generateMetadata({ params }: LocalizedVerifyPageProps): Promise<Metadata> {
  const locale = normalizeLocale((await params).locale.toLowerCase());
  if (!locale) return { title: "Not found" };

  if (locale === "en") {
    return {
        title: "Verify Email | Kittisap",
        description: "Verify your email before signing in to customer account.",
        alternates: {
          canonical: "/en/auth/verify-email",
          languages: { th: "/auth/verify-email", en: "/en/auth/verify-email", lo: "/lo/auth/verify-email" },
        },
      };
  }

  if (locale === "lo") {
    return {
      title: "ຢືນຢັນອີເມວ | Kittisap",
      description: "ຢືນຢັນອີເມວກ່ອນເຂົ້າລະບົບບັນຊີລູກຄ້າ",
      alternates: {
        canonical: "/lo/auth/verify-email",
        languages: { th: "/auth/verify-email", en: "/en/auth/verify-email", lo: "/lo/auth/verify-email" },
      },
    };
  }

  return {
    title: "ยืนยันอีเมล | Kittisap",
    description: "ยืนยันอีเมลก่อนเข้าใช้งานบัญชีลูกค้า",
    alternates: {
      canonical: "/auth/verify-email",
      languages: { th: "/auth/verify-email", en: "/en/auth/verify-email", lo: "/lo/auth/verify-email" },
    },
  };
}

export default async function LocalizedVerifyEmailPage({ params }: LocalizedVerifyPageProps) {
  const locale = normalizeLocale((await params).locale.toLowerCase());
  if (!locale) notFound();

  return <EmailVerifyPendingCard locale={locale} useLocalePrefix />;
}

