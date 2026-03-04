"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

import type { AppLocale } from "../../../lib/i18n/locale";
import { StorefrontProductQuickViewModal, type StorefrontQuickViewItem } from "./StorefrontProductQuickViewModal";

type ShowroomItem = StorefrontQuickViewItem;

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
      featured: "สินค้าแนะนำ",
    };
  }

  if (locale === "lo") {
    return {
      close: "ປິດ",
      detail: "ເບິ່ງລາຍລະອຽດສິນຄ້າ",
      orderNow: "ສັ່ງຊື້ທັນທີ",
      addToCart: "ໃສ່ກະຕ່າ",
      goToCart: "ໄປກະຕ່າ",
      outOfStock: "ສິນຄ້າໝົດ",
      stock: "ສະຕັອກ",
      noImage: "ບໍ່ມີຮູບ",
      featured: "ສິນຄ້າແນະນຳ",
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
              <p className="line-clamp-2 min-h-[2.5rem] text-sm font-extrabold tracking-tight text-slate-100">{item.title}</p>
              <p className="mt-1 text-xs text-slate-300/70">
                THB {item.price.toLocaleString()} | {t.stock} {item.stock}
              </p>
            </div>
          </button>
        ))}
      </div>

      {activeItem ? (
        <StorefrontProductQuickViewModal
          open
          item={activeItem}
          locale={locale}
          useLocalePrefix={useLocalePrefix}
          eyebrow={t.featured}
          text={{
            close: t.close,
            noImage: t.noImage,
            stock: t.stock,
            outOfStockLabel: t.outOfStock,
            addToCart: t.addToCart,
            goToCart: t.goToCart,
            orderNow: t.orderNow,
            viewDetails: t.detail,
          }}
          onClose={() => setActiveId(null)}
        />
      ) : null}
    </>
  );
}
