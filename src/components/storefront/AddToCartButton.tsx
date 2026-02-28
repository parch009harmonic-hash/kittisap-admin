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

function withLocale(locale: AppLocale, path: string) {
  if (locale === "th") return path;
  return `/${locale}${path}`;
}

async function ensureCustomerSession() {
  const response = await fetch("/api/customer/profile", { cache: "no-store" });
  if (response.status === 401) {
    return { authorized: false as const };
  }
  if (!response.ok) {
    throw new Error("Failed to validate customer session");
  }
  return { authorized: true as const };
}

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
      const session = await ensureCustomerSession();
      if (!session.authorized) {
        alert(
          locale === "th"
            ? "ต้องสมัครสมาชิกหรือเข้าสู่ระบบก่อน จึงจะสั่งซื้อสินค้าได้"
            : locale === "lo"
              ? "ກະລຸນາສະໝັກສະມາຊິກ ຫຼື ເຂົ້າລະບົບກ່ອນສັ່ງຊື້"
              : "Please register or sign in before ordering products.",
        );
        window.location.href = withLocale(locale, "/auth/login");
        return;
      }

      addPublicCartItem({
        productId,
        slug: productSlug,
        title: productTitle,
        price: productPrice,
        stock: productStock,
        coverUrl: productCoverUrl,
        qty: 1,
      });
      setNotice(
        locale === "th"
          ? "เพิ่มสินค้าในตะกร้าแล้ว"
          : locale === "lo"
            ? "ເພີ່ມສິນຄ້າໃສ່ກະຕ່າແລ້ວ"
            : "Item added to cart.",
      );
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
        className={`app-press w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition ${className} ${
          disabled
            ? "cursor-not-allowed bg-zinc-700 text-zinc-300"
            : "bg-amber-400/25 text-amber-100 hover:bg-amber-300/35"
        }`}
      >
        {busy
          ? busyLabel ?? (locale === "th" ? "กำลังเพิ่ม..." : locale === "lo" ? "ກຳລັງເພີ່ມ..." : "Adding...")
          : label ?? (locale === "lo" ? "ໃສ່ກະຕ່າ" : "Add to Cart")}
      </button>
      {showNotice && notice ? <p className="text-xs text-amber-200/80">{notice}</p> : null}
    </div>
  );
}
