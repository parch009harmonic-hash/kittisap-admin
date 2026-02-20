import { NextRequest, NextResponse } from "next/server";

import { requireAdminApi } from "../../../../../lib/auth/admin";
import { takeRateLimitToken } from "../../../../../lib/security/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TranslatePayload = {
  title_th?: string;
  description_th?: string;
};

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

function pickTranslation(raw: unknown) {
  if (!Array.isArray(raw) || raw.length === 0) {
    return "";
  }

  const first = raw[0];
  if (!Array.isArray(first)) {
    return "";
  }

  const parts: string[] = [];
  for (const segment of first) {
    if (Array.isArray(segment) && typeof segment[0] === "string") {
      parts.push(segment[0]);
    }
  }

  return parts.join("").trim();
}

async function translateViaGoogleFree(text: string, target: "en" | "lo") {
  if (!text.trim()) {
    return "";
  }

  const endpoint = new URL("https://translate.googleapis.com/translate_a/single");
  endpoint.searchParams.set("client", "gtx");
  endpoint.searchParams.set("sl", "th");
  endpoint.searchParams.set("tl", target);
  endpoint.searchParams.set("dt", "t");
  endpoint.searchParams.set("q", text);

  const response = await fetch(endpoint.toString(), {
    method: "GET",
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Translator upstream failed (${response.status})`);
  }

  const data = (await response.json()) as unknown;
  return pickTranslation(data);
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = takeRateLimitToken(`admin-translate:${ip}`, {
    limit: 20,
    windowMs: 60_000,
  });

  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  }

  try {
    await requireAdminApi();

    const body = (await request.json()) as TranslatePayload;
    const titleTh = String(body.title_th ?? "").trim();
    const descriptionTh = String(body.description_th ?? "").trim();

    const [titleEn, titleLo, descriptionEn, descriptionLo] = await Promise.all([
      translateViaGoogleFree(titleTh, "en"),
      translateViaGoogleFree(titleTh, "lo"),
      translateViaGoogleFree(descriptionTh, "en"),
      translateViaGoogleFree(descriptionTh, "lo"),
    ]);

    return NextResponse.json(
      {
        title_en: titleEn,
        title_lo: titleLo,
        description_en: descriptionEn,
        description_lo: descriptionLo,
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Auto translation failed";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message === "Not authorized to manage users") {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
