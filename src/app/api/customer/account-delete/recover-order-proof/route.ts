import { NextRequest, NextResponse } from "next/server";

import {
  CustomerAccountDeletionError,
  recoverCustomerAccountDeletionByOrderProof,
} from "../../../../../../lib/db/customer-account-deletion";
import { takeRateLimitToken } from "../../../../../../lib/security/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RECOVERY_LIMIT = 6;
const RECOVERY_WINDOW_MS = 15 * 60 * 1000;

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rate = takeRateLimitToken(`account-recovery:order-proof:${ip}`, {
      limit: RECOVERY_LIMIT,
      windowMs: RECOVERY_WINDOW_MS,
    });
    if (!rate.ok) {
      return NextResponse.json(
        { ok: false, code: "RATE_LIMITED", error: "Too many recovery attempts. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.max(Math.ceil((rate.resetAt - Date.now()) / 1000), 1)),
            "Cache-Control": "no-store, max-age=0",
          },
        },
      );
    }

    const body = (await request.json()) as {
      email?: string;
      phoneLast4?: string;
      lastOrderNo?: string;
    };

    const data = await recoverCustomerAccountDeletionByOrderProof({
      email: String(body.email ?? ""),
      phoneLast4: String(body.phoneLast4 ?? ""),
      lastOrderNo: String(body.lastOrderNo ?? ""),
      ipAddress: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json({ ok: true, data }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    if (error instanceof CustomerAccountDeletionError) {
      return NextResponse.json({ ok: false, code: error.code, error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Failed to recover account";
    return NextResponse.json({ ok: false, code: "ACCOUNT_DELETE_RECOVER_FAILED", error: message }, { status: 500 });
  }
}
