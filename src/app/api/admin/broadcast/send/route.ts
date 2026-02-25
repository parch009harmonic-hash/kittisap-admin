import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { sendBroadcastApi } from "../../../../../../lib/db/broadcast";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function mapStatus(message: string) {
  if (message === "Unauthorized") return 401;
  if (message === "Not authorized to manage broadcast") return 403;
  if (message === "No subscribers found for this send mode") return 400;
  if (message === "Network unstable") return 503;
  return 500;
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const data = await sendBroadcastApi(payload);
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

    const message = error instanceof Error ? error.message : "Failed to send broadcast";
    return NextResponse.json({ ok: false, code: "BROADCAST_SEND_FAILED", error: message }, { status: mapStatus(message) });
  }
}
