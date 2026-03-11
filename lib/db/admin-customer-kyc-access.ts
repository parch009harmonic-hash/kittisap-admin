import "server-only";

import { getBackofficeActor } from "../auth/admin";
import { issueAdminKycAccessToken, verifyAdminKycAccessToken } from "../security/admin-kyc-access-token";
import { verifyPin } from "../security/pin-hash";
import { getSupabaseServiceRoleClient } from "../supabase/service";

export class AdminCustomerKycAccessError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "AdminCustomerKycAccessError";
    this.status = status;
    this.code = code;
  }
}

export type AdminCustomerKycViewData = {
  customerId: string;
  displayName: string;
  email: string;
  phone: string;
  kycStatus: string;
  kycApprovedAt: string | null;
  kycRejectedReason: string | null;
  provider: string;
  faceImagePath: string | null;
  faceCapturedAt: string | null;
  faceImageSignedUrl: string | null;
};

type KycSecurityRow = {
  canView: boolean;
  pinHash: string | null;
  failedAttempts: number;
  lockedUntil: string | null;
};

const SCHEMA_HINT = "KYC access schema is incomplete. Please run sql/ensure-admin-kyc-access.sql and try again.";

function errorText(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message ?? fallback);
  }
  return fallback;
}

function isMissingTableError(error: unknown, tableName: string) {
  const message = errorText(error, "").toLowerCase();
  return message.includes(tableName)
    && (message.includes("does not exist") || message.includes("schema cache") || message.includes("could not find"));
}

function getMaxAttempts() {
  const value = Number(process.env.ADMIN_KYC_PIN_MAX_ATTEMPTS ?? 5);
  if (!Number.isFinite(value)) {
    return 5;
  }
  return Math.max(3, Math.min(10, Math.floor(value)));
}

function getLockMinutes() {
  const value = Number(process.env.ADMIN_KYC_PIN_LOCK_MINUTES ?? 15);
  if (!Number.isFinite(value)) {
    return 15;
  }
  return Math.max(1, Math.min(180, Math.floor(value)));
}

function getTokenTtlSeconds() {
  const value = Number(process.env.ADMIN_KYC_ACCESS_TOKEN_TTL_SECONDS ?? 300);
  if (!Number.isFinite(value)) {
    return 300;
  }
  return Math.max(30, Math.min(3600, Math.floor(value)));
}

function getFaceBucket() {
  return String(process.env.ADMIN_KYC_FACE_BUCKET ?? "customer-kyc-artifacts").trim() || "customer-kyc-artifacts";
}

function toNullableString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized || null;
}

async function requireKycViewerActor() {
  const actor = await getBackofficeActor();
  if (!actor) {
    throw new AdminCustomerKycAccessError(401, "UNAUTHORIZED", "Unauthorized");
  }
  if (actor.role !== "admin" && actor.role !== "staff") {
    throw new AdminCustomerKycAccessError(403, "FORBIDDEN", "Not authorized to view customer KYC");
  }
  return actor;
}

async function loadSecurityRow(userId: string): Promise<KycSecurityRow> {
  const supabase = getSupabaseServiceRoleClient();
  const row = await supabase
    .from("admin_user_security")
    .select("can_view_customer_kyc,kyc_pin_hash,failed_attempts,locked_until")
    .eq("user_id", userId)
    .maybeSingle();

  if (row.error) {
    if (isMissingTableError(row.error, "admin_user_security")) {
      throw new AdminCustomerKycAccessError(503, "SCHEMA_MISSING", SCHEMA_HINT);
    }
    throw new AdminCustomerKycAccessError(500, "SECURITY_LOAD_FAILED", errorText(row.error, "Failed to load admin security profile"));
  }

  if (!row.data || typeof row.data !== "object") {
    throw new AdminCustomerKycAccessError(403, "KYC_VIEW_DISABLED", "KYC view permission is disabled for this user");
  }

  const raw = row.data as Record<string, unknown>;
  return {
    canView: Boolean(raw.can_view_customer_kyc),
    pinHash: toNullableString(raw.kyc_pin_hash),
    failedAttempts: Number(raw.failed_attempts ?? 0) || 0,
    lockedUntil: toNullableString(raw.locked_until),
  };
}

