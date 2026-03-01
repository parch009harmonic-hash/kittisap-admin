"use client";

import { useState } from "react";
import type { AppLocale } from "../../../lib/i18n/locale";

type OrderNowButtonProps = {
  productId: string;
  disabled?: boolean;
  className?: string;
  label: string;
  locale: AppLocale;
};

function withLocale(locale: AppLocale, path: string) {
  if (locale === "th") {
    return path;
  }
  return `/${locale}${path}`;
}

type ProfilePayload = {
  ok?: boolean;
  data?: {
    full_name?: string;
    phone?: string;
  } | null;
};

type CreateOrderPayload = {
  ok?: boolean;
  error?: string;
  data?: {
    order_no?: string;
    promptpay_url?: string;
    payment_mode?: "promptpay" | "bank_qr";
    qr_image_url?: string;
    bank_name?: string;
    bank_account_no?: string;
    bank_account_name?: string;
  };
};

async function loadProfile() {
  const response = await fetch("/api/customer/profile", { cache: "no-store" });
  if (response.status === 401) {
    return { unauthorized: true as const, profile: null };
  }

  const payload = (await response.json()) as ProfilePayload;
  if (!response.ok || !payload.ok) {
    throw new Error("Failed to load customer profile");
  }

  return {
    unauthorized: false as const,
    profile: {
      fullName: payload.data?.full_name?.trim() ?? "",
      phone: payload.data?.phone?.trim() ?? "",
    },
  };
}

export function OrderNowButton({ productId, disabled = false, className = "", label, locale }: OrderNowButtonProps) {
  const [loading, setLoading] = useState(false);

  const onClick = async () => {
    if (disabled || loading) {
      return;
    }

    setLoading(true);
    try {
      const profileResult = await loadProfile();
      if (profileResult.unauthorized) {
        window.location.href = withLocale(locale, "/auth/login");
        return;
      }

      const fullName = profileResult.profile.fullName;
      const phone = profileResult.profile.phone;

      if (!fullName || !phone) {
        const msg =
          locale === "th"
            ? "กรุณาอัปเดตชื่อและเบอร์โทรในหน้า Account ก่อนสั่งซื้อ"
            : locale === "lo"
              ? "ກະລຸນາອັບເດດຊື່ ແລະ ເບີໂທ ກ່ອນສັ່ງຊື້"
              : "Please complete your name and phone in Account before ordering.";
        alert(msg);
        window.location.href = withLocale(locale, "/account");
        return;
      }

      const response = await fetch("/api/public/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ product_id: productId, qty: 1 }],
          customer: {
            full_name: fullName,
            phone,
          },
        }),
      });

      const payload = (await response.json()) as CreateOrderPayload;
      if (!response.ok || !payload.ok || !payload.data?.order_no) {
        throw new Error(payload.error ?? "Failed to create order");
      }

      const params = new URLSearchParams();
      params.set("order_no", payload.data.order_no);
      if (payload.data.promptpay_url) params.set("promptpay_url", payload.data.promptpay_url);
      if (payload.data.payment_mode) params.set("payment_mode", payload.data.payment_mode);
      if (payload.data.qr_image_url) params.set("qr_image_url", payload.data.qr_image_url);
      if (payload.data.bank_name) params.set("bank_name", payload.data.bank_name);
      if (payload.data.bank_account_no) params.set("bank_account_no", payload.data.bank_account_no);
      if (payload.data.bank_account_name) params.set("bank_account_name", payload.data.bank_account_name);
      window.location.href = `/checkout?${params.toString()}`;
    } catch (error) {
      const raw = error instanceof Error ? error.message : "Failed to create order";
      const message = raw.toLowerCase().includes("product not found")
        ? locale === "th"
          ? "ไม่พบสินค้านี้ในระบบล่าสุด กรุณารีเฟรชหน้าแล้วลองใหม่"
          : locale === "lo"
            ? "ບໍ່ພົບສິນຄ້ານີ້ໃນລະບົບລ່າສຸດ ກະລຸນາໂຫຼດໜ້າໃໝ່ແລ້ວລອງອີກຄັ້ງ"
            : "This product is no longer available. Please refresh and try again."
        : raw;
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={className}
    >
      {loading ? (locale === "th" ? "กำลังสร้าง..." : locale === "lo" ? "ກຳລັງສ້າງ..." : "Creating...") : label}
    </button>
  );
}
