import { NextRequest, NextResponse } from "next/server";

import { CommerceApiError, listPublicProducts } from "../../../../../lib/db/customer-commerce";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return parsed;
}

export async function GET(request: NextRequest) {
  try {
    const search = request.nextUrl.searchParams;
    const q = search.get("q") ?? undefined;
    const page = toInt(search.get("page"), 1);
    const pageSize = toInt(search.get("pageSize"), 20);
    const data = await listPublicProducts({ q, page, pageSize });
    return NextResponse.json({ ok: true, data }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    if (error instanceof CommerceApiError) {
      return NextResponse.json({ ok: false, code: error.code, error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Failed to fetch products";
    return NextResponse.json({ ok: false, code: "PRODUCTS_FETCH_FAILED", error: message }, { status: 500 });
  }
}
