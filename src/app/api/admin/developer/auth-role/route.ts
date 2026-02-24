import { NextResponse } from "next/server";

import { requireDeveloperApi } from "../../../../../../lib/auth/admin";
import { getSupabaseServiceRoleClient } from "../../../../../../lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeRole(value: unknown) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "admin" || normalized === "staff" || normalized === "developer" || normalized === "customer") {
    return normalized;
  }
  return "";
}

export async function GET() {
  try {
    const actor = await requireDeveloperApi();
    const supabase = getSupabaseServiceRoleClient();

    const byId = await supabase
      .from("profiles")
      .select("role")
      .eq("id", actor.user.id)
      .maybeSingle();

    const missingIdColumn =
      String(byId.error?.message ?? "").toLowerCase().includes("column")
      && String(byId.error?.message ?? "").toLowerCase().includes("does not exist");

    let roleFromProfiles = normalizeRole(byId.data?.role);
    let source: "profiles.id" | "profiles.user_id" | "none" = roleFromProfiles ? "profiles.id" : "none";
    let profileError = byId.error ? String(byId.error.message) : null;

    if ((!roleFromProfiles && !byId.error) || missingIdColumn) {
      const byUserId = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", actor.user.id)
        .maybeSingle();
      const fallbackRole = normalizeRole(byUserId.data?.role);
      if (fallbackRole) {
        roleFromProfiles = fallbackRole;
        source = "profiles.user_id";
        profileError = null;
      } else if (!profileError && byUserId.error) {
        profileError = String(byUserId.error.message);
      }
    }

    const customerProfile = await supabase
      .from("customer_profiles")
      .select("id,full_name,phone")
      .eq("id", actor.user.id)
      .maybeSingle();

    const resolvedRole = roleFromProfiles || "customer";
    const isBackoffice = resolvedRole === "admin" || resolvedRole === "staff" || resolvedRole === "developer";

    return NextResponse.json(
      {
        ok: true,
        checkedAt: new Date().toISOString(),
        auth: {
          id: actor.user.id,
          email: actor.user.email ?? null,
        },
        role: {
          resolved: resolvedRole,
          fromProfiles: roleFromProfiles || null,
          source,
          isBackoffice,
        },
        customerProfile: {
          exists: Boolean(customerProfile.data),
          fullName: customerProfile.data?.full_name ?? null,
          phone: customerProfile.data?.phone ?? null,
        },
        errors: {
          profiles: profileError,
          customerProfiles: customerProfile.error ? String(customerProfile.error.message) : null,
        },
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : message === "Developer only" ? 403 : 500;
    return NextResponse.json(
      { ok: false, checkedAt: new Date().toISOString(), error: message },
      { status, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }
}

