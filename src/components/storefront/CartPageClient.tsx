"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import type { AppLocale } from "../../../lib/i18n/locale";
import {
  getPublicCart,
  removePublicCartItem,
  sumPublicCart,
  type PublicCartItem,
  updatePublicCartItemQty,
} from "../../../lib/storefront/cart";

type CartPageClientProps = {
  locale: AppLocale;
  useLocalePrefix?: boolean;
};

function text(locale: AppLocale) {
  if (locale === "th") {
    return {
      title: "ตะกร้าสินค้า",
      subtitle: "ตรวจสอบรายการก่อนชำระเงิน",
      emptyTitle: "ยังไม่มีสินค้าในตะกร้า",
      emptyDesc: "เลือกสินค้าแล้วกดเพิ่มลงตะกร้าจากหน้าสินค้า",
      browse: "เลือกสินค้าต่อ",
      total: "รวมทั้งหมด",
      checkout: "ไปชำระเงิน",
      remove: "ลบ",
      stock: "คงเหลือ",
      out: "หมดสต็อก",
      item: "รายการ",
    };
  }

  return {
    title: "Cart",
    subtitle: "Review your items before checkout",
    emptyTitle: "Your cart is empty",
    emptyDesc: "Add products from product pages to start checkout.",
    browse: "Browse products",
    total: "Total",
    checkout: "Checkout",
    remove: "Remove",
    stock: "Stock",
    out: "Out of stock",
    item: "item",
  };
}

function route(locale: AppLocale, path: string, useLocalePrefix: boolean) {
  if (!useLocalePrefix && locale === "th") return path;
  return `/${locale}${path}`;
}

export function CartPageClient({ locale, useLocalePrefix = false }: CartPageClientProps) {
  const t = text(locale);
  const [items, setItems] = useState<PublicCartItem[]>(() => getPublicCart());

  const total = useMemo(() => sumPublicCart(items), [items]);
  const totalQty = useMemo(() => items.reduce((sum, item) => sum + item.qty, 0), [items]);

  function changeQty(productId: string, nextQty: number) {
    setItems(updatePublicCartItemQty(productId, nextQty));
  }

  function removeItem(productId: string) {
    setItems(removePublicCartItem(productId));
  }

  const productsPath = route(locale, "/products", useLocalePrefix);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_#5c3f00_0%,_#1a1200_30%,_#090909_68%)] pb-36 text-amber-50 md:pb-28">
      <section className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-10">
        <header className="rounded-3xl border border-amber-500/35 bg-black/55 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
          <h1 className="text-3xl font-semibold text-amber-300 md:text-4xl">{t.title}</h1>
          <p className="mt-2 text-sm text-amber-100/75 md:text-base">{t.subtitle}</p>
        </header>

        {items.length === 0 ? (
          <section className="mt-5 rounded-2xl border border-amber-500/30 bg-black/45 p-8 text-center">
            <p className="text-lg font-semibold text-amber-200">{t.emptyTitle}</p>
            <p className="mt-2 text-sm text-amber-100/70">{t.emptyDesc}</p>
            <Link
              href={productsPath}
              className="mt-4 inline-flex rounded-xl border border-amber-400/60 bg-amber-400/15 px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-300/25"
            >
              {t.browse}
            </Link>
          </section>
        ) : (
          <section className="mt-5 space-y-3">
            {items.map((item) => {
              const lineTotal = item.price * item.qty;
              const outOfStock = item.stock <= 0;
              const detailPath = route(locale, `/products/${item.slug}`, useLocalePrefix);

              return (
                <article
                  key={item.productId}
                  className="rounded-2xl border border-amber-500/30 bg-black/45 p-3 shadow-[0_10px_35px_rgba(0,0,0,0.3)]"
                >
                  <div className="flex gap-3">
                    <Link href={detailPath} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-amber-500/25 bg-zinc-900">
                      {item.coverUrl ? (
                        <Image src={item.coverUrl} alt={item.title} fill sizes="96px" className="object-cover" />
                      ) : (
                        <div className="grid h-full place-items-center text-xs text-amber-100/55">No Image</div>
                      )}
                    </Link>

                    <div className="min-w-0 flex-1">
                      <Link href={detailPath} className="line-clamp-2 text-sm font-semibold text-amber-100 hover:text-amber-300">
                        {item.title}
                      </Link>
                      <p className="mt-1 text-sm font-bold text-amber-300">THB {item.price.toLocaleString()}</p>
                      <p className={`mt-1 text-xs ${outOfStock ? "text-rose-300" : "text-amber-100/70"}`}>
                        {outOfStock ? t.out : `${t.stock}: ${item.stock}`}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(item.productId)}
                      aria-label={t.remove}
                      className="grid h-10 w-10 place-items-center rounded-full border border-rose-400/45 bg-rose-400/10 text-rose-200 hover:bg-rose-400/20"
                    >
                      <span className="text-lg leading-none">x</span>
                    </button>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="inline-flex items-center rounded-xl border border-amber-500/35 bg-black/50 p-1">
                      <button
                        type="button"
                        onClick={() => changeQty(item.productId, item.qty - 1)}
                        className="grid h-11 w-11 place-items-center rounded-lg bg-black/65 text-xl font-semibold text-amber-100 transition hover:bg-black"
                      >
                        -
                      </button>
                      <span className="min-w-12 px-3 text-center text-base font-semibold text-amber-100">{item.qty}</span>
                      <button
                        type="button"
                        onClick={() => changeQty(item.productId, item.qty + 1)}
                        disabled={outOfStock || item.qty >= item.stock}
                        className="grid h-11 w-11 place-items-center rounded-lg bg-black/65 text-xl font-semibold text-amber-100 transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        +
                      </button>
                    </div>

                    <p className="text-sm font-semibold text-amber-200">THB {lineTotal.toLocaleString()}</p>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </section>

      {items.length > 0 ? (
        <div className="fixed inset-x-0 bottom-16 z-30 border-t border-amber-500/35 bg-black/90 p-3 backdrop-blur md:bottom-0 md:p-4">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.14em] text-amber-200/70">{t.total}</p>
              <p className="truncate text-lg font-bold text-amber-300">THB {total.toLocaleString()}</p>
              <p className="text-xs text-amber-100/65">
                {totalQty} {t.item}
              </p>
            </div>
            <Link
              href="/checkout"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 px-5 text-sm font-semibold text-zinc-950 shadow-[0_10px_24px_rgba(245,158,11,0.35)] transition active:scale-95"
            >
              {t.checkout}
            </Link>
          </div>
        </div>
      ) : null}
    </main>
  );
}
