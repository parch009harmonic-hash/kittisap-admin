"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import type { AppLocale } from "../../../lib/i18n/locale";
import { AddToCartButton } from "./AddToCartButton";
import { OrderNowButton } from "./OrderNowButton";

type ShowroomItem = {
  id: string;
  slug: string;
  title: string;
  price: number;
  stock: number;
  coverUrl: string | null;
  description: string | null;
};

function withLocale(locale: AppLocale, path: string, useLocalePrefix: boolean) {
  if (!useLocalePrefix && locale === "th") return path;
  return `/${locale}${path}`;
}

function labels(locale: AppLocale) {
  if (locale === "th") {
    return {
      close: "ปิด",
      detail: "ดูรายละเอียดสินค้า",
      orderNow: "สั่งซื้อเลย",
      addToCart: "ใส่ตะกร้า",
      goToCart: "ไปตะกร้า",
      outOfStock: "สินค้าหมด",
      stock: "สต็อก",
      noImage: "ไม่มีรูปภาพ",
      emptyDesc: "ไม่มีรายละเอียดเพิ่มเติม",
      featured: "สินค้าแนะนำ",
    };
  }

  if (locale === "lo") {
    return {
      close: "???",
      detail: "???????????????????",
      orderNow: "????????????",
      addToCart: "????????",
      goToCart: "???????",
      outOfStock: "?????????",
      stock: "??????",
      noImage: "????????",
      emptyDesc: "??????????????????????",
      featured: "???????????",
    };
  }

  return {
    close: "Close",
    detail: "View product details",
    orderNow: "Order now",
    addToCart: "Add to cart",
    goToCart: "Go to cart",
    outOfStock: "Out of stock",
    stock: "Stock",
    noImage: "No image",
    emptyDesc: "No additional description",
    featured: "Featured Product",
  };
}

export function FeaturedProductsShowcase({
  items,
  locale,
  useLocalePrefix,
}: {
  items: ShowroomItem[];
  locale: AppLocale;
  useLocalePrefix: boolean;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeItem = useMemo(() => items.find((item) => item.id === activeId) ?? null, [activeId, items]);
  const t = labels(locale);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveId(item.id)}
            className="group tap-ripple app-press overflow-hidden rounded-2xl border border-slate-400/20 bg-gradient-to-b from-slate-900/90 to-slate-950/80 text-left shadow-[0_14px_50px_rgba(0,0,0,0.28)] transition hover:-translate-y-0.5 hover:border-amber-400/40"
          >
            {item.coverUrl ? (
              <div className="relative aspect-[16/10] w-full overflow-hidden">
                <Image
                  src={item.coverUrl}
                  alt={item.title}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw"
                  className="object-cover transition duration-500 group-hover:scale-[1.03]"
                  loading="lazy"
                />
              </div>
            ) : (
              <div className="grid aspect-[16/10] place-items-center bg-[linear-gradient(135deg,rgba(245,158,11,0.22),rgba(59,130,246,0.12))] text-sm text-slate-200">
                {t.noImage}
              </div>
            )}
            <div className="p-4">
              <p className="text-sm font-extrabold tracking-tight text-slate-100">{item.title}</p>
              <p className="mt-1 text-xs text-slate-300/70">THB {item.price.toLocaleString()} | {t.stock} {item.stock}</p>
            </div>
          </button>
        ))}
      </div>

      {activeItem ? (
        <div className="fixed inset-0 z-[90] grid place-items-center p-4">
          <button type="button" aria-label={t.close} onClick={() => setActiveId(null)} className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm" />
          <article className="relative z-[91] w-full max-w-3xl overflow-hidden rounded-3xl border border-white/15 bg-[linear-gradient(160deg,#0f172a,#020617)] shadow-[0_28px_80px_rgba(0,0,0,0.55)]">
            <button
              type="button"
              aria-label={t.close}
              onClick={() => setActiveId(null)}
              className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-500/40 bg-slate-900/70 text-slate-200 hover:bg-slate-800"
            >
              x
            </button>

            <div className="grid gap-0 md:grid-cols-[1.05fr_0.95fr]">
              <div className="relative min-h-[260px] md:min-h-[420px]">
                {activeItem.coverUrl ? (
                  <Image src={activeItem.coverUrl} alt={activeItem.title} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" priority />
                ) : (
                  <div className="grid h-full place-items-center text-slate-300">{t.noImage}</div>
                )}
              </div>

              <div className="flex flex-col p-6 md:min-h-[420px]">
                <p className="text-xs uppercase tracking-[0.18em] text-amber-300">{t.featured}</p>
                <h3 className="mt-2 text-3xl font-black tracking-tight text-slate-50">{activeItem.title}</h3>
                <p className="mt-3 text-sm text-slate-300">{activeItem.description?.trim() || t.emptyDesc}</p>

                <div className="mt-5 rounded-2xl border border-slate-500/30 bg-white/5 p-4">
                  <p className="text-2xl font-black text-emerald-300">THB {activeItem.price.toLocaleString()}</p>
                  <p className="mt-1 text-sm text-slate-300">{t.stock}: {activeItem.stock}</p>
                </div>

                <div className="mt-auto pt-6">
                  <div className="grid grid-cols-2 gap-2">
                    <AddToCartButton
                      locale={locale}
                      productId={activeItem.id}
                      productSlug={activeItem.slug}
                      productTitle={activeItem.title}
                      productPrice={activeItem.price}
                      productStock={activeItem.stock}
                      productCoverUrl={activeItem.coverUrl}
                      disabled={activeItem.stock <= 0}
                      showNotice={false}
                      label={t.addToCart}
                      className="border border-amber-300/45 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-200 text-slate-900 shadow-[0_12px_30px_rgba(245,158,11,0.35)] hover:translate-y-[-1px]"
                    />
                    <Link
                      href={withLocale(locale, "/cart", useLocalePrefix)}
                      className="app-press inline-flex w-full items-center justify-center rounded-xl border border-slate-500/40 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-100 hover:bg-white/10"
                    >
                      {t.goToCart}
                    </Link>
                  </div>

                  <OrderNowButton
                    locale={locale}
                    productId={activeItem.id}
                    disabled={activeItem.stock <= 0}
                    label={activeItem.stock > 0 ? t.orderNow : t.outOfStock}
                    className={`inline-flex w-full items-center justify-center rounded-2xl px-5 py-3 text-sm font-extrabold tracking-[0.08em] transition ${
                      activeItem.stock > 0
                        ? "mt-2 border border-slate-500/40 bg-white/5 text-slate-100 hover:bg-white/10"
                        : "cursor-not-allowed border border-slate-500/40 bg-slate-700/40 text-slate-300"
                    }`}
                  />

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Link
                      href={withLocale(locale, `/products/${activeItem.slug}`, useLocalePrefix)}
                      className="inline-flex rounded-full border border-amber-400/40 bg-amber-500/20 px-4 py-2 text-xs font-bold text-amber-200 hover:bg-amber-500/30"
                    >
                      {t.detail}
                    </Link>
                    <button
                      type="button"
                      onClick={() => setActiveId(null)}
                      className="inline-flex rounded-full border border-slate-500/40 bg-white/5 px-4 py-2 text-xs font-bold text-slate-100 hover:bg-white/10"
                    >
                      {t.close}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </div>
      ) : null}
    </>
  );
}

