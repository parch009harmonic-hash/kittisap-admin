import { NextResponse } from "next/server";

import { listPublicProducts } from "../../../../../lib/db/publicProducts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await listPublicProducts({ featuredOnly: true, includeTotal: false, page: 1, pageSize: 8 });
    return NextResponse.json({ ok: true, data }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch featured products";
    return NextResponse.json({ ok: false, code: "FEATURED_PRODUCTS_FETCH_FAILED", error: message }, { status: 500 });
  }
}
