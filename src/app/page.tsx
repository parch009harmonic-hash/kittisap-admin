import { getAppLocale } from "../../lib/i18n/locale";
import { MarketingLandingPage } from "../components/storefront/MarketingLandingPage";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function appendSearchParams(basePath: string, searchParams: Record<string, string | string[] | undefined>) {
  const url = new URL(basePath, "http://localhost");
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") {
      url.searchParams.set(key, value);
    } else if (Array.isArray(value)) {
      for (const item of value) {
        url.searchParams.append(key, item);
      }
    }
  }
  return `${url.pathname}${url.search}`;
}

export default async function Home({ searchParams }: HomeProps) {
  const query = await searchParams;
  const hasCallbackCode = typeof query.code === "string" && query.code.trim() !== "";
  if (hasCallbackCode) {
    if (!("intent" in query)) {
      query.intent = "customer";
    }
    if (!("locale" in query)) {
      query.locale = "th";
    }
    redirect(appendSearchParams("/auth/callback", query));
  }

  const locale = await getAppLocale();
  return <MarketingLandingPage locale={locale} />;
}

