import { NextResponse } from "next/server";

import { CommerceApiError, listPublicProducts } from "../../../../../lib/db/customer-commerce";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await listPublicProducts({ page: 1, pageSize: 500 });
    const rows = data.items.map((item) => ({
      productId: item.id,
      sku: item.sku,
      slug: item.slug,
      name: item.title_th,
      price: item.price,
      stock: item.stock,
      category: "general",
    }));
    return NextResponse.json({ ok: true, data: rows }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    if (error instanceof CommerceApiError) {
      return NextResponse.json({ ok: false, code: error.code, error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Failed to fetch price table";
    return NextResponse.json({ ok: false, code: "PRICE_TABLE_FETCH_FAILED", error: message }, { status: 500 });
  }
}
