"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import type { AppLocale } from "../../../lib/i18n/locale";
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
  if (!useLocalePrefix && locale === "th") {
    return path;
  }
  return `/${locale}${path}`;
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
  const activeItem = useMemo(
    () => items.find((item) => item.id === activeId) ?? null,
    [activeId, items],
  );

  const closeLabel = locale === "th" ? "ปิด" : "Close";
  const detailLabel = locale === "th" ? "ดูรายละเอียดสินค้า" : "View product details";
  const orderNowLabel = locale === "th" ? "สั่งซื้อเลย" : "Order Now";
  const outOfStockLabel = locale === "th" ? "สินค้าหมด" : "Out of stock";
  const stockLabel = locale === "th" ? "สต็อก" : "Stock";
  const noImageLabel = locale === "th" ? "ไม่มีรูปภาพ" : "No image";
  const emptyDescLabel = locale === "th" ? "ไม่มีรายละเอียดเพิ่มเติม" : "No additional description";

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
                {noImageLabel}
              </div>
            )}
            <div className="p-4">
              <p className="text-sm font-extrabold tracking-tight text-slate-100">{item.title}</p>
              <p className="mt-1 text-xs text-slate-300/70">THB {item.price.toLocaleString()} • {stockLabel} {item.stock}</p>
            </div>
          </button>
        ))}
      </div>

      {activeItem ? (
        <div className="fixed inset-0 z-[90] grid place-items-center p-4">
          <button
            type="button"
            aria-label={closeLabel}
            onClick={() => setActiveId(null)}
            className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm"
          />
          <article className="relative z-[91] w-full max-w-3xl overflow-hidden rounded-3xl border border-white/15 bg-[linear-gradient(160deg,#0f172a,#020617)] shadow-[0_28px_80px_rgba(0,0,0,0.55)]">
            <button
              type="button"
              aria-label={closeLabel}
              onClick={() => setActiveId(null)}
              className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-500/40 bg-slate-900/70 text-slate-200 hover:bg-slate-800"
            >
              ✕
            </button>

            <div className="grid gap-0 md:grid-cols-[1.05fr_0.95fr]">
              <div className="relative min-h-[260px] md:min-h-[420px]">
                {activeItem.coverUrl ? (
                  <Image
                    src={activeItem.coverUrl}
                    alt={activeItem.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="grid h-full place-items-center text-slate-300">{noImageLabel}</div>
                )}
              </div>
              <div className="flex flex-col p-6 md:min-h-[420px]">
                <p className="text-xs uppercase tracking-[0.18em] text-amber-300">{locale === "th" ? "สินค้าแนะนำ" : "Featured Product"}</p>
                <h3 className="mt-2 text-3xl font-black tracking-tight text-slate-50">{activeItem.title}</h3>
                <p className="mt-3 text-sm text-slate-300">{activeItem.description?.trim() || emptyDescLabel}</p>
                <div className="mt-5 rounded-2xl border border-slate-500/30 bg-white/5 p-4">
                  <p className="text-2xl font-black text-emerald-300">THB {activeItem.price.toLocaleString()}</p>
                  <p className="mt-1 text-sm text-slate-300">{stockLabel}: {activeItem.stock}</p>
                </div>
                <div className="mt-auto pt-6">
                  <OrderNowButton
                    locale={locale}
                    productId={activeItem.id}
                    disabled={activeItem.stock <= 0}
                    label={activeItem.stock > 0 ? orderNowLabel : outOfStockLabel}
                    className={`inline-flex w-full items-center justify-center rounded-2xl px-5 py-3 text-sm font-extrabold tracking-[0.08em] transition ${
                      activeItem.stock > 0
                        ? "border border-amber-300/45 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-200 text-slate-900 shadow-[0_12px_30px_rgba(245,158,11,0.35)] hover:translate-y-[-1px]"
                        : "cursor-not-allowed border border-slate-500/40 bg-slate-700/40 text-slate-300"
                    }`}
                  />

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Link
                    href={withLocale(locale, `/products/${activeItem.slug}`, useLocalePrefix)}
                    className="inline-flex rounded-full border border-amber-400/40 bg-amber-500/20 px-4 py-2 text-xs font-bold text-amber-200 hover:bg-amber-500/30"
                  >
                    {detailLabel}
                  </Link>
                  <button
                    type="button"
                    onClick={() => setActiveId(null)}
                    className="inline-flex rounded-full border border-slate-500/40 bg-white/5 px-4 py-2 text-xs font-bold text-slate-100 hover:bg-white/10"
                  >
                    {closeLabel}
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
