import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { deleteProduct } from "../../../../../../lib/db/products";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const productId = String(id ?? "").trim();
    if (!productId) {
      return NextResponse.json({ ok: false, error: "Missing product id" }, { status: 400 });
    }

    const outcome = await deleteProduct(productId);
    revalidatePath("/admin/products");
    revalidatePath("/products");

    return NextResponse.json(
      {
        ok: true,
        mode: outcome.mode,
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delete product failed";
    const lower = message.toLowerCase();
    const status = lower.includes("unauthorized")
      ? 401
      : lower.includes("not authorized")
        ? 403
        : 500;

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }
}
