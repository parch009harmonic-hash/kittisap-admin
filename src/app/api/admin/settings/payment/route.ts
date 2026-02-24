import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { getAdminActor } from "../../../../../../lib/auth/admin";
import { getPaymentSettingsApi, updatePaymentSettingsApi } from "../../../../../../lib/db/payment-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function mapStatus(message: string) {
  if (message === "Unauthorized") {
    return 401;
  }
  if (message === "Not authorized to manage users") {
    return 403;
  }
  if (message === "Network unstable") {
    return 503;
  }
  return 500;
}

async function assertAdminOnly() {
  const actor = await getAdminActor();
  if (!actor || actor.role !== "admin") {
    throw new Error("Not authorized to manage users");
  }
}

export async function GET() {
  try {
    await assertAdminOnly();
    const settings = await getPaymentSettingsApi();
    return NextResponse.json({ ok: true, data: settings }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load payment settings";
    return NextResponse.json({ ok: false, code: "PAYMENT_SETTINGS_FETCH_FAILED", error: message }, { status: mapStatus(message) });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await assertAdminOnly();
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
