import { NextResponse } from "next/server";

import { CommerceApiError, getPublicProductBySlug } from "../../../../../../lib/db/customer-commerce";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await context.params;
    const product = await getPublicProductBySlug(slug);
    if (!product) {
      return NextResponse.json({ ok: false, code: "PRODUCT_NOT_FOUND", error: "Product not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, data: product }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    if (error instanceof CommerceApiError) {
      return NextResponse.json({ ok: false, code: error.code, error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Failed to fetch product";
    return NextResponse.json({ ok: false, code: "PRODUCT_FETCH_FAILED", error: message }, { status: 500 });
  }
}
