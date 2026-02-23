"use client";

import { useState } from "react";

type OrderNowButtonProps = {
  productId: string;
  disabled?: boolean;
  className?: string;
  label: string;
  locale: "th" | "en";
};

function withLocale(locale: "th" | "en", path: string) {
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
      if (!response.ok || !payload.ok || !payload.data?.order_no || !payload.data?.promptpay_url) {
        throw new Error(payload.error ?? "Failed to create order");
      }

      const params = new URLSearchParams();
      params.set("order_no", payload.data.order_no);
      params.set("promptpay_url", payload.data.promptpay_url);
      window.location.href = `/checkout?${params.toString()}`;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create order";
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
      {loading ? (locale === "th" ? "กำลังสร้าง..." : "Creating...") : label}
    </button>
  );
}
