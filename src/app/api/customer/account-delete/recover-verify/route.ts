import { NextRequest, NextResponse } from "next/server";

import {
  CustomerAccountDeletionError,
  recoverCustomerAccountDeletionByCredential,
} from "../../../../../../lib/db/customer-account-deletion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      faceScanPassed?: boolean;
      faceScanMethod?: string;
    };

    const data = await recoverCustomerAccountDeletionByCredential({
      email: String(body.email ?? ""),
      password: String(body.password ?? ""),
      faceScanPassed: Boolean(body.faceScanPassed),
      faceScanMethod: String(body.faceScanMethod ?? ""),
      ipAddress: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    if (error instanceof CustomerAccountDeletionError) {
      return NextResponse.json({ ok: false, code: error.code, error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Failed to recover account";
    return NextResponse.json({ ok: false, code: "ACCOUNT_DELETE_RECOVER_FAILED", error: message }, { status: 500 });
  }
}
