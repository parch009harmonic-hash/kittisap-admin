"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

import type { AppLocale } from "../../../lib/i18n/locale";
import {
  getPublicCart,
  savePublicCart,
  sumPublicCart,
  type PublicCartItem,
} from "../../../lib/storefront/cart";

type CheckoutClientProps = {
  initialOrderNo: string;
  initialPromptpayUrl: string;
  initialSelectedIds?: string[];
  locale?: AppLocale;
  useLocalePrefix?: boolean;
};

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
  code?: string;
  data?: {
    order_no?: string;
    promptpay_url?: string;
    final_amount?: number;
  };
};

type CouponPayload = {
  ok?: boolean;
  error?: string;
  data?: {
    code: string;
    discount_amount: number;
    final_amount: number;
    discount_type: "percent" | "fixed";
  };
};

function t(locale: AppLocale) {
  if (locale === "th") {
    return {
      title: "Checkout",
      subtitle: "ชำระเงินผ่าน PromptPay และอัปโหลดสลิป",
      cart: "ตะกร้า",
      checkout: "ชำระเงิน",
      paid: "ชำระแล้ว",
      shipping: "Shipping info",
      selectedItems: "Selected items",
      selectAll: "เลือกทั้งหมด",
      selectedCount: "รายการที่เลือก",
      summary: "Order summary",
      coupon: "Coupon apply",
      promptpay: "PromptPay payment",
      fullName: "ชื่อ-นามสกุล",
      phone: "เบอร์โทร",
      note: "หมายเหตุ",
      couponCode: "โค้ดคูปอง",
      applyCoupon: "ใช้คูปอง",
      couponApplied: "ใช้คูปองสำเร็จ",
      createOrder: "สร้างคำสั่งซื้อ",
      creating: "กำลังสร้างคำสั่งซื้อ...",
      orderNo: "เลขออเดอร์",
      amount: "ยอดชำระ",
      copyAmount: "คัดลอกยอด",
      copying: "กำลังคัดลอก...",
      dropSlip: "ลากไฟล์สลิปมาวาง หรือกดเพื่อเลือกไฟล์",
      slipHint: "รองรับ PNG/JPG/WEBP/PDF ไม่เกิน 10MB",
      confirmPayment: "ยืนยันการชำระเงิน",
      uploading: "กำลังอัปโหลด...",
      out: "หมดสต็อก",
      stock: "คงเหลือ",
      item: "รายการ",
      subtotal: "Subtotal",
      payable: "Payable",
      noSelected: "ยังไม่ได้เลือกรายการจากตะกร้า",
      selectFromCart: "กลับไปเลือกสินค้าในตะกร้า",
      successOrder: "สร้างคำสั่งซื้อแล้ว",
      successCopy: "คัดลอกยอดสำเร็จ",
      successSlip: "อัปโหลดสลิปสำเร็จ รอแอดมินตรวจสอบ",
      successCoupon: "ใช้คูปองสำเร็จ",
    };
  }

  return {
    title: "Checkout",
    subtitle: "Pay via PromptPay and upload payment slip.",
    cart: "Cart",
    checkout: "Checkout",
    paid: "Paid",
    shipping: "Shipping info",
    selectedItems: "Selected items",
    selectAll: "Select all",
    selectedCount: "Selected",
    summary: "Order summary",
    coupon: "Coupon apply",
    promptpay: "PromptPay payment",
    fullName: "Full name",
    phone: "Phone",
    note: "Note",
    couponCode: "Coupon code",
    applyCoupon: "Apply coupon",
    couponApplied: "Coupon applied",
    createOrder: "Create order",
    creating: "Creating order...",
    orderNo: "Order no",
    amount: "Amount",
    copyAmount: "Copy amount",
    copying: "Copying...",
    dropSlip: "Drop payment slip here or tap to upload",
    slipHint: "PNG/JPG/WEBP/PDF up to 10MB",
    confirmPayment: "Confirm payment",
    uploading: "Uploading...",
    out: "Out of stock",
    stock: "Stock",
    item: "items",
    subtotal: "Subtotal",
    payable: "Payable",
    noSelected: "No selected items from cart.",
    selectFromCart: "Go back to cart",
    successOrder: "Order created.",
    successCopy: "Amount copied.",
    successSlip: "Slip uploaded. Waiting for review.",
    successCoupon: "Coupon applied.",
  };
}

