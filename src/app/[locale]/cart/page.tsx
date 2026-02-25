import { notFound } from "next/navigation";

import type { AppLocale } from "../../../../lib/i18n/locale";
import { CartPageClient } from "../../../components/storefront/CartPageClient";

type LocalizedCartPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function LocalizedCartPage({ params }: LocalizedCartPageProps) {
  const locale = (await params).locale.toLowerCase();
  if (locale !== "th" && locale !== "en" && locale !== "lo") {
    notFound();
  }

  return <CartPageClient locale={locale as AppLocale} useLocalePrefix />;
}


