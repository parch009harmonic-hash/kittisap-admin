import { NextRequest, NextResponse } from "next/server";

import { getAdminActor, requireAdminApi } from "../../../../../../lib/auth/admin";
import { getSupabaseServiceRoleClient } from "../../../../../../lib/supabase/service";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await requireAdminApi();
    const actor = await getAdminActor();
    if (!actor || actor.role !== "admin") {
      return NextResponse.json({ error: "Not authorized to manage payment settings" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
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
    const ext = file.name.split(".").pop() ?? "png";
    const safeExt = ext.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
    const filePath = `payment-qrs/${crypto.randomUUID()}.${safeExt}`;

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(filePath, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data } = supabase.storage.from("product-images").getPublicUrl(filePath);
    return NextResponse.json({ url: data.publicUrl }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
