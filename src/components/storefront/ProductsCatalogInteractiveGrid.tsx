"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

import type { AppLocale } from "../../../lib/i18n/locale";
import { StorefrontProductQuickViewModal, type StorefrontQuickViewItem } from "./StorefrontProductQuickViewModal";

type CatalogItem = StorefrontQuickViewItem;

type CatalogText = {
  stock: string;
  outOfStockLabel: string;
  addToCart: string;
  goToCart: string;
  orderNow: string;
  overview: string;
  viewDetails: string;
  close: string;
  noImage: string;
};

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
        <StorefrontProductQuickViewModal
          open
          item={activeItem}
          locale={locale}
          useLocalePrefix={useLocalePrefix}
          eyebrow={text.overview}
          text={{
            close: text.close,
            noImage: text.noImage,
            stock: text.stock,
            outOfStockLabel: text.outOfStockLabel,
            addToCart: text.addToCart,
            goToCart: text.goToCart,
            orderNow: text.orderNow,
            viewDetails: text.viewDetails,
          }}
          onClose={() => setActiveId(null)}
        />
      ) : null}
    </>
  );
}
