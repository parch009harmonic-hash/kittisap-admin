import { NextRequest, NextResponse } from "next/server";

import { requireCustomerApi } from "../../../../../../lib/auth/customer";
import {
  CustomerAccountDeletionError,
  requestCustomerAccountDeletion,
} from "../../../../../../lib/db/customer-account-deletion";

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
    const body = (await request.json()) as { password?: string; reason?: string };
    const password = String(body.password ?? "");
    const reason = String(body.reason ?? "");

    const data = await requestCustomerAccountDeletion({
      customerId: actor.user.id,
      email: String(actor.user.email ?? ""),
      password,
      reason,
      ipAddress: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to schedule account deletion";
    const authResponse = unauthorized(message);
    if (authResponse) {
      return authResponse;
    }
    if (error instanceof CustomerAccountDeletionError) {
      return NextResponse.json({ ok: false, code: error.code, error: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, code: "ACCOUNT_DELETE_REQUEST_FAILED", error: message }, { status: 500 });
  }
}
