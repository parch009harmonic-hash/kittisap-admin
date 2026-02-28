import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getAdminActor } from "../../../../../../lib/auth/admin";
import { setProductFeatured } from "../../../../../../lib/db/products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ToggleFeaturedPayloadSchema = z.object({
  id: z.string().trim().min(1),
  isFeatured: z.boolean(),
});

function mapStatus(message: string) {
  if (message === "Unauthorized") return 401;
  if (message === "Not authorized to manage users") return 403;
  if (message.includes("missing_is_featured_column")) return 400;
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

    const payload = ToggleFeaturedPayloadSchema.parse(await request.json());
    const result = await setProductFeatured(payload.id, payload.isFeatured);

    revalidatePublicProductPaths();

    console.info(
      JSON.stringify({
        ts: new Date().toISOString(),
        route: "/api/admin/products/featured",
        productId: payload.id,
        isFeatured: payload.isFeatured,
        result,
      }),
    );

    return NextResponse.json(
      { ok: true, data: result },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, code: "INVALID_REQUEST", error: error.issues.map((item) => item.message).join(", ") },
        { status: 400 },
      );
    }

    const message = error instanceof Error ? error.message : "Failed to update featured product";
    return NextResponse.json({ ok: false, code: "TOGGLE_FEATURED_FAILED", error: message }, { status: mapStatus(message) });
  }
}
