import { NextRequest, NextResponse } from "next/server";

import { requireCustomerApi } from "../../../../../../lib/auth/customer";
import {
  createCustomerKycSession,
  CustomerKycError,
  getCustomerKycProfile,
  type CustomerKycPurpose,
} from "../../../../../../lib/db/customer-kyc";

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

function normalizePurpose(value: unknown): CustomerKycPurpose {
  const purpose = String(value ?? "").trim().toLowerCase();
  if (purpose === "account_recovery" || purpose === "step_up") {
    return purpose;
  }
  return "onboarding";
}

export async function GET() {
  try {
    const actor = await requireCustomerApi();
    const profile = await getCustomerKycProfile(actor.user.id);
    return NextResponse.json({ ok: true, data: profile }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load KYC profile";
    const authResponse = unauthorized(message);
    if (authResponse) {
      return authResponse;
    }
    if (error instanceof CustomerKycError) {
      return NextResponse.json({ ok: false, code: error.code, error: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, code: "KYC_PROFILE_FETCH_FAILED", error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireCustomerApi();
    const payload = (await request.json().catch(() => ({}))) as { purpose?: string };
    const purpose = normalizePurpose(payload.purpose);

    const data = await createCustomerKycSession({
      customerId: actor.user.id,
      purpose,
      ipAddress: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create KYC session";
    const authResponse = unauthorized(message);
    if (authResponse) {
      return authResponse;
    }
    if (error instanceof CustomerKycError) {
      return NextResponse.json({ ok: false, code: error.code, error: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, code: "KYC_SESSION_CREATE_FAILED", error: message }, { status: 500 });
  }
}
