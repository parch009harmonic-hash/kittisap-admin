import { NextRequest, NextResponse } from "next/server";

import { ADMIN_LOCALE_COOKIE, normalizeAdminLocale } from "../../../../../lib/i18n/admin";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { locale?: string };
  const locale = normalizeAdminLocale(body.locale);

  const response = NextResponse.json({ ok: true, locale });
  response.cookies.set({
    name: ADMIN_LOCALE_COOKIE,
    value: locale,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
