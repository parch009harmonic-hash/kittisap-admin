"use client";

import { useState } from "react";

import type { AppLocale } from "../../../lib/i18n/locale";
import { addPublicCartItem } from "../../../lib/storefront/cart";

type AddToCartButtonProps = {
  locale: AppLocale;
  productId: string;
  productSlug: string;
  productTitle: string;
  productPrice: number;
  productStock: number;
  productCoverUrl: string | null;
  disabled?: boolean;
  className?: string;
  containerClassName?: string;
  showNotice?: boolean;
  label?: string;
  busyLabel?: string;
};

export function AddToCartButton({
  locale,
  productId,
  productSlug,
  productTitle,
  productPrice,
  productStock,
  productCoverUrl,
  disabled = false,
  className = "",
  containerClassName = "",
  showNotice = true,
  label,
  busyLabel,
}: AddToCartButtonProps) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleAddToCart() {
    if (disabled) {
      return;
    }

    setBusy(true);
    setNotice(null);

    try {
      addPublicCartItem({
        productId,
        slug: productSlug,
        title: productTitle,
        price: productPrice,
        stock: productStock,
        coverUrl: productCoverUrl,
        qty: 1,
      });
      setNotice(locale === "th" ? "เพิ่มสินค้าในตะกร้าแล้ว" : "Item added to cart.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`space-y-2 ${containerClassName}`}>
      <button
        type="button"
        onClick={() => void handleAddToCart()}
        disabled={disabled || busy}
        className={`w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition ${className} ${
          disabled
            ? "cursor-not-allowed bg-zinc-700 text-zinc-300"
            : "bg-amber-400/25 text-amber-100 hover:bg-amber-300/35"
        }`}
      >
        {busy ? busyLabel ?? (locale === "th" ? "กำลังเพิ่ม..." : "Adding...") : label ?? "Add to Cart"}
      </button>
      {showNotice && notice ? <p className="text-xs text-amber-200/80">{notice}</p> : null}
    </div>
  );
}
