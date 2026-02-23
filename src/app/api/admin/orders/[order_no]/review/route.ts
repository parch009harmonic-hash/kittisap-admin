import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { reviewAdminOrderSlip } from "../../../../../../../lib/db/admin-orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReviewRouteProps = {
  params: Promise<{ order_no: string }>;
};

const ReviewPayloadSchema = z.object({
  slipId: z.string().trim().min(1),
  action: z.enum(["approve", "reject"]),
  note: z.string().trim().max(500).optional(),
});

function mapStatus(message: string) {
  if (message === "Unauthorized") return 401;
  if (message === "Network unstable") return 503;
  if (message.includes("not found")) return 404;
  return 500;
}

export async function POST(request: NextRequest, { params }: ReviewRouteProps) {
  try {
    const payload = ReviewPayloadSchema.parse(await request.json());
    const { order_no } = await params;

    const data = await reviewAdminOrderSlip({
      orderNo: order_no,
      slipId: payload.slipId,
      action: payload.action,
      note: payload.note,
    });

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, code: "INVALID_REQUEST", error: error.issues.map((item) => item.message).join(", ") },
        { status: 400 },
      );
    }

    const message = error instanceof Error ? error.message : "Failed to review slip";
    return NextResponse.json({ ok: false, code: "SLIP_REVIEW_FAILED", error: message }, { status: mapStatus(message) });
  }
}
