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
      price: "ราคา",
      stock: "คงเหลือ",
      out: "หมดสต็อก",
      item: "รายการ",
      selectAll: "เลือกทั้งหมด",
      selected: "เลือกแล้ว",
      qty: "จำนวน",
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
    price: "Price",
    stock: "Stock",
    out: "Out of stock",
    item: "items",
    selectAll: "Select all",
    selected: "Selected",
    qty: "Qty",
  };
}

function route(locale: AppLocale, path: string, useLocalePrefix: boolean) {
  if (!useLocalePrefix && locale === "th") return path;
  return `/${locale}${path}`;
}

function inSelected(selected: string[], productId: string) {
  return selected.includes(productId);
}

export function CartPageClient({ locale, useLocalePrefix = false }: CartPageClientProps) {
  const t = text(locale);
  const [items, setItems] = useState<PublicCartItem[]>(() => getPublicCart());
  const [selectedIds, setSelectedIds] = useState<string[]>(() => getPublicCart().map((item) => item.productId));

  const selectedItems = useMemo(
    () => items.filter((item) => inSelected(selectedIds, item.productId)),
    [items, selectedIds],
  );
  const total = useMemo(() => sumPublicCart(selectedItems), [selectedItems]);
  const totalQty = useMemo(() => selectedItems.reduce((sum, item) => sum + item.qty, 0), [selectedItems]);
  const allSelected = items.length > 0 && selectedIds.length === items.length;

  function changeQty(productId: string, nextQty: number) {
    setItems(updatePublicCartItemQty(productId, nextQty));
  }

  function removeItem(productId: string) {
    setItems(removePublicCartItem(productId));
    setSelectedIds((prev) => prev.filter((id) => id !== productId));
  }

  function toggleSelected(productId: string) {
    setSelectedIds((prev) => {
      if (prev.includes(productId)) {
        return prev.filter((id) => id !== productId);
      }
      return [...prev, productId];
    });
  }

  function toggleAll() {
    if (allSelected) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(items.map((item) => item.productId));
  }

  const productsPath = route(locale, "/products", useLocalePrefix);
  const checkoutPath = route(locale, "/checkout", useLocalePrefix);
  const checkoutHref = (() => {
    const params = new URLSearchParams();
    if (selectedIds.length > 0) {
      params.set("selected", selectedIds.join(","));
    }
    const qs = params.toString();
    return qs ? `${checkoutPath}?${qs}` : checkoutPath;
  })();

  return (
    <main className="min-h-screen bg-[#f4f6fb] pb-40 text-slate-900 md:pb-16">
      <section className="mx-auto w-full max-w-7xl px-3 py-4 md:px-4 md:py-8">
        <header className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">{t.title}</h1>
          <p className="mt-1 text-sm text-slate-600">{t.subtitle}</p>
        </header>

        {items.length === 0 ? (
          <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-lg font-semibold text-slate-900">{t.emptyTitle}</p>
            <p className="mt-2 text-sm text-slate-600">{t.emptyDesc}</p>
            <Link
              href={productsPath}
                    className="mt-4 inline-flex rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100"
            >
              {t.browse}
            </Link>
          </section>
        ) : (
          <>
            <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
              <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-4 w-4 accent-amber-500" />
                {t.selectAll}
              </label>
              <p className="text-xs text-slate-500">
                {t.selected} {selectedIds.length}/{items.length}
              </p>
            </div>

            <section className="mt-3 space-y-3 md:hidden">
              {items.map((item) => {
                const lineTotal = item.price * item.qty;
                const outOfStock = item.stock <= 0;
                const detailPath = route(locale, `/products/${item.slug}`, useLocalePrefix);
                const checked = inSelected(selectedIds, item.productId);

                return (
                  <article key={item.productId} className="tap-ripple app-press rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSelected(item.productId)}
                        className="mt-1 h-4 w-4 shrink-0 accent-amber-500"
                        aria-label={item.title}
                      />
                      <Link href={detailPath} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                        {item.coverUrl ? (
                          <Image src={item.coverUrl} alt={item.title} fill sizes="96px" className="object-cover" />
                        ) : (
                          <div className="grid h-full place-items-center text-xs text-slate-500">No Image</div>
                        )}
                      </Link>

                      <div className="min-w-0 flex-1">
                        <Link href={detailPath} className="line-clamp-2 text-sm font-semibold text-slate-800 hover:text-amber-600">
                          {item.title}
                        </Link>
                        <p className="mt-1 text-base font-extrabold text-amber-600">THB {item.price.toLocaleString()}</p>
                        <p className={`mt-1 text-xs ${outOfStock ? "text-rose-600" : "text-slate-500"}`}>
                          {outOfStock ? t.out : `${t.stock}: ${item.stock}`}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(item.productId)}
                        aria-label={t.remove}
                        className="app-press grid h-8 w-8 shrink-0 place-items-center rounded-full border border-rose-200 bg-rose-50 text-rose-600"
                      >
                        <span className="text-sm leading-none">x</span>
                      </button>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 p-1">
                        <button
                          type="button"
                          onClick={() => changeQty(item.productId, item.qty - 1)}
                          className="app-press grid h-10 w-10 place-items-center rounded-md bg-white text-xl font-semibold text-slate-800 shadow-sm"
                        >
                          -
                        </button>
                        <span className="min-w-10 px-2 text-center text-base font-semibold text-slate-800">{item.qty}</span>
                        <button
                          type="button"
                          onClick={() => changeQty(item.productId, item.qty + 1)}
                          disabled={outOfStock || item.qty >= item.stock}
                          className="app-press grid h-10 w-10 place-items-center rounded-md bg-white text-xl font-semibold text-slate-800 shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          +
                        </button>
                      </div>

                      <p className="text-sm font-bold text-slate-700">THB {lineTotal.toLocaleString()}</p>
                    </div>
                  </article>
                );
              })}
            </section>

            <section className="mt-4 hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">{t.item}</th>
                    <th className="px-4 py-3 text-left font-semibold">{t.price}</th>
                    <th className="px-4 py-3 text-left font-semibold">{t.qty}</th>
                    <th className="px-4 py-3 text-left font-semibold">{t.total}</th>
                    <th className="px-4 py-3 text-left font-semibold">{t.remove}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const checked = inSelected(selectedIds, item.productId);
                    const outOfStock = item.stock <= 0;
                    const detailPath = route(locale, `/products/${item.slug}`, useLocalePrefix);
                    return (
                      <tr key={item.productId} className="border-t border-slate-200 align-top">
                        <td className="px-4 py-3">
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleSelected(item.productId)}
                              className="mt-1 h-4 w-4 accent-amber-500"
                              aria-label={item.title}
                            />
                            <Link href={detailPath} className="relative h-16 w-16 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                              {item.coverUrl ? (
                                <Image src={item.coverUrl} alt={item.title} fill sizes="64px" className="object-cover" />
                              ) : (
                                <div className="grid h-full place-items-center text-[10px] text-slate-500">No Image</div>
                              )}
                            </Link>
                            <div className="min-w-0">
                              <Link href={detailPath} className="line-clamp-2 font-semibold text-slate-800 hover:text-amber-600">
                                {item.title}
                              </Link>
                              <p className={`mt-1 text-xs ${outOfStock ? "text-rose-600" : "text-slate-500"}`}>
                                {outOfStock ? t.out : `${t.stock}: ${item.stock}`}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-amber-600">THB {item.price.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 p-1">
                            <button
                              type="button"
                              onClick={() => changeQty(item.productId, item.qty - 1)}
                              className="app-press grid h-9 w-9 place-items-center rounded-md bg-white text-lg font-semibold text-slate-800"
                            >
                              -
                            </button>
                            <span className="min-w-10 px-2 text-center font-semibold">{item.qty}</span>
                            <button
                              type="button"
                              onClick={() => changeQty(item.productId, item.qty + 1)}
                              disabled={outOfStock || item.qty >= item.stock}
                              className="app-press grid h-9 w-9 place-items-center rounded-md bg-white text-lg font-semibold text-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-700">THB {(item.price * item.qty).toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => removeItem(item.productId)}
                            className="app-press rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-600"
                          >
                            {t.remove}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          </>
        )}
      </section>

      {items.length > 0 ? (
        <div className="fixed inset-x-0 bottom-16 z-30 border-t border-slate-200 bg-white/95 p-3 backdrop-blur md:bottom-0 md:p-4">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{t.total}</p>
              <p className="truncate text-lg font-bold text-amber-600">THB {total.toLocaleString()}</p>
              <p className="text-xs text-slate-500">
                {totalQty} {t.item}
              </p>
            </div>
            <Link
              href={checkoutHref}
              className={`app-press inline-flex h-12 items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 px-5 text-sm font-semibold text-zinc-950 shadow-[0_10px_24px_rgba(245,158,11,0.35)] transition active:scale-95 ${
                selectedItems.length === 0 ? "pointer-events-none opacity-45" : ""
              }`}
            >
              {t.checkout}
            </Link>
          </div>
        </div>
      ) : null}
    </main>
  );
}
