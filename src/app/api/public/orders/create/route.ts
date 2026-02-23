import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { PublicOrderError, createPublicOrder } from "../../../../../../lib/db/public-orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function mapAuthStatus(message: string) {
  if (message === "Unauthorized") return 401;
  if (message === "Network unstable") return 503;
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const data = await createPublicOrder(payload);
    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { ok: false, code: "INVALID_REQUEST", error: error.issues.map((item) => item.message).join(", ") },
        { status: 400 },
      );
    }

    if (error instanceof PublicOrderError) {
      return NextResponse.json({ ok: false, code: error.code, error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Failed to create order";
    const auth = mapAuthStatus(message);
    if (auth) {
      return NextResponse.json({ ok: false, code: auth === 401 ? "AUTH_REQUIRED" : "NETWORK_UNSTABLE", error: message }, { status: auth });
    }

    return NextResponse.json({ ok: false, code: "ORDER_CREATE_FAILED", error: message }, { status: 500 });
  }
}