async function appendAccessLog(input: {
  actorUserId: string;
  customerId: string;
  action: "unlock_pin" | "view_kyc" | "download_face" | "failed_pin";
  status: "ok" | "denied" | "locked";
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const supabase = getSupabaseServiceRoleClient();
  const result = await supabase.from("admin_kyc_access_logs").insert({
    actor_user_id: input.actorUserId,
    customer_id: input.customerId,
    action: input.action,
    status: input.status,
    ip_address: input.ipAddress ?? null,
    user_agent: input.userAgent ?? null,
    metadata: input.metadata ?? {},
  });

  if (!result.error) {
    return;
  }
  if (isMissingTableError(result.error, "admin_kyc_access_logs")) {
    throw new AdminCustomerKycAccessError(503, "SCHEMA_MISSING", SCHEMA_HINT);
  }
  throw new AdminCustomerKycAccessError(500, "AUDIT_LOG_FAILED", errorText(result.error, "Failed to append KYC access log"));
}

async function updateSecurityLockState(input: { userId: string; failedAttempts: number; lockedUntil: string | null }) {
  const supabase = getSupabaseServiceRoleClient();
  const result = await supabase
    .from("admin_user_security")
    .update({
      failed_attempts: input.failedAttempts,
      locked_until: input.lockedUntil,
    })
    .eq("user_id", input.userId);

  if (result.error) {
    if (isMissingTableError(result.error, "admin_user_security")) {
      throw new AdminCustomerKycAccessError(503, "SCHEMA_MISSING", SCHEMA_HINT);
    }
    throw new AdminCustomerKycAccessError(500, "SECURITY_UPDATE_FAILED", errorText(result.error, "Failed to update KYC PIN lock state"));
  }
}

async function clearSecurityLockState(userId: string) {
  await updateSecurityLockState({ userId, failedAttempts: 0, lockedUntil: null });
}

export async function requestAdminCustomerKycAccess(input: {
  customerId: string;
  pin: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const actor = await requireKycViewerActor();
  const customerId = String(input.customerId ?? "").trim();
  const pin = String(input.pin ?? "").trim();
  if (!customerId) {
    throw new AdminCustomerKycAccessError(400, "CUSTOMER_ID_REQUIRED", "customerId is required");
  }
  if (!pin) {
    throw new AdminCustomerKycAccessError(400, "PIN_REQUIRED", "PIN is required");
  }

  const security = await loadSecurityRow(actor.user.id);
  if (!security.canView) {
    throw new AdminCustomerKycAccessError(403, "KYC_VIEW_DISABLED", "KYC view permission is disabled for this user");
  }
  if (!security.pinHash) {
    throw new AdminCustomerKycAccessError(403, "PIN_NOT_CONFIGURED", "KYC PIN is not configured for this user");
  }

  const now = Date.now();
  const lockedUntilMs = security.lockedUntil ? Date.parse(security.lockedUntil) : Number.NaN;
  if (Number.isFinite(lockedUntilMs) && lockedUntilMs > now) {
    await appendAccessLog({
      actorUserId: actor.user.id,
      customerId,
      action: "failed_pin",
      status: "locked",
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata: { reason: "locked_until", lockedUntil: security.lockedUntil },
    });
    throw new AdminCustomerKycAccessError(423, "PIN_LOCKED", "KYC PIN is temporarily locked");
  }

  const valid = await verifyPin(pin, security.pinHash);
  if (!valid) {
    const nextFailed = security.failedAttempts + 1;
    const lockThreshold = getMaxAttempts();
    const shouldLock = nextFailed >= lockThreshold;
    const lockUntilIso = shouldLock
      ? new Date(now + (getLockMinutes() * 60_000)).toISOString()
      : null;

    await updateSecurityLockState({
      userId: actor.user.id,
      failedAttempts: nextFailed,
      lockedUntil: lockUntilIso,
    });

    await appendAccessLog({
      actorUserId: actor.user.id,
      customerId,
      action: "failed_pin",
      status: shouldLock ? "locked" : "denied",
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata: { failedAttempts: nextFailed, lockThreshold },
    });

    if (shouldLock) {
      throw new AdminCustomerKycAccessError(423, "PIN_LOCKED", "KYC PIN is temporarily locked");
    }
    throw new AdminCustomerKycAccessError(403, "PIN_INVALID", "KYC PIN is invalid");
  }

  await clearSecurityLockState(actor.user.id);
  await appendAccessLog({
    actorUserId: actor.user.id,
    customerId,
    action: "unlock_pin",
    status: "ok",
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: {},
  });

  const issued = issueAdminKycAccessToken({
    actorUserId: actor.user.id,
    customerId,
    ttlSeconds: getTokenTtlSeconds(),
  });

  return {
    accessToken: issued.token,
    expiresAt: issued.expiresAt,
  };
}

export async function getAdminCustomerKycView(input: {
  customerId: string;
  accessToken: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const actor = await requireKycViewerActor();
  const customerId = String(input.customerId ?? "").trim();
  if (!customerId) {
    throw new AdminCustomerKycAccessError(400, "CUSTOMER_ID_REQUIRED", "customerId is required");
  }

  const security = await loadSecurityRow(actor.user.id);
  if (!security.canView) {
    throw new AdminCustomerKycAccessError(403, "KYC_VIEW_DISABLED", "KYC view permission is disabled for this user");
  }

  const token = String(input.accessToken ?? "").trim();
  if (!token) {
    throw new AdminCustomerKycAccessError(401, "TOKEN_REQUIRED", "KYC access token is required");
  }

  try {
    verifyAdminKycAccessToken({
      token,
      actorUserId: actor.user.id,
      customerId,
    });
  } catch (error) {
    throw new AdminCustomerKycAccessError(401, "TOKEN_INVALID", errorText(error, "Invalid access token"));
  }

  const supabase = getSupabaseServiceRoleClient();
  const customerProfile = await supabase
    .from("customer_profiles")
    .select("id,email,full_name,phone")
    .eq("id", customerId)
    .maybeSingle();

  if (customerProfile.error && !isMissingTableError(customerProfile.error, "customer_profiles")) {
    throw new AdminCustomerKycAccessError(500, "PROFILE_LOAD_FAILED", errorText(customerProfile.error, "Failed to load customer profile"));
  }

  const kyc = await supabase
    .from("customer_kyc_profiles")
    .select("customer_id,kyc_status,approved_at,rejected_reason,provider,face_image_path,face_captured_at")
    .eq("customer_id", customerId)
    .maybeSingle();

  if (kyc.error) {
    if (isMissingTableError(kyc.error, "customer_kyc_profiles")) {
      throw new AdminCustomerKycAccessError(503, "SCHEMA_MISSING", "KYC schema is incomplete. Please run sql/ensure-customer-kyc.sql and try again.");
    }
    throw new AdminCustomerKycAccessError(500, "KYC_LOAD_FAILED", errorText(kyc.error, "Failed to load customer KYC profile"));
  }

  if (!customerProfile.data && !kyc.data) {
    throw new AdminCustomerKycAccessError(404, "CUSTOMER_NOT_FOUND", "Customer not found");
  }

  const authUser = await supabase.auth.admin.getUserById(customerId);
  const authEmail = authUser.error ? null : (authUser.data.user?.email ?? null);

  const profileRow = (customerProfile.data ?? {}) as Record<string, unknown>;
  const kycRow = (kyc.data ?? {}) as Record<string, unknown>;
  const faceImagePath = toNullableString(kycRow.face_image_path);

  let faceImageSignedUrl: string | null = null;
  if (faceImagePath) {
    const signed = await supabase.storage.from(getFaceBucket()).createSignedUrl(faceImagePath, 60);
    if (!signed.error) {
      faceImageSignedUrl = signed.data.signedUrl;
    }
  }

  await appendAccessLog({
    actorUserId: actor.user.id,
    customerId,
    action: "view_kyc",
    status: "ok",
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: { hasFaceImage: Boolean(faceImagePath) },
  });

  const displayName = toNullableString(profileRow.full_name) ?? toNullableString(profileRow.email) ?? authEmail ?? customerId;

  return {
    customerId,
    displayName,
    email: toNullableString(profileRow.email) ?? authEmail ?? "-",
    phone: toNullableString(profileRow.phone) ?? "",
    kycStatus: toNullableString(kycRow.kyc_status) ?? "not_started",
    kycApprovedAt: toNullableString(kycRow.approved_at),
    kycRejectedReason: toNullableString(kycRow.rejected_reason),
    provider: toNullableString(kycRow.provider) ?? "",
    faceImagePath,
    faceCapturedAt: toNullableString(kycRow.face_captured_at),
    faceImageSignedUrl,
  } satisfies AdminCustomerKycViewData;
}
