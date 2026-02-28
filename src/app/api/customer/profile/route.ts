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
    const result = await supabase
      .from("customer_profiles")
      .select("*")
      .eq("id", actor.user.id)
      .maybeSingle();

    const data = (result.data as Record<string, unknown> | null) ?? null;
    const error = result.error;

    if (error) {
      return NextResponse.json({ ok: false, code: "PROFILE_FETCH_FAILED", error: error.message }, { status: 500 });
    }

    const normalized = data
      ? {
          ...data,
          address: typeof data.address === "string" ? data.address : "",
        }
      : null;

    return NextResponse.json({ ok: true, data: normalized }, { headers: { "Cache-Control": "no-store, max-age=0" } });
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
    const payload = (await request.json()) as { fullName?: string; phone?: string; address?: string };
    const profile = await upsertCustomerProfileForSessionUser({ fullName: payload.fullName, phone: payload.phone, address: payload.address });
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
