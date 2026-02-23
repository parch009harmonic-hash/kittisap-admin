import "server-only";

import { z } from "zod";

import { getSupabaseServiceRoleClient } from "../supabase/service";

const ValidateCouponInputSchema = z.object({
  code: z.string().trim().min(1).max(64),
  subtotal: z.coerce.number().min(0),
});

export type ValidateCouponInput = z.infer<typeof ValidateCouponInputSchema>;

export type CouponValidationResult = {
  valid: boolean;
  code: string;
  discountType: "percent" | "fixed" | null;
  discountValue: number;
  discountAmount: number;
  subtotal: number;
  totalAfterDiscount: number;
  message: string;
};

export class CouponValidationError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "CouponValidationError";
    this.status = status;
    this.code = code;
  }
}

function asNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function asOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toDiscountType(value: unknown): "percent" | "fixed" | null {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (["percent", "percentage", "pct"].includes(normalized)) return "percent";
  if (["fixed", "amount", "flat"].includes(normalized)) return "fixed";
  return null;
}

function isCouponActive(row: Record<string, unknown>) {
  const status = String(row.status ?? "").trim().toLowerCase();
  if (status === "active") {
    return true;
  }
  if (status && status !== "active") {
    return false;
  }

  if (typeof row.is_active === "boolean") {
    return row.is_active;
  }

  return true;
}

function isCouponExpired(row: Record<string, unknown>, now: Date) {
  const expiryCandidates = [row.expires_at, row.expired_at, row.end_at, row.expire_at];
  for (const candidate of expiryCandidates) {
    const raw = asOptionalString(candidate);
    if (!raw) continue;
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime()) && d.getTime() < now.getTime()) {
      return true;
    }
  }
  return false;
}

function getCouponCode(row: Record<string, unknown>) {
  return asOptionalString(row.code) ?? asOptionalString(row.coupon_code) ?? "";
}

function computeDiscount(subtotal: number, type: "percent" | "fixed", value: number) {
  if (subtotal <= 0 || value <= 0) {
    return 0;
  }

  const raw = type === "percent" ? subtotal * (value / 100) : value;
  const clamped = Math.max(0, Math.min(raw, subtotal));
  return Number(clamped.toFixed(2));
}

async function findCouponByCode(code: string): Promise<Record<string, unknown> | null> {
  const supabase = getSupabaseServiceRoleClient();

  const byCode = await supabase
    .from("coupons")
    .select("*")
    .eq("code", code)
    .limit(1)
    .maybeSingle();

  if (!byCode.error && byCode.data) {
    return byCode.data as Record<string, unknown>;
  }

  const codeColumnMissing = String(byCode.error?.message ?? "").toLowerCase().includes("column")
    && String(byCode.error?.message ?? "").toLowerCase().includes("code");

  if (codeColumnMissing) {
    const byCouponCode = await supabase
      .from("coupons")
      .select("*")
      .eq("coupon_code", code)
      .limit(1)
      .maybeSingle();

    if (byCouponCode.error) {
      throw new CouponValidationError(500, "COUPON_VALIDATE_FAILED", byCouponCode.error.message);
    }
    return (byCouponCode.data as Record<string, unknown> | null) ?? null;
  }

  if (byCode.error) {
    throw new CouponValidationError(500, "COUPON_VALIDATE_FAILED", byCode.error.message);
  }

  return null;
}

export async function validatePublicCoupon(input: ValidateCouponInput): Promise<CouponValidationResult> {
  const parsed = ValidateCouponInputSchema.parse(input);
  const normalizedCode = parsed.code.toUpperCase();
  const subtotal = Number(parsed.subtotal.toFixed(2));
  const now = new Date();

  const row = await findCouponByCode(normalizedCode);
  if (!row) {
    return {
      valid: false,
      code: normalizedCode,
      discountType: null,
      discountValue: 0,
      discountAmount: 0,
      subtotal,
      totalAfterDiscount: subtotal,
      message: "Coupon code is invalid or unavailable.",
    };
  }

  if (!isCouponActive(row)) {
    return {
      valid: false,
      code: normalizedCode,
      discountType: null,
      discountValue: 0,
      discountAmount: 0,
      subtotal,
      totalAfterDiscount: subtotal,
      message: "Coupon code is invalid or unavailable.",
    };
  }

  if (isCouponExpired(row, now)) {
    return {
      valid: false,
      code: normalizedCode,
      discountType: null,
      discountValue: 0,
      discountAmount: 0,
      subtotal,
      totalAfterDiscount: subtotal,
      message: "Coupon code is invalid or unavailable.",
    };
  }

  const minSpend = asNumber(row.min_spend ?? row.minimum_spend);
  if (subtotal < minSpend) {
    return {
      valid: false,
      code: normalizedCode,
      discountType: null,
      discountValue: 0,
      discountAmount: 0,
      subtotal,
      totalAfterDiscount: subtotal,
      message: `Minimum spend is THB ${minSpend.toLocaleString()}.`,
    };
  }

  const type = toDiscountType(row.discount_type ?? row.type);
  const value = asNumber(row.discount_value ?? row.value);

  if (!type || value <= 0) {
    throw new CouponValidationError(500, "COUPON_CONFIG_INVALID", "Coupon discount configuration is invalid.");
  }

  const discountAmount = computeDiscount(subtotal, type, value);
  const totalAfterDiscount = Number((subtotal - discountAmount).toFixed(2));

  return {
    valid: true,
    code: getCouponCode(row) || normalizedCode,
    discountType: type,
    discountValue: value,
    discountAmount,
    subtotal,
    totalAfterDiscount,
    message: "Coupon applied successfully.",
  };
}
