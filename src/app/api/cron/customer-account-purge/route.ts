import { NextRequest, NextResponse } from "next/server";

import {
  CustomerAccountDeletionError,
  purgeDueCustomerAccountDeletions,
} from "../../../../../lib/db/customer-account-deletion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return false;
  }
  const authHeader = request.headers.get("authorization") ?? "";
  return authHeader === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ ok: false, error: "Unauthorized cron request" }, { status: 401 });
    }

    const result = await purgeDueCustomerAccountDeletions();
    return NextResponse.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    if (error instanceof CustomerAccountDeletionError) {
      return NextResponse.json({ ok: false, code: error.code, error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Customer account purge failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
