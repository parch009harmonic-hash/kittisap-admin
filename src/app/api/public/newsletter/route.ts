import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { subscribeNewsletter } from "../../../../../lib/db/broadcast";
import { takeRateLimitToken } from "../../../../../lib/security/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NEWSLETTER_LIMIT = 8;
const NEWSLETTER_WINDOW_MS = 10 * 60 * 1000;

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
    const rate = takeRateLimitToken(`newsletter:subscribe:${ip}`, {
      limit: NEWSLETTER_LIMIT,
      windowMs: NEWSLETTER_WINDOW_MS,
    });
    if (!rate.ok) {
      return NextResponse.json(
        { ok: false, code: "RATE_LIMITED", error: "Too many subscribe requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.max(Math.ceil((rate.resetAt - Date.now()) / 1000), 1)),
            "Cache-Control": "no-store, max-age=0",
          },
        },
      );
    }

    const payload = await request.json();
    const data = await subscribeNewsletter(payload);
    return NextResponse.json({ ok: true, data }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          ok: false,
          code: "INVALID_REQUEST",
          error: error.issues.map((issue) => issue.message).join(", "),
        },
        { status: 400 },
      );
    }

    const message = error instanceof Error ? error.message : "Failed to subscribe";
    return NextResponse.json({ ok: false, code: "NEWSLETTER_SUBSCRIBE_FAILED", error: message }, { status: 500 });
  }
}
