import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "../../../../../lib/auth/admin";

type TranslatePayload = {
  title_th?: string;
  description_th?: string;
};

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
  });

  if (!response.ok) {
    throw new Error(`Translator upstream failed (${response.status})`);
  }

  const data = (await response.json()) as unknown;
  return pickTranslation(data);
}

export async function POST(request: NextRequest) {
  await requireAdmin();

  try {
    const body = (await request.json()) as TranslatePayload;
    const titleTh = String(body.title_th ?? "").trim();
    const descriptionTh = String(body.description_th ?? "").trim();

    const [titleEn, titleLo, descriptionEn, descriptionLo] = await Promise.all([
      translateViaGoogleFree(titleTh, "en"),
      translateViaGoogleFree(titleTh, "lo"),
      translateViaGoogleFree(descriptionTh, "en"),
      translateViaGoogleFree(descriptionTh, "lo"),
    ]);

    return NextResponse.json({
      title_en: titleEn,
      title_lo: titleLo,
      description_en: descriptionEn,
      description_lo: descriptionLo,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Auto translation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
