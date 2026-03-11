import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { AdminCustomerKycAccessError, getAdminCustomerKycView } from "../../../../../../../lib/db/admin-customer-kyc-access";
import { takeRateLimitToken } from "../../../../../../../lib/security/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ParamsSchema = z.object({
  userId: z.string().uuid(),
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
  const token = takeRateLimitToken(`admin-customer-users:kyc-view:${ip}`, {
    limit: 40,
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

function parseBearerToken(request: NextRequest) {
  const authHeader = String(request.headers.get("authorization") ?? "").trim();
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return "";
  }
  return authHeader.slice(7).trim();
}

export async function GET(request: NextRequest, context: { params: Promise<{ userId: string }> }) {
  const limited = checkRateLimit(request);
  if (limited) {
    return limited;
  }

  try {
    const params = ParamsSchema.parse(await context.params);
    const accessToken = parseBearerToken(request);
    const data = await getAdminCustomerKycView({
      customerId: params.userId,
      accessToken,
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
    const message = error instanceof Error ? error.message : "Failed to load KYC view";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
