"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { AppLocale } from "../../../lib/i18n/locale";
import { OrderNowButton } from "./OrderNowButton";

type CatalogItem = {
  id: string;
  slug: string;
  title: string;
  description: string;
  price: number;
  stock: number;
  coverUrl: string | null;
};

type CatalogText = {
  stock: string;
  outOfStockLabel: string;
  orderNow: string;
  viewDetails: string;
  close: string;
  noImage: string;
};

function withLocale(locale: AppLocale, path: string, useLocalePrefix: boolean) {
  if (!useLocalePrefix && locale === "th") return path;
  return `/${locale}${path}`;
}

export function ProductsCatalogInteractiveGrid({
  items,
  locale,
  useLocalePrefix,
  text,
}: {
  items: CatalogItem[];
  locale: AppLocale;
  useLocalePrefix: boolean;
  text: CatalogText;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeItem = useMemo(() => items.find((item) => item.id === activeId) ?? null, [activeId, items]);

  useEffect(() => {
    if (!activeItem) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveId(null);
      }
    };

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [activeItem]);

  return (
    <>
      <section className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-4">
        {items.map((item) => {
          const isOut = item.stock <= 0;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveId(item.id)}
              className="tap-ripple app-press overflow-hidden rounded-lg border border-slate-200 bg-white text-left shadow-sm transition active:scale-[0.985] md:hover:-translate-y-1 md:hover:shadow-md"
            >
              <div className="relative aspect-square bg-slate-100">
                {item.coverUrl ? (
                  <Image
                    src={item.coverUrl}
                    alt={item.title}
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className="object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="grid h-full place-items-center text-[11px] text-slate-500">{text.noImage}</div>
                )}
              </div>

              <div className="space-y-2 p-2.5 md:p-3">
                <p className="line-clamp-2 min-h-[2.5rem] text-xs font-semibold text-slate-800 md:text-sm">{item.title}</p>
                <p className="text-sm font-extrabold text-amber-600 md:text-base">THB {item.price.toLocaleString()}</p>
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-semibold leading-none ${
                      isOut ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {isOut ? text.outOfStockLabel : `${text.stock} ${item.stock}`}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </section>

      {activeItem ? (
        <div className="fixed inset-0 z-[90] grid place-items-center p-4">
          <button type="button" className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setActiveId(null)} aria-label={text.close} />
          <article className="relative z-[91] w-full max-w-3xl overflow-hidden rounded-3xl border border-white/20 bg-[linear-gradient(160deg,#0f172a,#020617)] shadow-[0_28px_80px_rgba(0,0,0,0.55)]">
            <button
              type="button"
              aria-label={text.close}
              onClick={() => setActiveId(null)}
              className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-500/40 bg-slate-900/70 text-slate-200 hover:bg-slate-800"
            >
              x
            </button>
            <div className="grid gap-0 md:grid-cols-[1.05fr_0.95fr]">
              <div className="relative min-h-[260px] md:min-h-[430px]">
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
                  <div className="grid h-full place-items-center text-slate-300">{text.noImage}</div>
                )}
              </div>

              <div className="flex flex-col p-6 md:min-h-[430px]">
                <p className="text-xs uppercase tracking-[0.18em] text-amber-300">{locale === "th" ? "รายละเอียดสินค้า" : "Product Overview"}</p>
                <h3 className="mt-2 text-3xl font-black tracking-tight text-slate-50">{activeItem.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-300">{activeItem.description}</p>

                <div className="mt-5 rounded-2xl border border-slate-500/30 bg-white/5 p-4">
                  <p className="text-2xl font-black text-emerald-300">THB {activeItem.price.toLocaleString()}</p>
                  <p className="mt-1 text-sm text-slate-300">
                    {text.stock}: {activeItem.stock}
                  </p>
                </div>

                <div className="mt-auto space-y-3 pt-6">
                  <OrderNowButton
                    locale={locale}
                    productId={activeItem.id}
                    disabled={activeItem.stock <= 0}
                    label={activeItem.stock > 0 ? text.orderNow : text.outOfStockLabel}
                    className={`inline-flex w-full items-center justify-center rounded-2xl px-5 py-3 text-sm font-extrabold tracking-[0.08em] transition ${
                      activeItem.stock > 0
                        ? "border border-amber-300/45 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-200 text-slate-900 shadow-[0_12px_30px_rgba(245,158,11,0.35)] hover:translate-y-[-1px]"
                        : "cursor-not-allowed border border-slate-500/40 bg-slate-700/40 text-slate-300"
                    }`}
                  />

                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={withLocale(locale, `/products/${activeItem.slug}`, useLocalePrefix)}
                      className="inline-flex rounded-full border border-amber-400/40 bg-amber-500/20 px-4 py-2 text-xs font-bold text-amber-200 hover:bg-amber-500/30"
                    >
                      {text.viewDetails}
                    </Link>
                    <button
                      type="button"
                      onClick={() => setActiveId(null)}
                      className="inline-flex rounded-full border border-slate-500/40 bg-white/5 px-4 py-2 text-xs font-bold text-slate-100 hover:bg-white/10"
                    >
                      {text.close}
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
