import { NextRequest, NextResponse } from "next/server";

import { listNewsletterSubscribersApi } from "../../../../../../lib/db/broadcast";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function mapStatus(message: string) {
  if (message === "Unauthorized") return 401;
  if (message === "Not authorized to manage broadcast") return 403;
  if (message === "Network unstable") return 503;
  return 500;
}

export async function GET(request: NextRequest) {
  try {
    const includeInactive = request.nextUrl.searchParams.get("includeInactive") === "1";
    const data = await listNewsletterSubscribersApi({ includeInactive });
    return NextResponse.json({ ok: true, data }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load subscribers";
    return NextResponse.json({ ok: false, code: "BROADCAST_SUBSCRIBERS_FETCH_FAILED", error: message }, { status: mapStatus(message) });
  }
}
