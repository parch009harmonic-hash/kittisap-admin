import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { requireCustomerApi } from "../../../../../../lib/auth/customer";
import { getSupabaseServerClient } from "../../../../../../lib/supabase/server";
import { getSupabaseServiceRoleClient } from "../../../../../../lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const AVATAR_BUCKET = "profile-avatars";
const STORAGE_TIMEOUT_MS = 12_000;

function unauthorized(message: string) {
  if (message === "Unauthorized") {
    return NextResponse.json({ ok: false, code: "AUTH_REQUIRED", error: message }, { status: 401 });
  }
  if (message === "Network unstable") {
    return NextResponse.json({ ok: false, code: "NETWORK_UNSTABLE", error: message }, { status: 503 });
  }
  return null;
}

function fileExtFromMimeType(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

function isTransientNetworkMessage(message: string) {
  const text = message.toLowerCase();
  return (
    text.includes("timed out")
    || text.includes("fetch failed")
    || text.includes("network")
    || text.includes("connect timeout")
    || text.includes("und_err_connect_timeout")
    || text.includes("enotfound")
    || text.includes("eai_again")
  );
}

function isMissingAvatarColumnError(error: unknown) {
  const message = String((error as { message?: string } | null)?.message ?? error ?? "").toLowerCase();
  return message.includes("avatar_url") && message.includes("column") && (message.includes("does not exist") || message.includes("schema cache"));
}

function parseAvatarObjectPathFromPublicUrl(url: string) {
  const marker = `/storage/v1/object/public/${AVATAR_BUCKET}/`;
  const markerIndex = url.indexOf(marker);
  if (markerIndex < 0) {
    return null;
  }
  const objectPath = url.slice(markerIndex + marker.length).trim();
  return objectPath || null;
}

function errorMessage(error: unknown) {
  return String((error as { message?: string } | null)?.message ?? error ?? "").trim();
}

function isBucketNotFoundError(error: unknown) {
  const message = errorMessage(error).toLowerCase();
  return message.includes("bucket") && message.includes("not found");
}

function isAlreadyExistsError(error: unknown) {
  const message = errorMessage(error).toLowerCase();
  return message.includes("already exists") || message.includes("duplicate");
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

async function ensureAvatarBucketExists(supabase: SupabaseClient) {
  const created = await withTimeout(
    supabase.storage.createBucket(AVATAR_BUCKET, { public: true }),
    STORAGE_TIMEOUT_MS,
    "Create avatar bucket",
  );
  if (created.error && !isAlreadyExistsError(created.error)) {
    throw new Error(created.error.message);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireCustomerApi();
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, code: "INVALID_FILE", error: "Image file is required" }, { status: 400 });
    }

    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { ok: false, code: "FILE_TOO_LARGE", error: "Image size must be between 1 byte and 5MB" },
        { status: 400 },
      );
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { ok: false, code: "INVALID_FILE_TYPE", error: "Only JPG, PNG, and WEBP are allowed" },
        { status: 400 },
      );
    }

    const serviceSupabase = getSupabaseServiceRoleClient();
    const ext = fileExtFromMimeType(file);
    const filePath = `customer-avatars/${actor.user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

    let uploadResult = await withTimeout(
      serviceSupabase.storage.from(AVATAR_BUCKET).upload(filePath, file, { contentType: file.type, upsert: false }),
      STORAGE_TIMEOUT_MS,
      "Avatar upload",
    );

    if (uploadResult.error && isBucketNotFoundError(uploadResult.error)) {
      await ensureAvatarBucketExists(serviceSupabase);
      uploadResult = await withTimeout(
        serviceSupabase.storage.from(AVATAR_BUCKET).upload(filePath, file, { contentType: file.type, upsert: false }),
        STORAGE_TIMEOUT_MS,
        "Avatar upload retry",
      );
    }

    if (uploadResult.error) {
      return NextResponse.json(
        { ok: false, code: "AVATAR_UPLOAD_FAILED", error: uploadResult.error.message },
        { status: 500 },
      );
    }

    const publicData = serviceSupabase.storage.from(AVATAR_BUCKET).getPublicUrl(filePath).data;
    const avatarUrl = String(publicData.publicUrl ?? "").trim();
    if (!avatarUrl) {
      return NextResponse.json(
        { ok: false, code: "AVATAR_URL_FAILED", error: "Failed to build avatar URL" },
        { status: 500 },
      );
    }

    const currentMeta =
      actor.user.user_metadata && typeof actor.user.user_metadata === "object"
        ? (actor.user.user_metadata as Record<string, unknown>)
        : {};
    const authUpdate = await serviceSupabase.auth.admin.updateUserById(actor.user.id, {
      user_metadata: {
        ...currentMeta,
        avatar_url: avatarUrl,
      },
    });

    let persistedToProfile = false;
    const supabase = await getSupabaseServerClient();
    const profileUpdate = await supabase.from("customer_profiles").update({ avatar_url: avatarUrl }).eq("id", actor.user.id);
    if (!profileUpdate.error) {
      persistedToProfile = true;
    } else if (!isMissingAvatarColumnError(profileUpdate.error)) {
      return NextResponse.json(
        { ok: false, code: "PROFILE_UPDATE_FAILED", error: profileUpdate.error.message },
        { status: 500 },
      );
    }

    if (authUpdate.error && !persistedToProfile) {
      return NextResponse.json(
        { ok: false, code: "AVATAR_METADATA_FAILED", error: authUpdate.error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        avatar_url: avatarUrl,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to upload profile image";
    const normalizedMessage = isTransientNetworkMessage(message) ? "Network unstable" : message;
    const authResponse = unauthorized(normalizedMessage);
    if (authResponse) {
      return authResponse;
    }
    return NextResponse.json({ ok: false, code: "AVATAR_UPLOAD_FAILED", error: normalizedMessage }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const actor = await requireCustomerApi();
    const serviceSupabase = getSupabaseServiceRoleClient();
    const supabase = await getSupabaseServerClient();

    const profileRow = await supabase
      .from("customer_profiles")
      .select("avatar_url")
      .eq("id", actor.user.id)
      .maybeSingle();

    const currentAvatarUrl =
      String((profileRow.data as { avatar_url?: string } | null)?.avatar_url ?? "").trim()
      || String((actor.user.user_metadata as Record<string, unknown> | null)?.avatar_url ?? "").trim();

    let persistedToProfile = false;
    const profileUpdate = await supabase.from("customer_profiles").update({ avatar_url: "" }).eq("id", actor.user.id);
    if (!profileUpdate.error) {
      persistedToProfile = true;
    } else if (!isMissingAvatarColumnError(profileUpdate.error)) {
      return NextResponse.json(
        { ok: false, code: "PROFILE_UPDATE_FAILED", error: profileUpdate.error.message },
        { status: 500 },
      );
    }

    const currentMeta =
      actor.user.user_metadata && typeof actor.user.user_metadata === "object"
        ? (actor.user.user_metadata as Record<string, unknown>)
        : {};
    const authUpdate = await serviceSupabase.auth.admin.updateUserById(actor.user.id, {
      user_metadata: {
        ...currentMeta,
        avatar_url: "",
      },
    });

    if (authUpdate.error && !persistedToProfile) {
      return NextResponse.json(
        { ok: false, code: "AVATAR_METADATA_FAILED", error: authUpdate.error.message },
        { status: 500 },
      );
    }

    const objectPath = parseAvatarObjectPathFromPublicUrl(currentAvatarUrl);
    if (objectPath && objectPath.startsWith(`customer-avatars/${actor.user.id}/`)) {
      // Best-effort cleanup for old uploaded avatar file.
      await serviceSupabase.storage.from(AVATAR_BUCKET).remove([objectPath]);
    }

    return NextResponse.json({ ok: true, data: { avatar_url: "" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to remove profile image";
    const authResponse = unauthorized(message);
    if (authResponse) {
      return authResponse;
    }
    return NextResponse.json({ ok: false, code: "AVATAR_REMOVE_FAILED", error: message }, { status: 500 });
  }
}
