import type { Metadata } from "next";

import { CONTACT_INFO } from "../../../data/contact";
import { getAppLocale } from "../../../lib/i18n/locale";
import { ContactPage } from "../../components/storefront/ContactPage";

export const revalidate = 300;

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://kittisap.vercel.app";
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getAppLocale();

  if (locale === "en") {
    return {
      title: "Contact | Kittisap",
      description: "Contact Kittisap via phone, LINE, map, and business hours.",
      alternates: {
        canonical: "/en/contact",
        languages: {
          th: "/contact",
          en: "/en/contact",
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
      },
    },
  };
}

export default async function PublicContactPage() {
  const locale = await getAppLocale();
  const root = siteUrl();
  const url = locale === "en" ? `${root}/en/contact` : `${root}/contact`;

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
      <ContactPage locale={locale} />
    </>
  );
}
