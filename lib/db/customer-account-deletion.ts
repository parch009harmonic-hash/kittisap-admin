import "server-only";

import { getSupabaseServiceRoleClient } from "../supabase/service";

const DELETION_GRACE_PERIOD_MS = 3 * 24 * 60 * 60 * 1000;
const AVATAR_BUCKET = "profile-avatars";
const ANONYMIZED_CUSTOMER_NAME = "Deleted Customer";
const ANONYMIZED_CUSTOMER_PHONE = "";
const ANONYMIZED_CUSTOMER_EMAIL = "";
const BLOCKING_ORDER_STATUSES = ["pending_payment", "pending_review", "paid", "processing", "shipped"] as const;

export class CustomerAccountDeletionError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "CustomerAccountDeletionError";
    this.status = status;
    this.code = code;
  }
}

function normalizeErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message ?? "").trim();
  }
  return String(error ?? "").trim();
}

function isMissingColumnErrorMessage(message: string) {
  const lower = message.toLowerCase();
  return lower.includes("column")
    && (lower.includes("does not exist") || lower.includes("schema cache") || lower.includes("could not find"));
}

function isMissingDeletionSchemaError(error: unknown) {
  const message = normalizeErrorMessage(error);
  if (!isMissingColumnErrorMessage(message)) {
    return false;
  }
  const lower = message.toLowerCase();
  return lower.includes("deletion_status")
    || lower.includes("deletion_requested_at")
    || lower.includes("deletion_scheduled_for")
    || lower.includes("deletion_reason")
    || lower.includes("recovered_at")
    || lower.includes("is_active");
}

function isMissingAvatarColumnError(error: unknown) {
  const message = normalizeErrorMessage(error);
  if (!isMissingColumnErrorMessage(message)) {
    return false;
  }
  return message.toLowerCase().includes("avatar_url");
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

function getSupabaseAnonEnv() {
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "").trim();
  const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new CustomerAccountDeletionError(500, "SUPABASE_ENV_MISSING", "Missing Supabase URL or anon key");
  }
  return { supabaseUrl: supabaseUrl.replace(/\/+$/, ""), supabaseAnonKey };
}

async function verifyCustomerPassword(email: string, password: string) {
  const normalizedEmail = String(email ?? "").trim();
  const normalizedPassword = String(password ?? "");
  if (!normalizedEmail || !normalizedPassword) {
    throw new CustomerAccountDeletionError(400, "PASSWORD_REQUIRED", "Password is required");
  }

  const { supabaseUrl, supabaseAnonKey } = getSupabaseAnonEnv();
  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify({
      email: normalizedEmail,
      password: normalizedPassword,
    }),
    cache: "no-store",
  });

  if (response.ok) {
    return;
  }

  throw new CustomerAccountDeletionError(401, "INVALID_PASSWORD", "Password is invalid");
}

