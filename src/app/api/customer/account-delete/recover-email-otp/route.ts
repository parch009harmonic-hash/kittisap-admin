import { NextRequest, NextResponse } from "next/server";

import { requireCustomerApi } from "../../../../../../lib/auth/customer";
import {
  CustomerAccountDeletionError,
  recoverCustomerAccountDeletionByEmailLink,
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
    const data = await recoverCustomerAccountDeletionByEmailLink({
      customerId: actor.user.id,
      ipAddress: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to recover account";
    const authResponse = unauthorized(message);
    if (authResponse) {
      return authResponse;
    }
    if (error instanceof CustomerAccountDeletionError) {
      return NextResponse.json({ ok: false, code: error.code, error: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, code: "ACCOUNT_DELETE_RECOVER_FAILED", error: message }, { status: 500 });
  }
}
