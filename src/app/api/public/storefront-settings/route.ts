import { NextResponse } from "next/server";

import { getWebStorefrontSettings } from "../../../../../lib/db/web-settings";
import { getDefaultWebStorefrontSettings } from "../../../../../lib/types/web-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getWebStorefrontSettings();
    return NextResponse.json({ ok: true, data }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch {
    return NextResponse.json(
      { ok: true, data: getDefaultWebStorefrontSettings() },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }
}
