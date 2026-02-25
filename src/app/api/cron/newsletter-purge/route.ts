import { NextRequest, NextResponse } from "next/server";

import { purgeInactiveSubscribersOnMonth30 } from "../../../../../lib/db/broadcast";

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

    const result = await purgeInactiveSubscribersOnMonth30();
    return NextResponse.json(
      {
        ok: true,
        ...result,
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cron purge failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
