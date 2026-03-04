import { NextResponse } from "next/server";

import { deleteAdminOrder } from "../../../../../../lib/db/admin-orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type OrderRouteProps = {
  params: Promise<{ order_no: string }>;
};

function mapStatus(message: string) {
  if (message === "Unauthorized") return 401;
  if (message === "Network unstable") return 503;
  if (message.includes("not found")) return 404;
  if (message.includes("must be kept for history")) return 409;
  return 500;
}

export async function DELETE(_request: Request, { params }: OrderRouteProps) {
  try {
    const { order_no } = await params;
    const data = await deleteAdminOrder(order_no);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete order";
    return NextResponse.json({ ok: false, code: "ORDER_DELETE_FAILED", error: message }, { status: mapStatus(message) });
  }
}
