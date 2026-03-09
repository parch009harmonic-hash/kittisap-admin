import "server-only";

import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { getAdminActor, requireAdminApi } from "../auth/admin";
import { assertUiWriteAllowed } from "../maintenance/ui-maintenance-guard";
import { getSupabaseServiceRoleClient } from "../supabase/service";
import { updateAdminUser, listAdminUsers, deleteAdminUser } from "./admin-users";
import { CustomerAccountDeletionError, finalizeCustomerAccountDeletion } from "./customer-account-deletion";

export type CustomerDeletionStatus = "active" | "pending_delete" | "purged" | "unknown";
export type CustomerKycStatus = "not_started" | "in_progress" | "pending_review" | "approved" | "rejected" | "blocked" | "unknown";
export type AdminOtpPurpose = "forgot_password" | "change_password" | "account_delete" | "account_recovery" | "other";

export type AdminCustomerUserRecord = {
  id: string;
  email: string;
  displayName: string;
  role: "customer";
  createdAt: string | null;
  phone: string;
  address: string;
  deletionStatus: CustomerDeletionStatus;
  deletionRequestedAt: string | null;
  deletionScheduledFor: string | null;
  deletionReason: string | null;
  recoveredAt: string | null;
  isActive: boolean | null;
  kycStatus: CustomerKycStatus;
  kycApprovedAt: string | null;
  kycRejectedReason: string | null;
};

export type AdminCustomerUserLogRecord = {
  id: string;
  action: "request" | "recover" | "finalize" | "blocked_pending_orders" | "unknown";
  reason: string | null;
  actorUserId: string | null;
  createdAt: string | null;
  metadata: Record<string, unknown>;
};

const UpdateCustomerUserSchema = z.object({
  userId: z.string().uuid(),
  action: z.enum(["update", "recover", "send_otp"]).optional(),
  displayName: z.string().trim().min(1).max(120).optional(),
  email: z.string().trim().email().optional(),
  password: z.string().trim().min(6).max(128).optional(),
  phone: z.string().trim().max(64).optional(),
  address: z.string().trim().max(500).optional(),
  kycStatus: z.enum(["not_started", "in_progress", "pending_review", "approved", "rejected", "blocked"]).optional(),
  kycRejectedReason: z.string().trim().max(800).optional(),
  otpPurpose: z.enum(["forgot_password", "change_password", "account_delete", "account_recovery", "other"]).optional(),
});

const DeleteCustomerUserSchema = z.object({
  userId: z.string().uuid(),
});

function errorText(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message || fallback);
  }
  return fallback;
}

function isMissingColumnError(error: unknown) {
  const message = errorText(error, "").toLowerCase();
  return (
    message.includes("column") &&
    (message.includes("does not exist") || message.includes("could not find") || message.includes("schema cache"))
  );
}

function toDisplayName(value: unknown, fallback: string) {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return fallback;
}

function toNullableString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function toDeletionStatus(value: unknown): CustomerDeletionStatus {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "active" || normalized === "pending_delete" || normalized === "purged") {
    return normalized;
  }
  return "unknown";
}

function toKycStatus(value: unknown): CustomerKycStatus {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (
    normalized === "not_started" ||
    normalized === "in_progress" ||
    normalized === "pending_review" ||
    normalized === "approved" ||
    normalized === "rejected" ||
    normalized === "blocked"
  ) {
    return normalized;
  }
  return "unknown";
}

function toDeletionAction(
  value: unknown,
): "request" | "recover" | "finalize" | "blocked_pending_orders" | "unknown" {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (
    normalized === "request" ||
    normalized === "recover" ||
    normalized === "finalize" ||
    normalized === "blocked_pending_orders"
  ) {
    return normalized;
  }
  return "unknown";
}

async function assertAdminRole() {
  await requireAdminApi();
  const actor = await getAdminActor();
  if (!actor) {
    throw new Error("Unauthorized");
  }
  if (actor.role !== "admin") {
    throw new Error("Only admin can manage users");
  }
  return actor;
}

