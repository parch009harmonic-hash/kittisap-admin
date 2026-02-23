import { NextRequest, NextResponse } from "next/server";

import { PublicOrderError, uploadPublicOrderSlip } from "../../../../../../../lib/db/public-orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type UploadSlipRouteProps = {
  params: Promise<{ order_no: string }>;
};

function mapAuthStatus(message: string) {
  if (message === "Unauthorized") return 401;
  if (message === "Network unstable") return 503;
  return null;
}

export async function POST(request: NextRequest, { params }: UploadSlipRouteProps) {
  try {
    const { order_no } = await params;
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, code: "INVALID_FILE", error: "File is required" }, { status: 400 });
    }

    const data = await uploadPublicOrderSlip(order_no, file);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    if (error instanceof PublicOrderError) {
      return NextResponse.json({ ok: false, code: error.code, error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Failed to upload slip";
    const auth = mapAuthStatus(message);
    if (auth) {
      return NextResponse.json({ ok: false, code: auth === 401 ? "AUTH_REQUIRED" : "NETWORK_UNSTABLE", error: message }, { status: auth });
    }

    return NextResponse.json({ ok: false, code: "SLIP_UPLOAD_FAILED", error: message }, { status: 500 });
  }
}
