import { getAppLocale } from "../../../lib/i18n/locale";
import { ProductsCatalogPage } from "../../components/storefront/ProductsCatalogPage";

type ProductsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const locale = await getAppLocale();
  const params = (await searchParams) ?? {};
  return <ProductsCatalogPage locale={locale} searchParams={params} />;
}
