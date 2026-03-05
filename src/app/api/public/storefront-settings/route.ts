import { NextResponse } from "next/server";

import { getWebHomepagePopupSettings, getWebStorefrontSettings } from "../../../../../lib/db/web-settings";
import {
  getDefaultWebHomepagePopupSettings,
  getDefaultWebStorefrontSettings,
} from "../../../../../lib/types/web-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [data, popup] = await Promise.all([getWebStorefrontSettings(), getWebHomepagePopupSettings()]);
    return NextResponse.json({ ok: true, data, popup }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch {
    return NextResponse.json(
      { ok: true, data: getDefaultWebStorefrontSettings(), popup: getDefaultWebHomepagePopupSettings() },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }
}