async function appendDeletionLog(input: {
  customerId: string;
  action: "request" | "recover" | "finalize" | "blocked_pending_orders";
  reason?: string | null;
  actorUserId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const supabase = getSupabaseServiceRoleClient();
  const { error } = await supabase.from("customer_account_deletion_logs").insert({
    customer_id: input.customerId,
    action: input.action,
    reason: String(input.reason ?? "").trim() || null,
    actor_user_id: input.actorUserId ?? null,
    metadata: input.metadata ?? {},
  });

  if (error) {
    const message = normalizeErrorMessage(error);
    const lower = message.toLowerCase();
    if (lower.includes("customer_account_deletion_logs") && (lower.includes("does not exist") || lower.includes("schema cache"))) {
      throw new CustomerAccountDeletionError(
        503,
        "DELETION_LOG_TABLE_MISSING",
        "Missing customer_account_deletion_logs table. Run sql/ensure-customer-account-deletion.sql first.",
      );
    }
    throw new CustomerAccountDeletionError(500, "DELETION_LOG_FAILED", normalizeErrorMessage(error) || "Failed to write deletion log");
  }
}

async function getCustomerProfileDeletionRow(customerId: string) {
  const supabase = getSupabaseServiceRoleClient();
  let { data, error } = await supabase
    .from("customer_profiles")
    .select("id,avatar_url,deletion_status,deletion_requested_at,deletion_scheduled_for,deletion_reason")
    .eq("id", customerId)
    .maybeSingle();

  if (error) {
    const missingAvatarColumn = isMissingAvatarColumnError(error);
    if (missingAvatarColumn) {
      const fallback = await supabase
        .from("customer_profiles")
        .select("id,deletion_status,deletion_requested_at,deletion_scheduled_for,deletion_reason")
        .eq("id", customerId)
        .maybeSingle();
      data = fallback.data
        ? { ...fallback.data, avatar_url: null }
        : fallback.data;
      error = fallback.error;
    }
  }

  if (error) {
    const message = normalizeErrorMessage(error);
    if (isMissingDeletionSchemaError(error)) {
      throw new CustomerAccountDeletionError(
        503,
        "DELETION_SCHEMA_MISSING",
        "Missing deletion columns. Run sql/ensure-customer-account-deletion.sql first.",
      );
    }
    throw new CustomerAccountDeletionError(500, "PROFILE_FETCH_FAILED", message || "Failed to load profile");
  }
  if (!data) {
    throw new CustomerAccountDeletionError(404, "PROFILE_NOT_FOUND", "Customer profile was not found");
  }

  return data as {
    id: string;
    avatar_url?: string | null;
    deletion_status?: string | null;
    deletion_requested_at?: string | null;
    deletion_scheduled_for?: string | null;
    deletion_reason?: string | null;
  };
}

async function resolveCustomerIdByEmail(email: string) {
  const normalizedEmail = String(email ?? "").trim().toLowerCase();
  if (!normalizedEmail) {
    throw new CustomerAccountDeletionError(400, "EMAIL_REQUIRED", "Email is required");
  }

  const supabase = getSupabaseServiceRoleClient();
  const byProfile = await supabase
    .from("customer_profiles")
    .select("id")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (!byProfile.error && byProfile.data?.id) {
    return String(byProfile.data.id);
  }

  const message = normalizeErrorMessage(byProfile.error);
  const lower = message.toLowerCase();
  if (byProfile.error && !(
    lower.includes("column") && lower.includes("email")
  )) {
    throw new CustomerAccountDeletionError(500, "DELETION_EMAIL_LOOKUP_FAILED", message || "Failed to resolve user");
  }

  // Fallback for old rows without `customer_profiles.email` data.
  let page = 1;
  const perPage = 200;
  while (page <= 5) {
    const listed = await supabase.auth.admin.listUsers({ page, perPage });
    if (listed.error) {
      throw new CustomerAccountDeletionError(500, "DELETION_EMAIL_LOOKUP_FAILED", normalizeErrorMessage(listed.error) || "Failed to resolve user");
    }
    const users = listed.data?.users ?? [];
    const found = users.find((item) => String(item.email ?? "").trim().toLowerCase() === normalizedEmail);
    if (found?.id) {
      return String(found.id);
    }
    if (users.length < perPage) {
      break;
    }
    page += 1;
  }

  throw new CustomerAccountDeletionError(404, "PROFILE_NOT_FOUND", "Customer profile was not found");
}

async function ensureNoBlockingOrders(customerId: string) {
  const supabase = getSupabaseServiceRoleClient();
  const { count, error } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", customerId)
    .in("status", [...BLOCKING_ORDER_STATUSES]);

  if (error) {
    throw new CustomerAccountDeletionError(500, "ORDER_CHECK_FAILED", normalizeErrorMessage(error) || "Failed to verify orders");
  }
  if ((count ?? 0) > 0) {
    throw new CustomerAccountDeletionError(
      409,
      "PENDING_ORDERS_BLOCK_DELETE",
      "You have pending orders. Contact admin for account deletion.",
    );
  }
}

export async function requestCustomerAccountDeletion(input: {
  customerId: string;
  email: string;
  password: string;
  reason?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const customerId = input.customerId.trim();
  if (!customerId) {
    throw new CustomerAccountDeletionError(400, "INVALID_CUSTOMER_ID", "Customer id is required");
  }

  const profileRow = await getCustomerProfileDeletionRow(customerId);
  await verifyCustomerPassword(input.email, input.password);
  const status = String(profileRow.deletion_status ?? "active").trim().toLowerCase();
  const now = Date.now();
  const scheduledForIso = new Date(now + DELETION_GRACE_PERIOD_MS).toISOString();

  if (status === "pending_delete") {
    throw new CustomerAccountDeletionError(409, "DELETION_ALREADY_PENDING", "Deletion is already scheduled");
  }

  try {
    await ensureNoBlockingOrders(customerId);
  } catch (error) {
    await appendDeletionLog({
      customerId,
      action: "blocked_pending_orders",
      reason: input.reason,
      actorUserId: customerId,
      metadata: {
        ip: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
    throw error;
  }

  const supabase = getSupabaseServiceRoleClient();
  const { error: updateError } = await supabase
    .from("customer_profiles")
    .update({
      deletion_status: "pending_delete",
      deletion_requested_at: new Date(now).toISOString(),
      deletion_scheduled_for: scheduledForIso,
      deletion_reason: input.reason?.trim() || null,
      recovered_at: null,
      is_active: false,
    })
    .eq("id", customerId);

  if (updateError) {
    const message = normalizeErrorMessage(updateError);
    if (isMissingDeletionSchemaError(updateError)) {
      throw new CustomerAccountDeletionError(
        503,
        "DELETION_SCHEMA_MISSING",
        "Missing deletion columns. Run sql/ensure-customer-account-deletion.sql first.",
      );
    }
    throw new CustomerAccountDeletionError(500, "DELETION_REQUEST_FAILED", message || "Failed to schedule deletion");
  }

  await appendDeletionLog({
    customerId,
    action: "request",
    reason: input.reason,
    actorUserId: customerId,
    metadata: {
      previousStatus: status,
      previousScheduledFor: profileRow.deletion_scheduled_for ?? null,
      ip: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
  });

  return {
    status: "pending_delete" as const,
    scheduledFor: scheduledForIso,
  };
}

export async function recoverCustomerAccountDeletion(input: {
  customerId: string;
  email: string;
  password: string;
  faceScanPassed: boolean;
  faceScanMethod?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const customerId = input.customerId.trim();
  if (!customerId) {
    throw new CustomerAccountDeletionError(400, "INVALID_CUSTOMER_ID", "Customer id is required");
  }
  if (!input.faceScanPassed) {
    throw new CustomerAccountDeletionError(400, "FACE_SCAN_REQUIRED", "Face scan verification is required");
  }

  const profileRow = await getCustomerProfileDeletionRow(customerId);
  const status = String(profileRow.deletion_status ?? "active").trim().toLowerCase();
  if (status !== "pending_delete") {
    throw new CustomerAccountDeletionError(409, "DELETION_NOT_PENDING", "Account deletion is not pending");
  }

  const scheduledFor = profileRow.deletion_scheduled_for ? Date.parse(profileRow.deletion_scheduled_for) : Number.NaN;
  if (Number.isFinite(scheduledFor) && scheduledFor <= Date.now()) {
    throw new CustomerAccountDeletionError(410, "DELETION_RECOVERY_EXPIRED", "Recovery window has expired");
  }
  await verifyCustomerPassword(input.email, input.password);

  const supabase = getSupabaseServiceRoleClient();
  const { error: updateError } = await supabase
    .from("customer_profiles")
    .update({
      deletion_status: "active",
      deletion_requested_at: null,
      deletion_scheduled_for: null,
      deletion_reason: null,
      recovered_at: new Date().toISOString(),
      is_active: true,
    })
    .eq("id", customerId);

  if (updateError) {
    const message = normalizeErrorMessage(updateError);
    if (isMissingDeletionSchemaError(updateError)) {
      throw new CustomerAccountDeletionError(
        503,
        "DELETION_SCHEMA_MISSING",
        "Missing deletion columns. Run sql/ensure-customer-account-deletion.sql first.",
      );
    }
    throw new CustomerAccountDeletionError(500, "DELETION_RECOVER_FAILED", message || "Failed to recover account");
  }

  await appendDeletionLog({
    customerId,
    action: "recover",
    actorUserId: customerId,
    metadata: {
      faceScanMethod: input.faceScanMethod?.trim() || "camera",
      scheduledFor: profileRow.deletion_scheduled_for ?? null,
      ip: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
  });

  return {
    status: "active" as const,
    recoveredAt: new Date().toISOString(),
  };
}

export async function recoverCustomerAccountDeletionByEmailLink(input: {
  customerId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const customerId = input.customerId.trim();
  if (!customerId) {
    throw new CustomerAccountDeletionError(400, "INVALID_CUSTOMER_ID", "Customer id is required");
  }

  const profileRow = await getCustomerProfileDeletionRow(customerId);
  const status = String(profileRow.deletion_status ?? "active").trim().toLowerCase();
  if (status !== "pending_delete") {
    throw new CustomerAccountDeletionError(409, "DELETION_NOT_PENDING", "Account deletion is not pending");
  }

  const scheduledFor = profileRow.deletion_scheduled_for ? Date.parse(profileRow.deletion_scheduled_for) : Number.NaN;
  if (Number.isFinite(scheduledFor) && scheduledFor <= Date.now()) {
    throw new CustomerAccountDeletionError(410, "DELETION_RECOVERY_EXPIRED", "Recovery window has expired");
  }

  const supabase = getSupabaseServiceRoleClient();
  const { error: updateError } = await supabase
    .from("customer_profiles")
    .update({
      deletion_status: "active",
      deletion_requested_at: null,
      deletion_scheduled_for: null,
      deletion_reason: null,
      recovered_at: new Date().toISOString(),
      is_active: true,
    })
    .eq("id", customerId);

  if (updateError) {
    const message = normalizeErrorMessage(updateError);
    if (isMissingDeletionSchemaError(updateError)) {
      throw new CustomerAccountDeletionError(
        503,
        "DELETION_SCHEMA_MISSING",
        "Missing deletion columns. Run sql/ensure-customer-account-deletion.sql first.",
      );
    }
    throw new CustomerAccountDeletionError(500, "DELETION_RECOVER_FAILED", message || "Failed to recover account");
  }

  await appendDeletionLog({
    customerId,
    action: "recover",
    actorUserId: customerId,
    metadata: {
      recoveryMethod: "email_link",
      scheduledFor: profileRow.deletion_scheduled_for ?? null,
      ip: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
  });

  return {
    status: "active" as const,
    recoveredAt: new Date().toISOString(),
  };
}

export async function recoverCustomerAccountDeletionByCredential(input: {
  email: string;
  password: string;
  faceScanPassed: boolean;
  faceScanMethod?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const normalizedEmail = String(input.email ?? "").trim().toLowerCase();
  if (!normalizedEmail) {
    throw new CustomerAccountDeletionError(400, "EMAIL_REQUIRED", "Email is required");
  }
  const customerId = await resolveCustomerIdByEmail(normalizedEmail);
  return recoverCustomerAccountDeletion({
    customerId,
    email: normalizedEmail,
    password: input.password,
    faceScanPassed: input.faceScanPassed,
    faceScanMethod: input.faceScanMethod,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });
}

function isUserNotFoundError(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes("user not found") || normalized.includes("not found");
}

async function removeProfileAvatarIfAny(customerId: string, avatarUrl: string | null | undefined) {
  const normalized = String(avatarUrl ?? "").trim();
  const objectPath = parseAvatarObjectPathFromPublicUrl(normalized);
  if (!objectPath || !objectPath.startsWith(`customer-avatars/${customerId}/`)) {
    return;
  }
  const supabase = getSupabaseServiceRoleClient();
  await supabase.storage.from(AVATAR_BUCKET).remove([objectPath]);
}

export async function finalizeCustomerAccountDeletion(customerId: string, reason?: string) {
  const normalizedCustomerId = customerId.trim();
  if (!normalizedCustomerId) {
    throw new CustomerAccountDeletionError(400, "INVALID_CUSTOMER_ID", "Customer id is required");
  }

  const profileRow = await getCustomerProfileDeletionRow(normalizedCustomerId);
  const supabase = getSupabaseServiceRoleClient();

  await removeProfileAvatarIfAny(normalizedCustomerId, profileRow.avatar_url);

  const { error: orderUpdateError } = await supabase
    .from("orders")
    .update({
      customer_id: null,
      customer_name_snapshot: ANONYMIZED_CUSTOMER_NAME,
      customer_phone_snapshot: ANONYMIZED_CUSTOMER_PHONE,
      customer_email_snapshot: ANONYMIZED_CUSTOMER_EMAIL,
    })
    .eq("customer_id", normalizedCustomerId);

  if (orderUpdateError) {
    throw new CustomerAccountDeletionError(500, "ORDER_ANONYMIZE_FAILED", normalizeErrorMessage(orderUpdateError) || "Failed to anonymize orders");
  }

  const { error: slipUpdateError } = await supabase
    .from("payment_slips")
    .update({ customer_id: null })
    .eq("customer_id", normalizedCustomerId);

  if (slipUpdateError) {
    throw new CustomerAccountDeletionError(500, "SLIP_ANONYMIZE_FAILED", normalizeErrorMessage(slipUpdateError) || "Failed to anonymize payment slips");
  }

  const { error: deleteProfileError } = await supabase.from("customer_profiles").delete().eq("id", normalizedCustomerId);
  if (deleteProfileError) {
    throw new CustomerAccountDeletionError(500, "PROFILE_DELETE_FAILED", normalizeErrorMessage(deleteProfileError) || "Failed to delete profile");
  }

  await supabase.from("profiles").delete().eq("id", normalizedCustomerId);
  await supabase.from("profiles").delete().eq("user_id", normalizedCustomerId);

  const deleteUser = await supabase.auth.admin.deleteUser(normalizedCustomerId);
  if (deleteUser.error) {
    const message = normalizeErrorMessage(deleteUser.error);
    if (!isUserNotFoundError(message)) {
      throw new CustomerAccountDeletionError(500, "AUTH_USER_DELETE_FAILED", message || "Failed to delete auth user");
    }
  }

  await appendDeletionLog({
    customerId: normalizedCustomerId,
    action: "finalize",
    actorUserId: null,
    reason: reason ?? profileRow.deletion_reason ?? null,
    metadata: {
      requestedAt: profileRow.deletion_requested_at ?? null,
      scheduledFor: profileRow.deletion_scheduled_for ?? null,
    },
  });
}

export async function purgeDueCustomerAccountDeletions() {
  const supabase = getSupabaseServiceRoleClient();
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("customer_profiles")
    .select("id,deletion_scheduled_for")
    .eq("deletion_status", "pending_delete")
    .lte("deletion_scheduled_for", nowIso)
    .order("deletion_scheduled_for", { ascending: true })
    .limit(200);

  if (error) {
    throw new CustomerAccountDeletionError(500, "PURGE_FETCH_FAILED", normalizeErrorMessage(error) || "Failed to fetch due deletions");
  }

  const rows = (data ?? []) as Array<{ id?: string | null }>;
  let purged = 0;
  let failed = 0;
  const errors: Array<{ customerId: string; message: string }> = [];

  for (const row of rows) {
    const customerId = String(row.id ?? "").trim();
    if (!customerId) {
      continue;
    }
    try {
      await finalizeCustomerAccountDeletion(customerId, "auto_purge_after_3_days");
      purged += 1;
    } catch (errorCaught) {
      failed += 1;
      errors.push({
        customerId,
        message: normalizeErrorMessage(errorCaught) || "Unknown purge error",
      });
    }
  }

  return {
    scanned: rows.length,
    purged,
    failed,
    errors,
  };
}