function getSupabaseAnonClient() {
  const supabaseUrl = String(process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "").trim();
  const supabaseAnonKey = String(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function isRateLimitError(message: string) {
  const lower = message.toLowerCase();
  return lower.includes("rate limit") || lower.includes("too many");
}

async function appendAdminOtpAuditLog(input: {
  customerId: string;
  actorUserId: string;
  otpPurpose: AdminOtpPurpose;
  email: string;
}) {
  const supabase = getSupabaseServiceRoleClient();
  const result = await supabase.from("customer_kyc_audit_logs").insert({
    customer_id: input.customerId,
    session_id: null,
    event_type: "admin_otp_sent",
    event_status: "sent",
    metadata: {
      actorUserId: input.actorUserId,
      otpPurpose: input.otpPurpose,
      email: input.email,
      source: "admin_customer_users",
    },
  });

  if (!result.error) {
    return;
  }

  const message = errorText(result.error, "Unknown error").toLowerCase();
  const missingLogTable = message.includes("customer_kyc_audit_logs")
    && (message.includes("does not exist") || message.includes("schema cache") || message.includes("could not find"));
  if (missingLogTable) {
    return;
  }
}

async function upsertCustomerProfileCompat(userId: string, payload: { email?: string; full_name?: string; phone?: string; address?: string }) {
  const supabase = getSupabaseServiceRoleClient();
  const attempts: Array<Record<string, unknown>> = [
    { id: userId, ...payload },
    { id: userId, email: payload.email, full_name: payload.full_name, phone: payload.phone },
    { id: userId, email: payload.email, full_name: payload.full_name },
    { id: userId },
  ].map((item) => Object.fromEntries(Object.entries(item).filter(([, value]) => value !== undefined)));

  let lastError: unknown = null;
  for (const attemptPayload of attempts) {
    const attempt = await supabase.from("customer_profiles").upsert(attemptPayload, { onConflict: "id" });
    if (!attempt.error) {
      return;
    }
    lastError = attempt.error;
    if (!isMissingColumnError(attempt.error)) {
      throw new Error(`Failed to update customer profile: ${errorText(attempt.error, "Unknown error")}`);
    }
  }

  if (lastError) {
    throw new Error(`Failed to update customer profile: ${errorText(lastError, "Unknown error")}`);
  }
}

async function recoverCustomerProfileByAdmin(userId: string) {
  const supabase = getSupabaseServiceRoleClient();
  const nowIso = new Date().toISOString();
  const attempts: Array<Record<string, unknown>> = [
    {
      id: userId,
      deletion_status: "active",
      deletion_requested_at: null,
      deletion_scheduled_for: null,
      deletion_reason: null,
      recovered_at: nowIso,
      is_active: true,
    },
    {
      id: userId,
      is_active: true,
    },
    {
      id: userId,
    },
  ];

  let lastError: unknown = null;
  for (const payload of attempts) {
    const attempt = await supabase.from("customer_profiles").upsert(payload, { onConflict: "id" });
    if (!attempt.error) {
      return;
    }
    lastError = attempt.error;
    if (!isMissingColumnError(attempt.error)) {
      throw new Error(`Failed to recover customer account: ${errorText(attempt.error, "Unknown error")}`);
    }
  }

  if (lastError) {
    throw new Error(`Failed to recover customer account: ${errorText(lastError, "Unknown error")}`);
  }
}

async function upsertCustomerKycProfileByAdmin(userId: string, input: { kycStatus: Exclude<CustomerKycStatus, "unknown">; kycRejectedReason?: string }) {
  const supabase = getSupabaseServiceRoleClient();
  const nowIso = new Date().toISOString();
  const normalizedReason = toNullableString(input.kycRejectedReason);
  const payload: Record<string, unknown> = {
    customer_id: userId,
    kyc_status: input.kycStatus,
    kyc_level: input.kycStatus === "approved" ? "basic" : "none",
    approved_at: input.kycStatus === "approved" ? nowIso : null,
    rejected_reason: input.kycStatus === "rejected" ? normalizedReason : null,
    provider: "admin-manual",
  };

  const result = await supabase.from("customer_kyc_profiles").upsert(payload, { onConflict: "customer_id" });
  if (!result.error) {
    return;
  }

  const message = errorText(result.error, "Unknown error");
  const lower = message.toLowerCase();
  if (lower.includes("customer_kyc_profiles") && (lower.includes("does not exist") || lower.includes("schema cache"))) {
    throw new Error("KYC schema is incomplete. Please run sql/ensure-customer-kyc.sql and try again.");
  }
  throw new Error(`Failed to update customer KYC profile: ${message}`);
}

async function sendOtpToCustomerByAdmin(input: { userId: string; otpPurpose: AdminOtpPurpose; actorUserId: string }) {
  const users = await listAdminUsers();
  const target = users.find((item) => item.id === input.userId && item.role === "customer");
  if (!target || !target.email) {
    throw new Error("Customer user not found.");
  }

  const supabase = getSupabaseAnonClient();
  const normalizedEmail = target.email.trim().toLowerCase();
  const otpRequest = await supabase.auth.signInWithOtp({
    email: normalizedEmail,
    options: {
      shouldCreateUser: false,
    },
  });

  if (!otpRequest.error) {
    await appendAdminOtpAuditLog({
      customerId: input.userId,
      actorUserId: input.actorUserId,
      otpPurpose: input.otpPurpose,
      email: normalizedEmail,
    });
    return { email: normalizedEmail, otpPurpose: input.otpPurpose };
  }

  if (isRateLimitError(otpRequest.error.message)) {
    throw new Error("Too many OTP requests for this user. Please try again later.");
  }
  throw new Error(`Failed to send OTP: ${otpRequest.error.message}`);
}

export async function listAdminCustomerUsers(): Promise<AdminCustomerUserRecord[]> {
  await assertAdminRole();
  const users = await listAdminUsers();
  const customerUsers = users.filter((item) => item.role === "customer");
  if (customerUsers.length === 0) {
    return [];
  }

  const supabase = getSupabaseServiceRoleClient();
  const customerIds = customerUsers.map((item) => item.id);
  const mapById = new Map<string, Record<string, unknown>>();
  const kycById = new Map<string, Record<string, unknown>>();

  const rows = await supabase
    .from("customer_profiles")
    .select(
      "id,email,full_name,phone,address,created_at,deletion_status,deletion_requested_at,deletion_scheduled_for,deletion_reason,recovered_at,is_active",
    )
    .in("id", customerIds);

  let profileError = rows.error;
  let profileData = rows.data as Array<Record<string, unknown>> | null;

  if (profileError && isMissingColumnError(profileError)) {
    const fallback = await supabase
      .from("customer_profiles")
      .select("id,email,full_name,phone,address,created_at")
      .in("id", customerIds);
    profileError = fallback.error;
    profileData = fallback.data as Array<Record<string, unknown>> | null;
  }

  if (profileError && !isMissingColumnError(profileError)) {
    throw new Error(`Failed to load customer profiles: ${errorText(profileError, "Unknown error")}`);
  }

  for (const row of profileData ?? []) {
    const userId = String(row.id ?? "").trim();
    if (!userId) {
      continue;
    }
    mapById.set(userId, row);
  }

  const kycRows = await supabase
    .from("customer_kyc_profiles")
    .select("customer_id,kyc_status,approved_at,rejected_reason")
    .in("customer_id", customerIds);

  if (!kycRows.error) {
    for (const row of (kycRows.data ?? []) as Array<Record<string, unknown>>) {
      const userId = String(row.customer_id ?? "").trim();
      if (!userId) {
        continue;
      }
      kycById.set(userId, row);
    }
  } else {
    const message = errorText(kycRows.error, "Unknown error").toLowerCase();
    const missingKycTable = message.includes("customer_kyc_profiles")
      && (message.includes("does not exist") || message.includes("schema cache") || message.includes("could not find"));
    if (!missingKycTable) {
      throw new Error(`Failed to load customer KYC profiles: ${errorText(kycRows.error, "Unknown error")}`);
    }
  }

  const mapped = customerUsers.map((user) => {
    const profile = mapById.get(user.id) ?? {};
    const kyc = kycById.get(user.id) ?? {};
    const isActiveRaw = profile.is_active;
    return {
      id: user.id,
      email: toDisplayName(profile.email, user.email),
      displayName: toDisplayName(profile.full_name, user.displayName),
      role: "customer" as const,
      createdAt:
        (typeof user.createdAt === "string" && user.createdAt) ||
        (typeof profile.created_at === "string" ? profile.created_at : null) ||
        null,
      phone: toDisplayName(profile.phone, ""),
      address: toDisplayName(profile.address, ""),
      deletionStatus: toDeletionStatus(profile.deletion_status ?? "active"),
      deletionRequestedAt: toNullableString(profile.deletion_requested_at),
      deletionScheduledFor: toNullableString(profile.deletion_scheduled_for),
      deletionReason: toNullableString(profile.deletion_reason),
      recoveredAt: toNullableString(profile.recovered_at),
      isActive: typeof isActiveRaw === "boolean" ? isActiveRaw : true,
      kycStatus: toKycStatus(kyc.kyc_status ?? "not_started"),
      kycApprovedAt: toNullableString(kyc.approved_at),
      kycRejectedReason: toNullableString(kyc.rejected_reason),
    };
  });

  mapped.sort((a, b) => {
    const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
    const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;
    return bTime - aTime;
  });

  return mapped;
}

export async function listAdminCustomerUserLogs(userId: string): Promise<AdminCustomerUserLogRecord[]> {
  await assertAdminRole();
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    throw new Error("userId is required");
  }

  const supabase = getSupabaseServiceRoleClient();
  const logs = await supabase
    .from("customer_account_deletion_logs")
    .select("id,action,reason,actor_user_id,created_at,metadata")
    .eq("customer_id", normalizedUserId)
    .order("created_at", { ascending: false })
    .limit(120);

  if (logs.error) {
    const message = errorText(logs.error, "Unknown error").toLowerCase();
    if (
      message.includes("customer_account_deletion_logs") &&
      (message.includes("does not exist") || message.includes("schema cache") || message.includes("could not find"))
    ) {
      return [];
    }
    throw new Error(`Failed to load customer logs: ${errorText(logs.error, "Unknown error")}`);
  }

  return ((logs.data ?? []) as Array<Record<string, unknown>>).map((row) => {
    const metadataRaw = row.metadata;
    return {
      id: String(row.id ?? ""),
      action: toDeletionAction(row.action),
      reason: toNullableString(row.reason),
      actorUserId: toNullableString(row.actor_user_id),
      createdAt: toNullableString(row.created_at),
      metadata: metadataRaw && typeof metadataRaw === "object" ? (metadataRaw as Record<string, unknown>) : {},
    };
  });
}

export async function updateAdminCustomerUser(input: unknown) {
  const actor = await assertAdminRole();
  await assertUiWriteAllowed({
    path: "/admin/settings",
    actorRole: actor.role,
  });

  const parsed = UpdateCustomerUserSchema.parse(input);
  const normalizedEmail = parsed.email?.toLowerCase();

  if (parsed.action === "send_otp") {
    return sendOtpToCustomerByAdmin({
      userId: parsed.userId,
      otpPurpose: parsed.otpPurpose ?? "other",
      actorUserId: actor.user.id,
    });
  }

  if (parsed.action === "recover") {
    await recoverCustomerProfileByAdmin(parsed.userId);
    await updateAdminUser({
      userId: parsed.userId,
      role: "customer",
    });
    return { ok: true, status: "active" as const };
  }

  await updateAdminUser({
    userId: parsed.userId,
    role: "customer",
    displayName: parsed.displayName,
    email: normalizedEmail,
    password: parsed.password,
  });

  if (
    parsed.displayName !== undefined ||
    normalizedEmail !== undefined ||
    parsed.phone !== undefined ||
    parsed.address !== undefined
  ) {
    await upsertCustomerProfileCompat(parsed.userId, {
      email: normalizedEmail,
      full_name: parsed.displayName,
      phone: parsed.phone,
      address: parsed.address,
    });
  }

  if (parsed.kycStatus !== undefined) {
    await upsertCustomerKycProfileByAdmin(parsed.userId, {
      kycStatus: parsed.kycStatus,
      kycRejectedReason: parsed.kycRejectedReason,
    });
  }

  return { ok: true };
}

export async function deleteAdminCustomerUser(input: unknown) {
  const actor = await assertAdminRole();
  await assertUiWriteAllowed({
    path: "/admin/settings",
    actorRole: actor.role,
  });
  const parsed = DeleteCustomerUserSchema.parse(input);

  try {
    await finalizeCustomerAccountDeletion(parsed.userId, "admin_delete_customer_user");
    return { ok: true, mode: "finalize" as const };
  } catch (error) {
    if (!(error instanceof CustomerAccountDeletionError)) {
      throw error;
    }

    if (error.code === "DELETION_LOG_TABLE_MISSING" || error.code === "DELETION_LOG_FAILED") {
      return { ok: true, mode: "finalize" as const };
    }

    if (
      error.code === "PROFILE_NOT_FOUND" ||
      error.code === "DELETION_SCHEMA_MISSING" ||
      error.code === "PROFILE_FETCH_FAILED"
    ) {
      await deleteAdminUser({ userId: parsed.userId });
      return { ok: true, mode: "fallback_delete" as const };
    }

    throw error;
  }
}
