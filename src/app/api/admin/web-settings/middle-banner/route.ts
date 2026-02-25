import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { getAdminActor } from "../../../../../../lib/auth/admin";
import {
  getWebMiddleBannerSettingsApi,
  updateWebMiddleBannerSettingsApi,
} from "../../../../../../lib/db/web-settings";
import { isUiMaintenanceLockedError } from "../../../../../../lib/maintenance/ui-maintenance-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function mapStatus(message: string) {
  if (message === "Unauthorized") return 401;
  if (message === "Not authorized to manage web settings") return 403;
  if (message === "Network unstable") return 503;
  if (message.startsWith("Missing web_settings table")) return 503;
  return 500;
}

async function assertAdminOnly() {
  const actor = await getAdminActor();
  if (!actor || actor.role !== "admin") {
    throw new Error("Not authorized to manage web settings");
  }
}

export async function GET() {
  try {
    await assertAdminOnly();
    const data = await getWebMiddleBannerSettingsApi();
    return NextResponse.json({ ok: true, data }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load middle banner settings";
    return NextResponse.json({ ok: false, code: "WEB_MIDDLE_BANNER_FETCH_FAILED", error: message }, { status: mapStatus(message) });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await assertAdminOnly();
    const payload = await request.json();
    const data = await updateWebMiddleBannerSettingsApi(payload);
    return NextResponse.json({ ok: true, data }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { ok: false, code: "INVALID_REQUEST", error: error.issues.map((issue) => issue.message).join(", ") },
        { status: 400 },
      );
    }
    if (isUiMaintenanceLockedError(error)) {
      return NextResponse.json({ ok: false, code: "UI_MAINTENANCE_LOCKED", error: error.message }, { status: 423 });
    }
    const message = error instanceof Error ? error.message : "Failed to update middle banner settings";
    return NextResponse.json({ ok: false, code: "WEB_MIDDLE_BANNER_UPDATE_FAILED", error: message }, { status: mapStatus(message) });
  }
}
