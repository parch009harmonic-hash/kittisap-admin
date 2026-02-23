import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getPublicProductBySlug } from "../../../../lib/db/publicProducts";
import { getAppLocale } from "../../../../lib/i18n/locale";
import { ProductDetailPage, buildProductMetadata } from "../../../components/storefront/ProductDetailPage";

type ProductSlugPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: ProductSlugPageProps): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getAppLocale();
  const product = await getPublicProductBySlug(slug);
  if (!product) {
    return {
      title: locale === "en" ? "Product not found" : "ไม่พบสินค้า",
      description: locale === "en" ? "Product not found." : "ไม่พบสินค้าที่ต้องการ",
    };
  }
  return buildProductMetadata({ locale, slug, product });
}

export default async function ProductSlugPage({ params }: ProductSlugPageProps) {
  const { slug } = await params;
  const locale = await getAppLocale();
  const product = await getPublicProductBySlug(slug);
  if (!product) {
    notFound();
  }

  return <ProductDetailPage locale={locale} product={product} />;
}
