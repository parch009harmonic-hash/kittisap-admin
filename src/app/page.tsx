import { getAppLocale } from "../../lib/i18n/locale";
import { MarketingLandingPage } from "../components/storefront/MarketingLandingPage";

export default async function Home() {
  const locale = await getAppLocale();
  return <MarketingLandingPage locale={locale} />;
}
