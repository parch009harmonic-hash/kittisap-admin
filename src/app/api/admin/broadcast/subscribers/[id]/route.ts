import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  deleteNewsletterSubscriberApi,
  hardDeleteNewsletterSubscriberApi,
  restoreNewsletterSubscriberApi,
  updateNewsletterSubscriberApi,
} from "../../../../../../../lib/db/broadcast";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function mapStatus(message: string) {
  if (message === "Unauthorized") return 401;
  if (message === "Not authorized to manage broadcast") return 403;
  if (message === "Subscriber not found") return 404;
  if (message === "Only inactive subscriber can be permanently deleted") return 400;
  if (message === "Network unstable") return 503;
  return 500;
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const payload = await request.json();
    const data = await updateNewsletterSubscriberApi(id, payload);
    return NextResponse.json({ ok: true, data }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { ok: false, code: "INVALID_REQUEST", error: error.issues.map((issue) => issue.message).join(", ") },
        { status: 400 },
      );
    }
    const message = error instanceof Error ? error.message : "Failed to update subscriber";
    return NextResponse.json({ ok: false, code: "BROADCAST_SUBSCRIBER_UPDATE_FAILED", error: message }, { status: mapStatus(message) });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const mode = request.nextUrl.searchParams.get("mode");
    if (mode === "hard") {
      await hardDeleteNewsletterSubscriberApi(id);
    } else {
      await deleteNewsletterSubscriberApi(id);
    }
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete subscriber";
    return NextResponse.json({ ok: false, code: "BROADCAST_SUBSCRIBER_DELETE_FAILED", error: message }, { status: mapStatus(message) });
  }
}

export async function POST(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const data = await restoreNewsletterSubscriberApi(id);
    return NextResponse.json({ ok: true, data }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to restore subscriber";
    return NextResponse.json({ ok: false, code: "BROADCAST_SUBSCRIBER_RESTORE_FAILED", error: message }, { status: mapStatus(message) });
  }
}
