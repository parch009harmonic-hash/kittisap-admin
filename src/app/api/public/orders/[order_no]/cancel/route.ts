import { NextRequest, NextResponse } from "next/server";

import { PublicOrderError, cancelPublicOrder } from "../../../../../../../lib/db/public-orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CancelOrderRouteProps = {
  params: Promise<{ order_no: string }>;
};

function mapAuthStatus(message: string) {
  if (message === "Unauthorized") return 401;
  if (message === "Network unstable") return 503;
  return null;
}

export async function POST(_request: NextRequest, { params }: CancelOrderRouteProps) {
  try {
    const { order_no } = await params;
    const data = await cancelPublicOrder(order_no);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    if (error instanceof PublicOrderError) {
      return NextResponse.json({ ok: false, code: error.code, error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Failed to cancel order";
    const auth = mapAuthStatus(message);
    if (auth) {
      return NextResponse.json({ ok: false, code: auth === 401 ? "AUTH_REQUIRED" : "NETWORK_UNSTABLE", error: message }, { status: auth });
    }

    return NextResponse.json({ ok: false, code: "ORDER_CANCEL_FAILED", error: message }, { status: 500 });
  }
}
