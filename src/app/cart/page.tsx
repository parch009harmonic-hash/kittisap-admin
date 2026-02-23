import { getAppLocale } from "../../../lib/i18n/locale";
import { CartPageClient } from "../../components/storefront/CartPageClient";

export default async function CartPage() {
  const locale = await getAppLocale();
  return <CartPageClient locale={locale} />;
}

