import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";

import { requireDeveloperApi } from "../../../../../../lib/auth/admin";
import { listUiMaintenanceRules, upsertUiMaintenanceRule } from "../../../../../../lib/db/ui-maintenance";
import { UI_MAINTENANCE_PATHS } from "../../../../../../lib/maintenance/ui-maintenance";

const payloadSchema = z.object({
  path: z.string(),
  enabled: z.boolean(),
  roles: z.array(z.enum(["admin", "staff"])).min(1),
  platforms: z.array(z.enum(["windows", "android", "ios"])).min(1),
  message: z.string().trim().min(1).max(255),
});

function safeError(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

export async function GET() {
  try {
    await requireDeveloperApi({ allowAdmin: true });
    const rules = await listUiMaintenanceRules();
    return NextResponse.json({ ok: true, rules }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    const message = safeError(error);
    const status = message === "Unauthorized" ? 401 : message === "Developer only" ? 403 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireDeveloperApi({ allowAdmin: true });
    const payload = payloadSchema.parse(await request.json());
    if (!UI_MAINTENANCE_PATHS.includes(payload.path as (typeof UI_MAINTENANCE_PATHS)[number])) {
      return NextResponse.json({ ok: false, error: "Invalid path" }, { status: 400 });
    }

    const rule = await upsertUiMaintenanceRule({
      path: payload.path,
      enabled: payload.enabled,
      roles: payload.roles,
      platforms: payload.platforms,
      message: payload.message,
      updatedBy: actor.user.id,
    });

    return NextResponse.json({ ok: true, rule }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    const message = safeError(error);
    const status =
      message === "Unauthorized" ? 401 : message === "Developer only" ? 403 : message.includes("Invalid") ? 400 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
