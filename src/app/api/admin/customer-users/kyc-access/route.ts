import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { AdminCustomerKycAccessError, requestAdminCustomerKycAccess } from "../../../../../../lib/db/admin-customer-kyc-access";
import { takeRateLimitToken } from "../../../../../../lib/security/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  customerId: z.string().uuid(),
  pin: z.string().trim().min(1),
});

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

function checkRateLimit(request: NextRequest) {
  const ip = getClientIp(request);
  const token = takeRateLimitToken(`admin-customer-users:kyc-access:${ip}`, {
    limit: 18,
    windowMs: 60_000,
  });

  if (!token.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((token.resetAt - Date.now()) / 1000)),
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  }

  return null;
}

export async function POST(request: NextRequest) {
  const limited = checkRateLimit(request);
  if (limited) {
    return limited;
  }

  try {
    const body = BodySchema.parse(await request.json());
    const data = await requestAdminCustomerKycAccess({
      customerId: body.customerId,
      pin: body.pin,
      ipAddress: getClientIp(request),
      userAgent: request.headers.get("user-agent"),
    });
    return NextResponse.json({ ok: true, data }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.issues.map((item) => item.message).join(", ");
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (error instanceof AdminCustomerKycAccessError) {
      return NextResponse.json({ code: error.code, error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Failed to verify KYC PIN";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
