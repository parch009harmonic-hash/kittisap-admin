import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getAdminActor } from "../../../../../../lib/auth/admin";
import { setProductDisplayOrder } from "../../../../../../lib/db/products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ReorderPayloadSchema = z.object({
  orderedIds: z.array(z.string().trim().min(1)).min(1).max(300),
});

function mapStatus(message: string) {
  if (message === "Unauthorized") return 401;
  if (message === "Not authorized to manage users") return 403;
  if (message.includes("missing_sort_order_column")) return 409;
  return 500;
}

function revalidatePublicProductPaths() {
  revalidatePath("/admin/products");
  revalidatePath("/");
  revalidatePath("/th");
  revalidatePath("/en");
  revalidatePath("/lo");
  revalidatePath("/products");
  revalidatePath("/en/products");
  revalidatePath("/lo/products");
  revalidatePath("/promotions");
  revalidatePath("/en/promotions");
  revalidatePath("/lo/promotions");
  revalidatePath("/pricing");
  revalidatePath("/en/pricing");
  revalidatePath("/lo/pricing");
}

export async function POST(request: NextRequest) {
  try {
    const actor = await getAdminActor();
    if (!actor) {
      return NextResponse.json({ ok: false, code: "UNAUTHORIZED", error: "Unauthorized" }, { status: 401 });
    }

    const payload = ReorderPayloadSchema.parse(await request.json());
    const result = await setProductDisplayOrder(payload.orderedIds);
    if (!result.applied) {
      return NextResponse.json(
        {
          ok: false,
          code: "MISSING_SORT_ORDER_COLUMN",
          error: "Database schema is missing products.sort_order. Please run migration first.",
        },
        { status: 409 },
      );
    }

    revalidatePublicProductPaths();

    return NextResponse.json(
      { ok: true, data: { count: payload.orderedIds.length } },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, code: "INVALID_REQUEST", error: error.issues.map((item) => item.message).join(", ") },
        { status: 400 },
      );
    }
    const message = error instanceof Error ? error.message : "Failed to reorder products";
    return NextResponse.json({ ok: false, code: "REORDER_PRODUCTS_FAILED", error: message }, { status: mapStatus(message) });
  }
}
