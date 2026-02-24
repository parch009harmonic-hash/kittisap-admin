import Link from "next/link";
import dynamic from "next/dynamic";
import type { Metadata } from "next";

import type { PublicProductDetail } from "../../../lib/db/publicProducts";
import type { AppLocale } from "../../../lib/i18n/locale";
import { AddToCartButton } from "./AddToCartButton";

const ProductGallerySlider = dynamic(
  () => import("./ProductGallerySlider").then((mod) => mod.ProductGallerySlider),
  {
    loading: () => <div className="aspect-square rounded-2xl bg-slate-100 shimmer-skeleton" />,
  },
);

type ProductDetailPageProps = {
  locale: AppLocale;
  product: PublicProductDetail;
};

function text(locale: AppLocale) {
  if (locale === "th") {
    return {
      back: "กลับหน้าสินค้า",
      stock: "คงเหลือ",
      outOfStock: "Out of stock",
      sku: "รหัสสินค้า",
      price: "ราคา",
      desc: "รายละเอียด",
      noDesc: "ยังไม่มีรายละเอียดสินค้า",
      gallery: "แกลเลอรีสินค้า",
      addToCart: "เพิ่มลงตะกร้า",
      adding: "กำลังเพิ่ม...",
    };
  }
  return {
    back: "Back to products",
    stock: "Stock",
    outOfStock: "Out of stock",
    sku: "SKU",
    price: "Price",
    desc: "Description",
    noDesc: "No product description available.",
    gallery: "Product gallery",
    addToCart: "Add to cart",
    adding: "Adding...",
  };
}

export function ProductDetailPage({ locale, product }: ProductDetailPageProps) {
  const t = text(locale);
  const title = locale === "en" ? product.title_en || product.title_th : product.title_th;
  const description =
    locale === "en"
      ? product.description_en || product.description_th || t.noDesc
      : product.description_th || product.description_en || t.noDesc;
  const isOutOfStock = product.stock <= 0;
  const basePath = locale === "th" ? "/products" : `/${locale}/products`;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const productUrl = new URL(locale === "en" ? `/en/products/${product.slug}` : `/products/${product.slug}`, siteUrl).toString();
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: title,
    description,
    sku: product.sku,
    image: product.cover_url ? [product.cover_url] : undefined,
    url: productUrl,
    offers: {
      "@type": "Offer",
      priceCurrency: "THB",
      price: String(product.price),
      availability: isOutOfStock ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
      url: productUrl,
    },
  };

  return (
    <main className="min-h-screen bg-[#f4f6fb] text-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
      <section className="mx-auto w-full max-w-7xl px-3 py-4 pb-28 md:px-4 md:py-8 md:pb-10">
        <Link
          href={basePath}
          className="app-press inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          {t.back}
        </Link>

        <article className="tap-ripple mt-3 grid gap-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:mt-4 md:grid-cols-[1.05fr_1fr] md:gap-6 md:p-5">
          <div className="space-y-3">
            <ProductGallerySlider
              title={title}
              images={product.images.map((item) => ({ id: item.id, url: item.url }))}
              fallbackUrl={product.cover_url}
            />
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{t.gallery}</p>
          </div>

          <div className="space-y-4 md:pt-1">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 md:text-3xl">{title}</h1>

            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-amber-700/80">{t.price}</p>
              <p className="mt-1 text-3xl font-extrabold text-amber-600 md:text-4xl">THB {product.price.toLocaleString()}</p>
            </div>

            <div className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p>
                <span className="text-slate-500">{t.sku}: </span>
                <span className="font-semibold text-slate-900">{product.sku}</span>
              </p>
              <p>
                <span className="text-slate-500">{t.stock}: </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    isOutOfStock ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {isOutOfStock ? t.outOfStock : `${product.stock}`}
                </span>
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <details open className="group">
                <summary className="cursor-pointer list-none text-sm font-semibold uppercase tracking-[0.14em] text-slate-700">
                  {t.desc}
                </summary>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{description}</p>
              </details>
            </div>

            <div className="hidden md:block">
              <AddToCartButton
                locale={locale}
                productId={product.id}
                productSlug={product.slug}
                productTitle={title}
                productPrice={product.price}
                productStock={product.stock}
                productCoverUrl={product.cover_url}
                disabled={isOutOfStock}
                label={t.addToCart}
                busyLabel={t.adding}
                showNotice={false}
                className="bg-gradient-to-r from-amber-500 to-yellow-400 text-zinc-950 shadow-[0_10px_24px_rgba(245,158,11,0.35)]"
              />
            </div>
          </div>
        </article>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 backdrop-blur md:hidden">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-3">
          <div className="min-w-0 flex-1 rounded-lg bg-amber-50 px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.14em] text-amber-700/80">{t.price}</p>
            <p className="truncate text-base font-bold text-amber-600">THB {product.price.toLocaleString()}</p>
          </div>
          <div className="flex-[1.2]">
            <AddToCartButton
              locale={locale}
              productId={product.id}
              productSlug={product.slug}
              productTitle={title}
              productPrice={product.price}
              productStock={product.stock}
              productCoverUrl={product.cover_url}
              disabled={isOutOfStock}
              label={t.addToCart}
              busyLabel={t.adding}
              showNotice={false}
              className="w-full bg-gradient-to-r from-amber-500 to-yellow-400 text-zinc-950 shadow-[0_10px_24px_rgba(245,158,11,0.35)]"
            />
          </div>
        </div>
      </div>
    </main>
  );
}

export function buildProductMetadata(input: {
  locale: AppLocale;
  slug: string;
  product: PublicProductDetail;
}): Metadata {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const { locale, slug, product } = input;
  const title = locale === "en" ? product.title_en || product.title_th : product.title_th;
  const description =
    locale === "en"
      ? product.description_en || product.description_th || title
      : product.description_th || product.description_en || title;

  const thPath = `/products/${slug}`;
  const enPath = `/en/products/${slug}`;
  const canonicalPath = locale === "en" ? enPath : thPath;
  const canonical = new URL(canonicalPath, siteUrl).toString();

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        th: new URL(thPath, siteUrl).toString(),
        en: new URL(enPath, siteUrl).toString(),
      },
    },
    openGraph: {
      title,
      description,
      url: canonical,
      images: product.cover_url ? [{ url: product.cover_url }] : undefined,
      type: "website",
      locale: locale === "en" ? "en_US" : "th_TH",
    },
  };
}
