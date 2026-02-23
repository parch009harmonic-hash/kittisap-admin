import { NextRequest, NextResponse } from "next/server";

import { requireCustomerApi } from "../../../../../lib/auth/customer";
import { upsertCustomerProfileForSessionUser } from "../../../../../lib/auth/customer-profile";
import { getSupabaseServerClient } from "../../../../../lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauthorized(message: string) {
  if (message === "Unauthorized") {
    return NextResponse.json({ ok: false, code: "AUTH_REQUIRED", error: message }, { status: 401 });
  }
  if (message === "Network unstable") {
    return NextResponse.json({ ok: false, code: "NETWORK_UNSTABLE", error: message }, { status: 503 });
  }
  return null;
}

export async function GET() {
  try {
    const actor = await requireCustomerApi();
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase
      .from("customer_profiles")
      .select("id,full_name,phone,line_id,is_active,created_at,updated_at")
      .eq("id", actor.user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ ok: false, code: "PROFILE_FETCH_FAILED", error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: data ?? null }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load profile";
    const authResponse = unauthorized(message);
    if (authResponse) {
      return authResponse;
    }
    return NextResponse.json({ ok: false, code: "PROFILE_FETCH_FAILED", error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireCustomerApi();
    const payload = (await request.json()) as { fullName?: string; phone?: string };
    const profile = await upsertCustomerProfileForSessionUser({ fullName: payload.fullName, phone: payload.phone });
    return NextResponse.json({ ok: true, data: profile });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update profile";
    const authResponse = unauthorized(message);
    if (authResponse) {
      return authResponse;
    }
    return NextResponse.json({ ok: false, code: "PROFILE_UPDATE_FAILED", error: message }, { status: 500 });
  }
}
