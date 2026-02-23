import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { CouponValidationError, validatePublicCoupon } from "../../../../../../lib/db/public-coupons";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as { code?: string; subtotal?: number };

    const result = await validatePublicCoupon({
      code: payload.code ?? "",
      subtotal: payload.subtotal ?? 0,
    });

    return NextResponse.json({ ok: true, data: result }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { ok: false, code: "INVALID_REQUEST", error: error.issues.map((item) => item.message).join(", ") },
        { status: 400 },
      );
    }

    if (error instanceof CouponValidationError) {
      return NextResponse.json({ ok: false, code: error.code, error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Failed to validate coupon";
    return NextResponse.json({ ok: false, code: "COUPON_VALIDATE_FAILED", error: message }, { status: 500 });
  }
}
