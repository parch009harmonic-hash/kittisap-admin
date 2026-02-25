import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CONTACT_INFO } from "../../../../data/contact";
import type { AppLocale } from "../../../../lib/i18n/locale";
import { ContactPage } from "../../../components/storefront/ContactPage";

export const revalidate = 300;

type LocalizedContactPageProps = {
  params: Promise<{ locale: string }>;
};

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://kittisap.vercel.app";
}

function normalizeLocale(input: string): AppLocale | null {
  if (input === "th" || input === "en" || input === "lo") {
    return input;
  }
  return null;
}

export async function generateMetadata({ params }: LocalizedContactPageProps): Promise<Metadata> {
  const locale = normalizeLocale((await params).locale.toLowerCase());
  if (!locale) {
    return { title: "Not found" };
  }

  if (locale === "en") {
    return {
      title: "Contact | Kittisap",
      description: "Contact Kittisap via phone, LINE, map, and business hours.",
      alternates: {
        canonical: "/en/contact",
        languages: {
          th: "/contact",
          en: "/en/contact",
          lo: "/lo/contact",
        },
      },
    };
  }

  if (locale === "lo") {
    return {
      title: "ຕິດຕໍ່ພວກເຮົາ | Kittisap",
      description: "ຊ່ອງທາງຕິດຕໍ່ Kittisap ຜ່ານໂທລະສັບ, LINE, ແຜນທີ່ ແລະເວລາເຮັດການ",
      alternates: {
        canonical: "/lo/contact",
        languages: {
          th: "/contact",
          en: "/en/contact",
          lo: "/lo/contact",
        },
      },
    };
  }

  return {
    title: "ติดต่อเรา | Kittisap",
    description: "ช่องทางติดต่อ Kittisap ทั้งโทรศัพท์ LINE แผนที่ และเวลาทำการ",
    alternates: {
      canonical: "/contact",
      languages: {
        th: "/contact",
        en: "/en/contact",
        lo: "/lo/contact",
      },
    },
  };
}

export default async function LocalizedContactPage({ params }: LocalizedContactPageProps) {
  const locale = normalizeLocale((await params).locale.toLowerCase());
  if (!locale) {
    notFound();
  }

  const root = siteUrl();
  const url = locale === "th" ? `${root}/contact` : `${root}/${locale}/contact`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: CONTACT_INFO.businessName,
    telephone: CONTACT_INFO.telephone,
    url,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ContactPage locale={locale} useLocalePrefix />
    </>
  );
}

