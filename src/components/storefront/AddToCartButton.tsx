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
  const [authRequiredOpen, setAuthRequiredOpen] = useState(false);

  const authRequiredText =
    locale === "th"
      ? {
          title: "เข้าสู่ระบบก่อนสั่งซื้อ",
          message: "ต้องสมัครสมาชิกหรือเข้าสู่ระบบก่อน จึงจะสั่งซื้อสินค้าได้",
          cancel: "ยกเลิก",
          goLogin: "ไปหน้าเข้าสู่ระบบ",
        }
      : locale === "lo"
        ? {
            title: "ເຂົ້າລະບົບກ່ອນສັ່ງຊື້",
            message: "ກະລຸນາສະໝັກສະມາຊິກ ຫຼື ເຂົ້າລະບົບກ່ອນສັ່ງຊື້",
            cancel: "ຍົກເລີກ",
            goLogin: "ໄປໜ້າເຂົ້າລະບົບ",
          }
        : {
            title: "Sign in before ordering",
            message: "Please register or sign in before ordering products.",
            cancel: "Cancel",
            goLogin: "Go to sign in",
          };

  async function handleAddToCart() {
    if (disabled) {
      return;
    }

    setBusy(true);
    setNotice(null);

    try {
      const session = await ensureCustomerSession();
      if (!session.authorized) {
        setAuthRequiredOpen(true);
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
      {authRequiredOpen ? (
        <div className="fixed inset-0 z-[85] grid place-items-center bg-slate-950/55 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(2,6,23,0.35)]">
            <p className="text-base font-bold text-slate-900">{authRequiredText.title}</p>
            <p className="mt-2 text-sm text-slate-600">{authRequiredText.message}</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAuthRequiredOpen(false)}
                className="app-press h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700"
              >
                {authRequiredText.cancel}
              </button>
              <button
                type="button"
                onClick={() => {
                  window.location.href = withLocale(locale, "/auth/login");
                }}
                className="app-press h-11 rounded-xl border border-amber-400/80 bg-amber-50 px-3 text-sm font-semibold text-amber-700"
              >
                {authRequiredText.goLogin}
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
