"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { clearPublicCart, getPublicCart, sumPublicCart, type PublicCartItem } from "../../../lib/storefront/cart";

type CheckoutClientProps = {
  initialOrderNo: string;
  initialPromptpayUrl: string;
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
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
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

export function CheckoutClient({ initialOrderNo, initialPromptpayUrl }: CheckoutClientProps) {
  const [cartItems, setCartItems] = useState<PublicCartItem[]>(() => getPublicCart());

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [coupon, setCoupon] = useState("");

  const [orderNo, setOrderNo] = useState(initialOrderNo);
  const [promptpayUrl, setPromptpayUrl] = useState(initialPromptpayUrl);
  const [file, setFile] = useState<File | null>(null);

  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [copying, setCopying] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void loadProfile().then((profile) => {
      if (!profile) {
        return;
      }
      setFullName((prev) => prev || profile.fullName);
      setPhone((prev) => prev || profile.phone);
    });
  }, []);

  const total = useMemo(() => sumPublicCart(cartItems), [cartItems]);
  const qrImageUrl = useMemo(() => (promptpayUrl ? buildQrImageUrl(promptpayUrl) : ""), [promptpayUrl]);
  const payableAmount = useMemo(() => parsePromptpayAmount(promptpayUrl) ?? total, [promptpayUrl, total]);

  const canCreateOrder = !orderNo && cartItems.length > 0 && fullName.trim().length > 0 && phone.trim().length > 0;

  async function onCreateOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canCreateOrder || creating) {
      return;
    }

    setCreating(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/public/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cartItems.map((item) => ({ product_id: item.productId, qty: item.qty })),
          customer: {
            full_name: fullName.trim(),
            phone: phone.trim(),
            note: note.trim() || undefined,
          },
          coupon: coupon.trim() || undefined,
        }),
      });

      const payload = (await response.json()) as CreateOrderPayload;
      if (!response.ok || !payload.ok || !payload.data?.order_no || !payload.data?.promptpay_url) {
        throw new Error(payload.error ?? "สร้างคำสั่งซื้อไม่สำเร็จ");
      }

      setOrderNo(payload.data.order_no);
      setPromptpayUrl(payload.data.promptpay_url);
      setMessage("สร้างคำสั่งซื้อแล้ว กรุณาชำระเงินและอัปโหลดสลิป");
      clearPublicCart();
      setCartItems([]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "สร้างคำสั่งซื้อไม่สำเร็จ");
    } finally {
      setCreating(false);
    }
  }

  async function onCopyAmount() {
    if (!payableAmount || copying) {
      return;
    }

    setCopying(true);
    setError(null);
    try {
      await navigator.clipboard.writeText(String(payableAmount));
      setMessage("คัดลอกยอดชำระแล้ว");
    } catch {
      setError("ไม่สามารถคัดลอกยอดชำระได้");
    } finally {
      setCopying(false);
    }
  }

  async function onSubmitSlip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setUploading(true);
    setError(null);
    setMessage(null);

    try {
      if (!orderNo.trim()) {
        throw new Error("กรุณาสร้างคำสั่งซื้อก่อนอัปโหลดสลิป");
      }
      if (!file) {
        throw new Error("กรุณาเลือกไฟล์สลิป");
      }

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/api/public/orders/${encodeURIComponent(orderNo.trim())}/slip`, {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "อัปโหลดสลิปไม่สำเร็จ");
      }

      setMessage("อัปโหลดสลิปเรียบร้อยแล้ว ระบบส่งให้แอดมินตรวจสอบแล้ว");
      setFile(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "อัปโหลดสลิปไม่สำเร็จ");
    } finally {
      setUploading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_#5c3f00_0%,_#1a1200_30%,_#090909_68%)] text-amber-50">
      <section className="mx-auto w-full max-w-7xl px-4 py-6 pb-24 md:px-6 md:py-10 md:pb-12">
        <header className="rounded-3xl border border-amber-500/35 bg-black/55 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.45)] md:p-6">
          <h1 className="text-3xl font-semibold text-amber-300 md:text-4xl">Checkout</h1>
          <p className="mt-2 text-sm text-amber-100/75">ชำระเงินผ่าน PromptPay และอัปโหลดสลิปเพื่อยืนยันการชำระ</p>
        </header>

        <div className="mt-4 grid grid-cols-3 gap-2 text-xs md:mt-5 md:max-w-xl md:text-sm">
          <div className={`rounded-xl border px-3 py-2 text-center ${orderNo ? "border-amber-400/60 bg-amber-400/15 text-amber-100" : "border-amber-700/45 bg-black/40 text-amber-100/70"}`}>
            1. Order
          </div>
          <div className={`rounded-xl border px-3 py-2 text-center ${promptpayUrl ? "border-amber-400/60 bg-amber-400/15 text-amber-100" : "border-amber-700/45 bg-black/40 text-amber-100/70"}`}>
            2. PromptPay
          </div>
          <div className={`rounded-xl border px-3 py-2 text-center ${orderNo ? "border-amber-400/60 bg-amber-400/15 text-amber-100" : "border-amber-700/45 bg-black/40 text-amber-100/70"}`}>
            3. Slip
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr] lg:gap-6">
          <section className="space-y-4">
            {!orderNo ? (
              <article className="rounded-2xl border border-amber-500/25 bg-black/45 p-4 md:p-5">
                <h2 className="text-base font-semibold text-amber-300 md:text-lg">Step 1: ยืนยันข้อมูลผู้ซื้อ</h2>
                <form className="mt-3 space-y-3" onSubmit={onCreateOrder}>
                  <input
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="ชื่อ-นามสกุล"
                    autoComplete="name"
                    enterKeyHint="next"
                    className="h-12 w-full rounded-xl border border-amber-500/35 bg-black/50 px-4 text-base text-amber-50 outline-none focus:border-amber-300"
                  />
                  <input
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="เบอร์โทร"
                    autoComplete="tel"
                    inputMode="tel"
                    enterKeyHint="next"
                    className="h-12 w-full rounded-xl border border-amber-500/35 bg-black/50 px-4 text-base text-amber-50 outline-none focus:border-amber-300"
                  />
                  <input
                    value={coupon}
                    onChange={(event) => setCoupon(event.target.value)}
                    placeholder="โค้ดคูปอง (ถ้ามี)"
                    autoCapitalize="characters"
                    enterKeyHint="next"
                    className="h-12 w-full rounded-xl border border-amber-500/35 bg-black/50 px-4 text-base text-amber-50 outline-none focus:border-amber-300"
                  />
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="หมายเหตุ"
                    rows={3}
                    enterKeyHint="done"
                    className="w-full rounded-xl border border-amber-500/35 bg-black/50 px-4 py-3 text-base text-amber-50 outline-none focus:border-amber-300"
                  />

                  <button
                    type="submit"
                    disabled={!canCreateOrder || creating}
                    className="h-12 w-full rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-base font-semibold text-zinc-950 shadow-[0_10px_24px_rgba(245,158,11,0.35)] transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {creating ? "กำลังสร้างคำสั่งซื้อ..." : "สร้างคำสั่งซื้อ"}
                  </button>
                </form>
              </article>
            ) : null}

            <article className="rounded-2xl border border-amber-500/25 bg-black/45 p-4 md:p-5">
              <h2 className="text-base font-semibold text-amber-300 md:text-lg">Step 2: PromptPay</h2>
              <p className="mt-1 text-sm text-amber-100/70">Order No: <span className="font-semibold text-amber-100">{orderNo || "-"}</span></p>

              <div className="mt-4 rounded-2xl border border-amber-500/20 bg-black/40 p-4">
                {qrImageUrl ? (
                  <div className="relative mx-auto h-64 w-64 max-w-full overflow-hidden rounded-xl border border-amber-500/30 bg-white p-2 md:h-72 md:w-72">
                    <Image src={qrImageUrl} alt="PromptPay QR" fill sizes="(max-width: 768px) 256px, 288px" className="object-contain" />
                  </div>
                ) : (
                  <div className="grid h-52 place-items-center rounded-xl border border-amber-500/20 bg-black/35 text-sm text-amber-100/60">
                    สร้างคำสั่งซื้อก่อนเพื่อแสดง QR
                  </div>
                )}

                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-center">
                  <p className="rounded-lg border border-amber-600/35 bg-black/45 px-3 py-2 text-center text-sm text-amber-100">
                    ยอดชำระ: <span className="font-semibold text-amber-300">THB {payableAmount.toLocaleString()}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => void onCopyAmount()}
                    disabled={copying || payableAmount <= 0}
                    className="h-10 rounded-lg border border-amber-400/70 bg-amber-400/20 px-4 text-sm font-semibold text-amber-100 hover:bg-amber-300/30 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {copying ? "กำลังคัดลอก..." : "Copy amount"}
                  </button>
                </div>
              </div>
            </article>

            <article className="rounded-2xl border border-amber-500/25 bg-black/45 p-4 md:p-5">
              <h2 className="text-base font-semibold text-amber-300 md:text-lg">Step 3: Upload slip</h2>
              <form className="mt-3 space-y-3" onSubmit={onSubmitSlip}>
                <label className="block rounded-2xl border border-dashed border-amber-500/40 bg-black/45 p-4">
                  <span className="text-sm text-amber-100/75">เลือกรูปสลิปหรือ PDF (ไม่เกิน 10MB)</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,application/pdf"
                    onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                    className="mt-2 block w-full text-sm text-amber-100 file:mr-3 file:rounded-md file:border-0 file:bg-amber-400/20 file:px-3 file:py-1.5 file:text-amber-100"
                  />
                </label>

                {file ? (
                  <p className="text-xs text-amber-200/80">
                    {file.name} ({humanFileSize(file.size)})
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={uploading || !orderNo}
                  className="h-12 w-full rounded-xl border border-amber-400/70 bg-amber-400/25 text-base font-semibold text-amber-100 hover:bg-amber-300/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {uploading ? "กำลังอัปโหลด..." : "อัปโหลดสลิป"}
                </button>
              </form>
            </article>

            {error ? <p className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
            {message ? <p className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{message}</p> : null}
          </section>

          <aside>
            <details open className="rounded-2xl border border-amber-500/25 bg-black/45 p-4 md:sticky md:top-24">
              <summary className="cursor-pointer list-none text-base font-semibold text-amber-300">Order summary</summary>
              <div className="mt-3 space-y-2">
                {cartItems.length === 0 ? (
                  <p className="text-sm text-amber-100/70">เมื่อสร้างออเดอร์แล้ว ตะกร้าจะถูกล้างอัตโนมัติ</p>
                ) : (
                  cartItems.map((item) => (
                    <div key={item.productId} className="flex items-center justify-between gap-3 rounded-xl border border-amber-700/25 bg-black/35 px-3 py-2 text-sm">
                      <p className="line-clamp-1 flex-1 text-amber-100/85">{item.title} x{item.qty}</p>
                      <p className="font-semibold text-amber-200">THB {(item.price * item.qty).toLocaleString()}</p>
                    </div>
                  ))
                )}
              </div>
              <div className="mt-4 border-t border-amber-700/30 pt-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-amber-100/75">Subtotal</span>
                  <span className="font-semibold text-amber-200">THB {total.toLocaleString()}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-base font-semibold">
                  <span className="text-amber-100">Payable</span>
                  <span className="text-amber-300">THB {payableAmount.toLocaleString()}</span>
                </div>
              </div>
            </details>
          </aside>
        </div>
      </section>
    </main>
  );
}
