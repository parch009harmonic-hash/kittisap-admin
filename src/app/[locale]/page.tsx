import { notFound } from "next/navigation";

import type { AppLocale } from "../../../lib/i18n/locale";
import { MarketingLandingPage } from "../../components/storefront/MarketingLandingPage";

export const dynamic = "force-dynamic";

type LocalizedHomeProps = {
  params: Promise<{ locale: string }>;
};

function normalizeLocale(input: string): AppLocale | null {
  if (input === "th" || input === "en" || input === "lo") {
    return input;
  }
  return null;
}

export default async function LocalizedHomePage({ params }: LocalizedHomeProps) {
  const locale = normalizeLocale((await params).locale.toLowerCase());
  if (!locale) {
    notFound();
  }

  return <MarketingLandingPage locale={locale} useLocalePrefix showOuterFrame={false} showTopNav={false} />;
}



