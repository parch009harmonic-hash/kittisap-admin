import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { getAdminActor } from "../../../../../lib/auth/admin";
import { getAdminSettingsApi, updateAdminSettingApi } from "../../../../../lib/db/admin-settings";
import { isUiMaintenanceLockedError } from "../../../../../lib/maintenance/ui-maintenance-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function mapStatus(message: string) {
  if (message === "Unauthorized") {
    return 401;
  }
  if (message === "Not authorized to manage users") {
    return 403;
  }
  return 500;
}

async function assertAdminOnly() {
  const actor = await getAdminActor();
  if (!actor || actor.role !== "admin") {
    throw new Error("Not authorized to manage users");
  }
}

export async function GET() {
  try {
    await assertAdminOnly();
    const settings = await getAdminSettingsApi();
    return NextResponse.json(
      { settings },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load settings";
    return NextResponse.json({ error: message }, { status: mapStatus(message) });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await assertAdminOnly();
    const body = (await request.json()) as { field?: unknown; value?: unknown };
    const settings = await updateAdminSettingApi(body.field, body.value);
    return NextResponse.json(
      { settings },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      const message = error.issues.map((item) => item.message).join(", ");
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (isUiMaintenanceLockedError(error)) {
      return NextResponse.json({ code: error.code, error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Failed to update settings";
    return NextResponse.json({ error: message }, { status: mapStatus(message) });
  }
}
