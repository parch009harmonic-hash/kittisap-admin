import { NextRequest, NextResponse } from "next/server";

import { requireCustomerApi } from "../../../../../../../lib/auth/customer";
import {
  completeCustomerKycSession,
  CustomerKycError,
} from "../../../../../../../lib/db/customer-kyc";

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

export async function POST(request: NextRequest) {
  try {
    const actor = await requireCustomerApi();
    const payload = (await request.json().catch(() => ({}))) as {
      sessionId?: string;
      verificationMethod?: string;
      resultPayload?: Record<string, unknown>;
    };

    const data = await completeCustomerKycSession({
      customerId: actor.user.id,
      sessionId: String(payload.sessionId ?? ""),
      verificationMethod: String(payload.verificationMethod ?? ""),
      resultPayload: (payload.resultPayload ?? {}) as Record<string, unknown>,
      ipAddress: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json({ ok: true, data }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to complete KYC session";
    const authResponse = unauthorized(message);
    if (authResponse) {
      return authResponse;
    }
    if (error instanceof CustomerKycError) {
      return NextResponse.json({ ok: false, code: error.code, error: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, code: "KYC_SESSION_COMPLETE_FAILED", error: message }, { status: 500 });
  }
}
