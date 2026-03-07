import { notFound, redirect } from "next/navigation";

import type { AppLocale } from "../../../lib/i18n/locale";
import { MarketingLandingPage } from "../../components/storefront/MarketingLandingPage";

export const dynamic = "force-dynamic";

type LocalizedHomeProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function normalizeLocale(input: string): AppLocale | null {
  if (input === "th" || input === "en" || input === "lo") {
    return input;
  }
  return null;
}

export default async function LocalizedHomePage({ params, searchParams }: LocalizedHomeProps) {
  const resolvedParams = await params;
  const locale = normalizeLocale(resolvedParams.locale.toLowerCase());
  if (!locale) {
    notFound();
  }
  const query = await searchParams;
  const hasCallbackCode = typeof query.code === "string" && query.code.trim() !== "";
  if (hasCallbackCode) {
    const target = new URL("/auth/callback", "http://localhost");
    for (const [key, value] of Object.entries(query)) {
      if (typeof value === "string") {
        target.searchParams.set(key, value);
      } else if (Array.isArray(value)) {
        for (const item of value) {
          target.searchParams.append(key, item);
        }
      }
    }
    if (!target.searchParams.has("intent")) {
      target.searchParams.set("intent", "customer");
    }
    if (!target.searchParams.has("locale")) {
      target.searchParams.set("locale", locale);
    }
    redirect(`${target.pathname}${target.search}`);
  }

  return <MarketingLandingPage locale={locale} useLocalePrefix showOuterFrame={false} showTopNav={false} />;
}



