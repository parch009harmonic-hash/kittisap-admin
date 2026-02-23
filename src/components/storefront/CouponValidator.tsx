"use client";

import { FormEvent, useMemo, useState } from "react";

type CouponValidationData = {
  valid: boolean;
  code: string;
  discountType: "percent" | "fixed" | null;
  discountValue: number;
  discountAmount: number;
  subtotal: number;
  totalAfterDiscount: number;
  message: string;
};

type CouponValidatorProps = {
  locale: "th" | "en";
};

function text(locale: "th" | "en") {
  if (locale === "th") {
    return {
      title: "ตรวจสอบคูปอง",
      subtitle: "กรอกรหัสคูปองและยอดสั่งซื้อ เพื่อเช็กส่วนลดที่ใช้งานได้",
      code: "รหัสคูปอง",
      subtotal: "ยอดคำสั่งซื้อ (THB)",
      submit: "ตรวจสอบคูปอง",
      hint: "ระบบตรวจสอบเฉพาะรหัสที่กรอกเท่านั้น และไม่เปิดเผยรายการคูปองทั้งหมด",
      howTo: "วิธีใช้คูปอง",
      step1: "คัดลอกรหัสคูปองจากกิจกรรมหรือช่องทางที่ได้รับ",
      step2: "กรอกรหัสและยอดสั่งซื้อ เพื่อเช็กเงื่อนไขขั้นต่ำ",
      step3: "หากผ่านเงื่อนไข ระบบจะแสดงยอดลดที่สามารถใช้ได้ทันที",
      activeCoupon: "คูปองที่กำลังใช้งาน",
      discount: "ส่วนลด",
      total: "ยอดสุทธิ",
      validating: "กำลังตรวจสอบ...",
      invalidInput: "กรุณากรอกรหัสคูปองและยอดสั่งซื้อให้ถูกต้อง",
      failed: "ตรวจสอบคูปองไม่สำเร็จ กรุณาลองใหม่",
    };
  }

  return {
    title: "Coupon Validation",
    subtitle: "Enter coupon code and subtotal to check eligible discount.",
    code: "Coupon code",
    subtotal: "Subtotal (THB)",
    submit: "Validate Coupon",
    hint: "Validation is code-based only. The system does not expose all coupon records.",
    howTo: "How to use",
    step1: "Copy your coupon code from campaign channels.",
    step2: "Enter code and subtotal to verify minimum spend.",
    step3: "If eligible, your discount and net total are shown instantly.",
    activeCoupon: "Active coupon",
    discount: "Discount",
    total: "Net total",
    validating: "Validating...",
    invalidInput: "Please provide a valid coupon code and subtotal.",
    failed: "Unable to validate coupon. Please try again.",
  };
}

function formatDiscount(locale: "th" | "en", item: CouponValidationData) {
  if (item.discountType === "percent") {
    return locale === "th" ? `${item.discountValue}%` : `${item.discountValue}%`;
  }
  if (item.discountType === "fixed") {
    return `THB ${item.discountValue.toLocaleString()}`;
  }
  return "-";
}

export function CouponValidator({ locale }: CouponValidatorProps) {
  const t = useMemo(() => text(locale), [locale]);
  const [code, setCode] = useState("");
  const [subtotal, setSubtotal] = useState("50000");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CouponValidationData | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedCode = code.trim().toUpperCase();
    const numericSubtotal = Number(subtotal);

    if (!normalizedCode || !Number.isFinite(numericSubtotal) || numericSubtotal < 0) {
      setError(t.invalidInput);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/public/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: normalizedCode, subtotal: numericSubtotal }),
      });

      const payload = (await response.json()) as { ok?: boolean; error?: string; data?: CouponValidationData };

      if (!response.ok || !payload.ok || !payload.data) {
        setError(payload.error ?? t.failed);
        setResult(null);
        return;
      }

      setResult(payload.data);
    } catch {
      setError(t.failed);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
      <article className="rounded-2xl border border-amber-500/30 bg-black/45 p-5">
        <h2 className="text-xl font-semibold text-amber-300">{t.title}</h2>
        <p className="mt-2 text-sm text-amber-100/75">{t.subtitle}</p>
        <p className="mt-2 text-xs text-amber-100/60">{t.hint}</p>

        <form className="mt-4 grid gap-3 sm:grid-cols-[1fr_180px_auto]" onSubmit={onSubmit}>
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder={t.code}
            className="rounded-xl border border-amber-500/35 bg-black/50 px-3 py-2 text-sm text-amber-50 outline-none focus:border-amber-300"
            autoCapitalize="characters"
          />
          <input
            value={subtotal}
            onChange={(event) => setSubtotal(event.target.value)}
            type="number"
            min={0}
            step="0.01"
            placeholder={t.subtotal}
            className="rounded-xl border border-amber-500/35 bg-black/50 px-3 py-2 text-sm text-amber-50 outline-none focus:border-amber-300"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl border border-amber-400/60 bg-amber-400/20 px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-300/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? t.validating : t.submit}
          </button>
        </form>

        {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}

        {result ? (
          <div className={`mt-4 rounded-xl border p-4 ${result.valid ? "border-emerald-400/30 bg-emerald-500/10" : "border-amber-500/30 bg-black/35"}`}>
            <p className="text-sm font-semibold text-amber-100">{result.message}</p>
            {result.valid ? (
              <dl className="mt-2 grid gap-1 text-sm text-amber-100/90">
                <div className="flex justify-between gap-4">
                  <dt>{t.activeCoupon}</dt>
                  <dd className="font-semibold">{result.code}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>{t.discount}</dt>
                  <dd className="font-semibold">{formatDiscount(locale, result)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>{t.total}</dt>
                  <dd className="font-semibold">THB {result.totalAfterDiscount.toLocaleString()}</dd>
                </div>
              </dl>
            ) : null}
          </div>
        ) : null}
      </article>

      <article className="rounded-2xl border border-amber-500/25 bg-black/45 p-5">
        <h3 className="text-lg font-semibold text-amber-300">{t.howTo}</h3>
        <ol className="mt-3 space-y-2 text-sm text-amber-100/85">
          <li>1. {t.step1}</li>
          <li>2. {t.step2}</li>
          <li>3. {t.step3}</li>
        </ol>
      </article>
    </section>
  );
}
