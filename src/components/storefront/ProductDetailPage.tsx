import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

import type { PublicProductDetail } from "../../../lib/db/publicProducts";
import type { AppLocale } from "../../../lib/i18n/locale";
import { AddToCartButton } from "./AddToCartButton";
import { ProductGallerySlider } from "./ProductGallerySlider";

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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_#5c3f00_0%,_#1a1200_30%,_#090909_68%)] text-amber-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
      <section className="mx-auto w-full max-w-7xl px-4 py-8 pb-28 md:px-6 md:py-12 md:pb-12">
        <Link
          href={basePath}
          className="inline-flex items-center rounded-lg border border-amber-500/35 bg-black/45 px-3 py-2 text-xs font-semibold text-amber-200 transition hover:bg-black/65"
        >
          {t.back}
        </Link>

        <article className="mt-4 grid gap-5 rounded-3xl border border-amber-500/30 bg-black/55 p-4 shadow-[0_22px_70px_rgba(0,0,0,0.45)] md:grid-cols-[1.1fr_1fr] md:p-6">
          <div className="space-y-3">
            <div className="md:hidden">
              <ProductGallerySlider
                title={title}
                images={product.images.map((item) => ({ id: item.id, url: item.url }))}
                fallbackUrl={product.cover_url}
              />
            </div>

            <div className="hidden md:block space-y-3">
              <div className="overflow-hidden rounded-2xl border border-amber-500/25 bg-zinc-900">
                {product.cover_url ? (
                  <div className="relative h-[430px] w-full">
                    <Image src={product.cover_url} alt={title} fill sizes="50vw" className="object-cover" priority />
                  </div>
                ) : (
                  <div className="grid h-[430px] place-items-center text-sm text-amber-100/55">No Image</div>
                )}
              </div>

              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.18em] text-amber-300/80">{t.gallery}</p>
                <div className="grid grid-cols-5 gap-2">
                  {product.images.map((image) => (
                    <div key={image.id} className="overflow-hidden rounded-lg border border-amber-600/25 bg-zinc-900 transition hover:border-amber-400/45">
                      <div className="relative h-20 w-full">
                        <Image src={image.url} alt={title} fill sizes="120px" className="object-cover" loading="lazy" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h1 className="font-heading text-2xl font-semibold text-amber-300 md:text-3xl">{title}</h1>
            <div className="grid gap-2 rounded-2xl border border-amber-600/30 bg-black/45 p-4 text-sm">
              <p>
                <span className="text-amber-200/80">{t.sku}: </span>
                <span className="font-semibold">{product.sku}</span>
              </p>
              <p>
                <span className="text-amber-200/80">{t.price}: </span>
                <span className="text-lg font-bold text-amber-300">THB {product.price.toLocaleString()}</span>
              </p>
              <p>
                <span className="text-amber-200/80">{t.stock}: </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    isOutOfStock ? "bg-rose-500/20 text-rose-200" : "bg-emerald-500/20 text-emerald-200"
                  }`}
                >
                  {isOutOfStock ? t.outOfStock : `${product.stock}`}
                </span>
              </p>
            </div>

            <div className="rounded-2xl border border-amber-600/30 bg-black/45 p-4">
              <p className="mb-2 text-xs uppercase tracking-[0.18em] text-amber-300/85">{t.desc}</p>
              <p className="whitespace-pre-wrap text-sm text-amber-100/90">{description}</p>
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
                className="bg-gradient-to-r from-amber-500 to-yellow-400 text-zinc-950 shadow-[0_10px_24px_rgba(245,158,11,0.35)] active:scale-95"
              />
            </div>
          </div>
        </article>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-amber-500/35 bg-black/90 p-3 backdrop-blur md:hidden">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-3">
          <div className="min-w-0 flex-1 rounded-xl border border-amber-500/25 bg-black/50 px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.14em] text-amber-200/70">{t.price}</p>
            <p className="truncate text-sm font-bold text-amber-300">THB {product.price.toLocaleString()}</p>
          </div>
          <div className="flex-[1.4]">
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
              className="w-full bg-gradient-to-r from-amber-500 to-yellow-400 text-zinc-950 shadow-[0_10px_24px_rgba(245,158,11,0.35)] active:scale-95"
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
