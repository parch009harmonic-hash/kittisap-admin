import { NextRequest, NextResponse } from "next/server";

import { requireCustomerApi } from "../../../../../lib/auth/customer";
import { upsertCustomerProfileForSessionUser } from "../../../../../lib/auth/customer-profile";
import { getSupabaseServerClient } from "../../../../../lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const QUERY_RETRIES = 1;

function isTransientNetworkError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error ?? "").toLowerCase();
  return (
    message.includes("timed out")
    || message.includes("enotfound")
    || message.includes("eai_again")
    || message.includes("fetch failed")
    || message.includes("connect timeout")
    || message.includes("und_err_connect_timeout")
  );
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function unauthorized(message: string) {
  if (message === "Unauthorized") {
    return NextResponse.json({ ok: false, code: "AUTH_REQUIRED", error: message }, { status: 401 });
  }
  if (message === "Network unstable") {
    return NextResponse.json({ ok: false, code: "NETWORK_UNSTABLE", error: message }, { status: 503 });
  }
  return null;
}

function pickString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET() {
  try {
    const actor = await requireCustomerApi();
    const supabase = await getSupabaseServerClient();

    let result: { data: Record<string, unknown> | null; error: { message?: string } | null } = {
      data: null,
      error: null,
    };

    for (let attempt = 0; attempt <= QUERY_RETRIES; attempt += 1) {
      const current = await supabase
        .from("customer_profiles")
        .select("*")
        .eq("id", actor.user.id)
        .maybeSingle();

      result = {
        data: (current.data as Record<string, unknown> | null) ?? null,
        error: (current.error as { message?: string } | null) ?? null,
      };

      if (!result.error) {
        break;
      }
      if (!isTransientNetworkError(result.error) || attempt >= QUERY_RETRIES) {
        break;
      }
      await sleep(220 * (attempt + 1));
    }

    let data = (result.data as Record<string, unknown> | null) ?? null;
    const error = result.error;

    if (error) {
      if (isTransientNetworkError(error)) {
        return NextResponse.json({ ok: false, code: "NETWORK_UNSTABLE", error: "Network unstable" }, { status: 503 });
      }
      return NextResponse.json({ ok: false, code: "PROFILE_FETCH_FAILED", error: error.message }, { status: 500 });
    }

    const userMeta = (actor.user.user_metadata as Record<string, unknown> | null) ?? null;
    const fallbackFullName =
      pickString(userMeta?.full_name)
      || pickString(userMeta?.name)
      || pickString(userMeta?.display_name)
      || pickString(userMeta?.user_name)
      || pickString(actor.user.email?.split("@")[0] ?? "");
    const fallbackPhone = pickString(userMeta?.phone) || pickString(userMeta?.phone_number) || pickString(actor.user.phone);
    const fallbackAddress =
      pickString(userMeta?.address) || pickString(userMeta?.shipping_address) || pickString(userMeta?.location);
    const fallbackAvatar =
      pickString(userMeta?.avatar_url)
      || pickString(userMeta?.picture)
      || pickString(userMeta?.picture_url)
      || pickString(userMeta?.photo_url);

    const shouldProvisionProfile =
      !data
      || (!pickString(data.full_name) && !pickString(data.phone) && !pickString(data.address) && !pickString(data.avatar_url));

    if (shouldProvisionProfile) {
      const provisioned = await upsertCustomerProfileForSessionUser();
      data = {
        ...(data ?? {}),
        ...provisioned,
      };
    }

    const normalized = {
      ...(data ?? {}),
      id: pickString(data?.id) || actor.user.id,
      full_name: pickString(data?.full_name) || fallbackFullName,
      phone: pickString(data?.phone) || fallbackPhone,
      address: pickString(data?.address) || fallbackAddress,
      avatar_url:
        pickString(data?.avatar_url)
        || pickString(data?.profile_image_url)
        || pickString(data?.image_url)
        || fallbackAvatar,
      deletion_status: pickString(data?.deletion_status) || "active",
      deletion_requested_at: pickString(data?.deletion_requested_at) || null,
      deletion_scheduled_for: pickString(data?.deletion_scheduled_for) || null,
      deletion_reason: pickString(data?.deletion_reason) || null,
      recovered_at: pickString(data?.recovered_at) || null,
    };

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
    const actor = await requireCustomerApi();
    const supabase = await getSupabaseServerClient();
    let profileState: { data: { deletion_status?: unknown } | null; error: { message?: string } | null } = {
      data: null,
      error: null,
    };

    for (let attempt = 0; attempt <= QUERY_RETRIES; attempt += 1) {
      const current = await supabase
        .from("customer_profiles")
        .select("deletion_status")
        .eq("id", actor.user.id)
        .maybeSingle();

      profileState = {
        data: (current.data as { deletion_status?: unknown } | null) ?? null,
        error: (current.error as { message?: string } | null) ?? null,
      };

      if (!profileState.error) {
        break;
      }
      if (!isTransientNetworkError(profileState.error) || attempt >= QUERY_RETRIES) {
        break;
      }
      await sleep(180 * (attempt + 1));
    }

    if (profileState.error && isTransientNetworkError(profileState.error)) {
      return NextResponse.json({ ok: false, code: "NETWORK_UNSTABLE", error: "Network unstable" }, { status: 503 });
    }

    const deletionStatus = pickString((profileState.data as { deletion_status?: unknown } | null)?.deletion_status).toLowerCase();
    if (deletionStatus === "pending_delete") {
      return NextResponse.json(
        { ok: false, code: "ACCOUNT_DELETE_PENDING", error: "Account deletion is pending. Recover account before editing profile." },
        { status: 403 },
      );
    }

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