function route(locale: AppLocale, path: string, useLocalePrefix: boolean) {
  if (!useLocalePrefix && locale === "th") return path;
  return `/${locale}${path}`;
}

function buildQrImageUrl(promptpayUrl: string) {
  const encoded = encodeURIComponent(promptpayUrl);
  return `https://api.qrserver.com/v1/create-qr-code/?size=480x480&data=${encoded}`;
}

function parsePromptpayAmount(promptpayUrl: string) {
  try {
    const parsed = new URL(promptpayUrl);
    const parts = parsed.pathname.split("/").filter(Boolean);
    const last = decodeURIComponent(parts[parts.length - 1] ?? "").replace(/,/g, "");
    const amount = Number(last);
    if (!Number.isFinite(amount) || amount <= 0) {
      return null;
    }
    return amount;
  } catch {
    return null;
  }
}

function humanFileSize(size: number) {
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

async function loadProfile() {
  const response = await fetch("/api/customer/profile", { cache: "no-store" });
  if (!response.ok) {
    return;
  }
  const payload = (await response.json()) as ProfilePayload;
  return {
    fullName: payload.data?.full_name?.trim() ?? "",
    phone: payload.data?.phone?.trim() ?? "",
  };
}

export function CheckoutClient({
  initialOrderNo,
  initialPromptpayUrl,
  initialSelectedIds = [],
  locale = "th",
  useLocalePrefix = false,
}: CheckoutClientProps) {
  const text = t(locale);
  const [cartItems, setCartItems] = useState<PublicCartItem[]>(() => getPublicCart());
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    const cart = getPublicCart();
    const cartIds = cart.map((item) => item.productId);
    const normalized = Array.from(new Set(initialSelectedIds.map((id) => id.trim()).filter(Boolean)));
    if (normalized.length > 0) {
      const allowed = new Set(cartIds);
      return normalized.filter((id) => allowed.has(id));
    }
    return cartIds;
  });

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");

  const [couponInput, setCouponInput] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);

  const [orderNo, setOrderNo] = useState(initialOrderNo);
  const [promptpayUrl, setPromptpayUrl] = useState(initialPromptpayUrl);

  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [copying, setCopying] = useState(false);
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [paidSubmitted, setPaidSubmitted] = useState(false);
  const [createdItems, setCreatedItems] = useState<PublicCartItem[]>([]);

  const selectedItems = useMemo(() => {
    const lookup = new Set(selectedIds);
    return cartItems.filter((item) => lookup.has(item.productId));
  }, [cartItems, selectedIds]);
  const summaryItems = orderNo ? createdItems : selectedItems;
  const summarySubtotal = useMemo(() => sumPublicCart(summaryItems), [summaryItems]);

  const subtotal = useMemo(() => sumPublicCart(selectedItems), [selectedItems]);
  const effectiveDiscount = useMemo(() => Math.min(couponDiscount, subtotal), [couponDiscount, subtotal]);
  const previewPayable = useMemo(() => Math.max(0, subtotal - effectiveDiscount), [subtotal, effectiveDiscount]);
  const qrImageUrl = useMemo(() => (promptpayUrl ? buildQrImageUrl(promptpayUrl) : ""), [promptpayUrl]);
  const payableAmount = useMemo(() => parsePromptpayAmount(promptpayUrl) ?? previewPayable, [promptpayUrl, previewPayable]);

  const canCreateOrder = !orderNo && selectedItems.length > 0 && fullName.trim().length > 0 && phone.trim().length > 0;
  const canSelectItems = !orderNo;
  const allSelected = cartItems.length > 0 && selectedIds.length === cartItems.length;

  useEffect(() => {
    void loadProfile().then((profile) => {
      if (!profile) return;
      setFullName((prev) => prev || profile.fullName);
      setPhone((prev) => prev || profile.phone);
    });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function onApplyCoupon(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!couponInput.trim() || subtotal <= 0 || applyingCoupon) return;

    setApplyingCoupon(true);
    setError(null);

    try {
      const response = await fetch("/api/public/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponInput.trim(), subtotal }),
      });

      const payload = (await response.json()) as CouponPayload;
      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error ?? "Coupon validation failed");
      }

      setCouponCode(payload.data.code);
      setCouponDiscount(payload.data.discount_amount);
      setToast(text.successCoupon);
    } catch (caught) {
      setCouponCode("");
      setCouponDiscount(0);
      setError(caught instanceof Error ? caught.message : "Coupon validation failed");
    } finally {
      setApplyingCoupon(false);
    }
  }

  async function onCreateOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canCreateOrder || creating) return;

    setCreating(true);
    setError(null);

    try {
      const response = await fetch("/api/public/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: selectedItems.map((item) => ({ product_id: item.productId, qty: item.qty })),
          customer: {
            full_name: fullName.trim(),
            phone: phone.trim(),
            note: note.trim() || undefined,
          },
          coupon: couponCode || undefined,
        }),
      });

      const payload = (await response.json()) as CreateOrderPayload;
      if (!response.ok || !payload.ok || !payload.data?.order_no || !payload.data?.promptpay_url) {
        throw new Error(payload.error ?? "Failed to create order");
      }

      setOrderNo(payload.data.order_no);
      setPromptpayUrl(payload.data.promptpay_url);
      setCreatedItems(selectedItems);
      setToast(text.successOrder);

      const selectedLookup = new Set(selectedItems.map((item) => item.productId));
      const remaining = cartItems.filter((item) => !selectedLookup.has(item.productId));
      savePublicCart(remaining);
      setCartItems(remaining);
      setSelectedIds((prev) => prev.filter((id) => !selectedLookup.has(id)));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to create order");
    } finally {
      setCreating(false);
    }
  }

  async function onCopyAmount() {
    if (!payableAmount || copying) return;
    setCopying(true);
    setError(null);

    try {
      await navigator.clipboard.writeText(String(payableAmount));
      setToast(text.successCopy);
    } catch {
      setError("Unable to copy amount");
    } finally {
      setCopying(false);
    }
  }

  async function onSubmitSlip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (uploading) return;

    setUploading(true);
    setError(null);

    try {
      if (!orderNo.trim()) throw new Error("Create order first");
      if (!file) throw new Error("Please upload payment slip");

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/api/public/orders/${encodeURIComponent(orderNo.trim())}/slip`, {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Slip upload failed");
      }

      setFile(null);
      setPaidSubmitted(true);
      setToast(text.successSlip);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Slip upload failed");
    } finally {
      setUploading(false);
    }
  }

  const cartPath = route(locale, "/cart", useLocalePrefix);

  function toggleItem(productId: string) {
    if (!canSelectItems) return;
    setSelectedIds((prev) => (prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]));
  }

  function toggleAll() {
    if (!canSelectItems) return;
    if (allSelected) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(cartItems.map((item) => item.productId));
  }

  return (
    <main className="min-h-screen bg-[#f4f6fb] text-slate-900">
      {toast ? (
        <div className="fixed right-3 top-20 z-50 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 shadow-sm">
          {toast}
        </div>
      ) : null}

      <section className="mx-auto w-full max-w-7xl px-3 py-4 pb-24 md:px-4 md:py-8">
        <header className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{text.title}</h1>
          <p className="mt-1 text-sm text-slate-600">{text.subtitle}</p>
        </header>

        <div className="mt-3 grid grid-cols-3 gap-2 text-xs md:mt-4 md:max-w-xl md:text-sm">
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center font-semibold text-amber-700">1. {text.cart}</div>
          <div className={`rounded-lg border px-3 py-2 text-center font-semibold ${orderNo ? "border-amber-200 bg-amber-50 text-amber-700" : "border-slate-200 bg-white text-slate-600"}`}>
            2. {text.checkout}
          </div>
          <div className={`rounded-lg border px-3 py-2 text-center font-semibold ${paidSubmitted ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-600"}`}>
            3. {text.paid}
          </div>
        </div>

        {selectedItems.length === 0 && !orderNo ? (
          <section className="mt-4 rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm">
            <p className="text-sm text-slate-700">{text.noSelected}</p>
            <Link href={cartPath} className="mt-3 inline-flex rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700">
              {text.selectFromCart}
            </Link>
          </section>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-[1.08fr_0.92fr] lg:gap-6">
            <section className="space-y-4">
              {!orderNo ? (
                <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-base font-semibold text-slate-900 md:text-lg">{text.selectedItems}</h2>
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                      <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-4 w-4 accent-amber-500" />
                      {text.selectAll}
                    </label>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {text.selectedCount}: {selectedIds.length}/{cartItems.length}
                  </p>
                  <div className="mt-3 space-y-2">
                    {cartItems.map((item) => (
                      <label key={item.productId} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.productId)}
                          onChange={() => toggleItem(item.productId)}
                          className="h-4 w-4 accent-amber-500"
                        />
                        <span className="line-clamp-1 flex-1 text-sm text-slate-700">{item.title}</span>
                        <span className="text-xs font-semibold text-amber-600">x{item.qty}</span>
                      </label>
                    ))}
                  </div>
                </article>
              ) : null}

              {!orderNo ? (
                <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
                  <h2 className="text-base font-semibold text-slate-900 md:text-lg">{text.shipping}</h2>
                  <form className="mt-3 space-y-3" onSubmit={onCreateOrder}>
                    <input
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      placeholder={text.fullName}
                      autoComplete="name"
                      className="h-12 w-full rounded-lg border border-slate-300 bg-white px-4 text-base outline-none focus:border-amber-500"
                    />
                    <input
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder={text.phone}
                      autoComplete="tel"
                      inputMode="tel"
                      className="h-12 w-full rounded-lg border border-slate-300 bg-white px-4 text-base outline-none focus:border-amber-500"
                    />
                    <textarea
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      placeholder={text.note}
                      rows={3}
                      className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base outline-none focus:border-amber-500"
                    />
                    <button
                      type="submit"
                      disabled={!canCreateOrder || creating}
                      className="app-press h-12 w-full rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-base font-semibold text-zinc-950 shadow-[0_10px_24px_rgba(245,158,11,0.35)] transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {creating ? text.creating : text.createOrder}
                    </button>
                  </form>
                </article>
              ) : null}

              {!orderNo ? (
                <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
                  <h2 className="text-base font-semibold text-slate-900 md:text-lg">{text.coupon}</h2>
                  <form className="mt-3 flex flex-col gap-2 sm:flex-row" onSubmit={onApplyCoupon}>
                    <input
                      value={couponInput}
                      onChange={(event) => setCouponInput(event.target.value.toUpperCase())}
                      placeholder={text.couponCode}
                      className="h-11 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-amber-500"
                    />
                    <button
                      type="submit"
                      disabled={applyingCoupon || !couponInput.trim()}
                      className="app-press h-11 rounded-lg border border-amber-300 bg-amber-50 px-4 text-sm font-semibold text-amber-700 disabled:opacity-50"
                    >
                      {applyingCoupon ? "..." : text.applyCoupon}
                    </button>
                  </form>
                  {couponCode ? <p className="mt-2 text-xs text-emerald-700">{text.couponApplied}: {couponCode}</p> : null}
                </article>
              ) : null}

              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
                <h2 className="text-base font-semibold text-slate-900 md:text-lg">{text.promptpay}</h2>
                <p className="mt-1 text-sm text-slate-600">
                  {text.orderNo}: <span className="font-semibold text-slate-900">{orderNo || "-"}</span>
                </p>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  {qrImageUrl ? (
                    <div className="relative mx-auto h-60 w-60 max-w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-2 md:h-72 md:w-72">
                      <Image src={qrImageUrl} alt="PromptPay QR" fill sizes="(max-width: 768px) 240px, 288px" className="object-contain" />
                    </div>
                  ) : (
                    <div className="grid h-44 place-items-center rounded-xl border border-slate-200 bg-white text-sm text-slate-500">
                      Create order to show PromptPay QR
                    </div>
                  )}

                  <div className="mt-4 text-center">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{text.amount}</p>
                    <p className="mt-1 text-3xl font-extrabold text-amber-600">THB {payableAmount.toLocaleString()}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => void onCopyAmount()}
                    disabled={copying || payableAmount <= 0}
                    className="app-press mt-3 h-11 w-full rounded-lg border border-amber-300 bg-amber-50 text-sm font-semibold text-amber-700 disabled:opacity-50"
                  >
                    {copying ? text.copying : text.copyAmount}
                  </button>

                  <form className="mt-4 space-y-3" onSubmit={onSubmitSlip}>
                    <label
                      onDragOver={(event) => {
                        event.preventDefault();
                        setDragOver(true);
                      }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={(event) => {
                        event.preventDefault();
                        setDragOver(false);
                        const dropped = event.dataTransfer.files?.[0] ?? null;
                        setFile(dropped);
                      }}
                      className={`tap-ripple block cursor-pointer rounded-xl border-2 border-dashed p-4 text-center transition ${
                        dragOver ? "border-amber-400 bg-amber-50" : "border-slate-300 bg-white"
                      }`}
                    >
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,application/pdf"
                        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                        className="hidden"
                      />
                      <p className="text-sm font-medium text-slate-700">{text.dropSlip}</p>
                      <p className="mt-1 text-xs text-slate-500">{text.slipHint}</p>
                      {file ? <p className="mt-2 text-xs font-semibold text-amber-700">{file.name} ({humanFileSize(file.size)})</p> : null}
                    </label>

                    <button
                      type="submit"
                      disabled={uploading || !orderNo}
                      className="app-press h-12 w-full rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-base font-semibold text-zinc-950 shadow-[0_10px_24px_rgba(245,158,11,0.35)] transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {uploading ? text.uploading : text.confirmPayment}
                    </button>
                  </form>
                </div>
              </article>

              {error ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
            </section>

            <aside>
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:sticky md:top-24 md:p-5">
                <h2 className="text-base font-semibold text-slate-900 md:text-lg">{text.summary}</h2>
                <div className="mt-3 space-y-2">
                  {summaryItems.map((item) => {
                    const outOfStock = item.stock <= 0;
                    return (
                      <div key={item.productId} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                        <p className="line-clamp-1 font-medium text-slate-800">{item.title}</p>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <p className="text-xs text-slate-500">x{item.qty} {outOfStock ? `(${text.out})` : `(${text.stock}: ${item.stock})`}</p>
                          <p className="font-semibold text-slate-800">THB {(item.price * item.qty).toLocaleString()}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 space-y-2 border-t border-slate-200 pt-3 text-sm">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>{text.subtotal}</span>
                    <span>THB {summarySubtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>{text.coupon}</span>
                    <span>- THB {effectiveDiscount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-base font-semibold">
                    <span>{text.payable}</span>
                    <span className="text-amber-600">THB {payableAmount.toLocaleString()}</span>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}
