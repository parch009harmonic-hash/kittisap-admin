import type { Metadata } from "next";
import { getAppLocale, type AppLocale } from "../../../../lib/i18n/locale";
import { ProductsCatalogPage } from "../../../components/storefront/ProductsCatalogPage";

type LocalizedProductsPageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function normalizeLocale(input: string): AppLocale | null {
  if (input === "th" || input === "en" || input === "lo") {
    return input;
  }
  return null;
}

type LocalizedProductsPageMetaProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: LocalizedProductsPageMetaProps): Promise<Metadata> {
  const locale = normalizeLocale((await params).locale.toLowerCase());
  if (!locale) {
    return { title: "Not found" };
  }

  if (locale === "en") {
    return {
      title: "Products | Kittisap",
      description: "Browse available products and order online.",
      alternates: {
        canonical: "/en/products",
        languages: { th: "/products", en: "/en/products", lo: "/lo/products" },
      },
    };
  }

  if (locale === "lo") {
    return {
      title: "ສິນຄ້າ | Kittisap",
      description: "ເລືອກເບິ່ງສິນຄ້າທີ່ພ້ອມຈໍາໜ່າຍຈາກລະບົບ",
      alternates: {
        canonical: "/lo/products",
        languages: { th: "/products", en: "/en/products", lo: "/lo/products" },
      },
    };
  }

  return {
    title: "สินค้า | Kittisap",
    description: "เลือกชมสินค้าที่พร้อมจำหน่ายจากระบบ",
    alternates: {
      canonical: "/products",
      languages: { th: "/products", en: "/en/products", lo: "/lo/products" },
    },
  };
}

export default async function LocalizedProductsPage({
  params,
  searchParams,
}: LocalizedProductsPageProps) {
  const raw = (await params).locale.toLowerCase();
  const fallback = await getAppLocale();
  const locale = normalizeLocale(raw) ?? fallback;
  const query = (await searchParams) ?? {};
  return <ProductsCatalogPage locale={locale} searchParams={query} useLocalePrefix />;
}

