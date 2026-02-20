import { NextRequest, NextResponse } from "next/server";

import { requireAdminApi } from "../../../../../../lib/auth/admin";
import { takeRateLimitToken } from "../../../../../../lib/security/rate-limit";
import { getSupabaseServiceRoleClient } from "../../../../../../lib/supabase/service";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_CONTENT_LENGTH_BYTES = MAX_FILE_SIZE_BYTES + 512 * 1024;
const UPLOAD_LIMIT = 20;
const UPLOAD_WINDOW_MS = 60 * 1000;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdminApi();
    const rate = takeRateLimitToken(`upload:${user.id}`, {
      limit: UPLOAD_LIMIT,
      windowMs: UPLOAD_WINDOW_MS,
    });
    if (!rate.ok) {
      return NextResponse.json(
        {
          error: "Too many upload requests. Please wait and try again.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.max(Math.ceil((rate.resetAt - Date.now()) / 1000), 1)),
            "Cache-Control": "no-store, max-age=0",
          },
        }
      );
    }

    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (Number.isFinite(contentLength) && contentLength > MAX_CONTENT_LENGTH_BYTES) {
      return NextResponse.json(
        { error: "Request payload is too large" },
        { status: 413 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const rawProductId = String(formData.get("productId") ?? "temp").trim();
    const productId = /^[a-f0-9-]{36}$/i.test(rawProductId) ? rawProductId : "temp";

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: "Image size must be 5MB or smaller" }, { status: 400 });
    }

    const supabase = getSupabaseServiceRoleClient();

    const ext = file.name.split(".").pop() ?? "jpg";
    const safeExt = ext.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const filePath = `products/${productId}/${crypto.randomUUID()}.${safeExt}`;

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data } = supabase.storage.from("product-images").getPublicUrl(filePath);

    return NextResponse.json(
      {
        path: filePath,
        url: data.publicUrl,
        remaining: rate.remaining,
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message === "Not authorized to manage users") {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
