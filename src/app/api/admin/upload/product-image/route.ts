import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "../../../../../../lib/auth/admin";
import { takeRateLimitToken } from "../../../../../../lib/security/rate-limit";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_CONTENT_LENGTH_BYTES = MAX_FILE_SIZE_BYTES + 512 * 1024;
const UPLOAD_LIMIT = 20;
const UPLOAD_WINDOW_MS = 60 * 1000;

function getSupabaseEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return { supabaseUrl, supabaseAnonKey };
}

export async function POST(request: NextRequest) {
  const user = await requireAdmin();

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
        },
      }
    );
  }

  try {
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

    const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {
          // Route response does not need to mutate auth cookies here.
        },
      },
    });

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

    return NextResponse.json({
      path: filePath,
      url: data.publicUrl,
      remaining: rate.remaining,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
