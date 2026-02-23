import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getPublicProductBySlug } from "../../../../../lib/db/publicProducts";
import type { AppLocale } from "../../../../../lib/i18n/locale";
import { ProductDetailPage, buildProductMetadata } from "../../../../components/storefront/ProductDetailPage";

type LocalizedProductSlugPageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

function normalizeLocale(input: string): AppLocale | null {
  if (input === "th" || input === "en") {
    return input;
  }
  return null;
}

export async function generateMetadata({ params }: LocalizedProductSlugPageProps): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = normalizeLocale(rawLocale.toLowerCase());
  if (!locale) {
    return {
      title: "Not found",
      description: "Invalid locale",
    };
  }

  const product = await getPublicProductBySlug(slug);
  if (!product) {
    return {
      title: locale === "en" ? "Product not found" : "ไม่พบสินค้า",
      description: locale === "en" ? "Product not found." : "ไม่พบสินค้าที่ต้องการ",
    };
  }

  return buildProductMetadata({ locale, slug, product });
}

export default async function LocalizedProductSlugPage({ params }: LocalizedProductSlugPageProps) {
  const { locale: rawLocale, slug } = await params;
  const locale = normalizeLocale(rawLocale.toLowerCase());
  if (!locale) {
    notFound();
  }

  const product = await getPublicProductBySlug(slug);
  if (!product) {
    notFound();
  }

  return <ProductDetailPage locale={locale} product={product} />;
}
