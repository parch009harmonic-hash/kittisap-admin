import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { getPaymentSettingsApi, updatePaymentSettingsApi } from "../../../../../../lib/db/payment-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function mapStatus(message: string) {
  if (message === "Unauthorized") {
    return 401;
  }
  if (message === "Network unstable") {
    return 503;
  }
  return 500;
}

export async function GET() {
  try {
    const settings = await getPaymentSettingsApi();
    return NextResponse.json({ ok: true, data: settings }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load payment settings";
    return NextResponse.json({ ok: false, code: "PAYMENT_SETTINGS_FETCH_FAILED", error: message }, { status: mapStatus(message) });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const payload = await request.json();
    const settings = await updatePaymentSettingsApi(payload);
    return NextResponse.json({ ok: true, data: settings }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { ok: false, code: "INVALID_REQUEST", error: error.issues.map((issue) => issue.message).join(", ") },
        { status: 400 },
      );
    }
    const message = error instanceof Error ? error.message : "Failed to update payment settings";
    return NextResponse.json({ ok: false, code: "PAYMENT_SETTINGS_UPDATE_FAILED", error: message }, { status: mapStatus(message) });
  }
}
