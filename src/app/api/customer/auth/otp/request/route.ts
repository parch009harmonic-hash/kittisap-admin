import { NextRequest, NextResponse } from "next/server";

import {
  CustomerAuthOtpError,
  extractClientIp,
  requestCustomerEmailOtp,
} from "../../../../../../../lib/security/customer-auth-otp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      email?: string;
      purpose?: string;
      emailRedirectTo?: string;
    };

    const purpose = String(body.purpose ?? "").trim().toLowerCase() === "account_recovery"
      ? "account_recovery"
      : "forgot_password";

    const result = await requestCustomerEmailOtp({
      email: String(body.email ?? ""),
      purpose,
      ipAddress: extractClientIp(request.headers),
      userAgent: request.headers.get("user-agent"),
      emailRedirectTo: body.emailRedirectTo,
    });

    return NextResponse.json(
      {
        ok: true,
        code: "OTP_REQUEST_ACCEPTED",
        message: result.message,
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    if (error instanceof CustomerAuthOtpError) {
      const retryAfter = error.retryAfterSeconds;
      return NextResponse.json(
        { ok: false, code: error.code, error: error.message },
        {
          status: error.status,
          headers: {
            ...(retryAfter ? { "Retry-After": String(Math.max(retryAfter, 1)) } : {}),
            "Cache-Control": "no-store, max-age=0",
          },
        },
      );
    }
    const message = error instanceof Error ? error.message : "Failed to request OTP";
    return NextResponse.json({ ok: false, code: "OTP_REQUEST_FAILED", error: message }, { status: 500 });
  }
}
