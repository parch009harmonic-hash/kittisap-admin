import { NextRequest, NextResponse } from "next/server";

import { getAdminActor } from "../../../../../../lib/auth/admin";
import { listUiMaintenanceRules } from "../../../../../../lib/db/ui-maintenance";
import { detectUiPlatformFromUserAgent, normalizeUiPath } from "../../../../../../lib/maintenance/ui-maintenance";

function safeError(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

export async function GET(request: NextRequest) {
  try {
    const actor = await getAdminActor();
    if (!actor) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    if (actor.role !== "admin" && actor.role !== "staff") {
      return NextResponse.json({ ok: true, blocked: false });
    }

    const pathname = normalizeUiPath(request.nextUrl.searchParams.get("path") ?? "/admin");
    if (!pathname) {
      return NextResponse.json({ ok: true, blocked: false });
    }
    const platform = detectUiPlatformFromUserAgent(request.headers.get("user-agent") ?? "");
    const rules = await listUiMaintenanceRules({ bypassCache: true });
    const rule = rules.find((item) => item.path === pathname);

    const blocked = Boolean(
      rule &&
        rule.enabled &&
        rule.roles.includes(actor.role) &&
        rule.platforms.includes(platform),
    );

    return NextResponse.json(
      {
        ok: true,
        blocked,
        role: actor.role,
        platform,
        path: pathname,
        message: blocked ? rule?.message : null,
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    return NextResponse.json({ ok: false, error: safeError(error) }, { status: 500 });
  }
}
