import "server-only";

import { getSupabaseServiceRoleClient } from "../supabase/service";

const ACTIVE_SESSION_STATUSES = ["created", "submitted", "processing"] as const;
const DEFAULT_SESSION_TTL_MS = 10 * 60 * 1000;

export type CustomerKycStatus =
  | "not_started"
  | "in_progress"
  | "pending_review"
  | "approved"
  | "rejected"
  | "blocked";

export type CustomerKycPurpose = "onboarding" | "account_recovery" | "step_up";

type CustomerKycProfileRow = {
  customer_id?: string | null;
  kyc_status?: string | null;
  kyc_level?: string | null;
  approved_at?: string | null;
  rejected_reason?: string | null;
  provider?: string | null;
  provider_subject_ref?: string | null;
  updated_at?: string | null;
};

export type CustomerKycProfile = {
  customerId: string;
  kycStatus: CustomerKycStatus;
  kycLevel: string;
  approvedAt: string | null;
  rejectedReason: string | null;
  provider: string | null;
  providerSubjectRef: string | null;
  updatedAt: string | null;
};

export class CustomerKycError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "CustomerKycError";
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

function isMissingTableError(message: string, tableName: string) {
  const lower = message.toLowerCase();
  return lower.includes(tableName.toLowerCase())
    && (
      lower.includes("does not exist")
      || lower.includes("schema cache")
      || lower.includes("could not find the table")
    );
}

function normalizeKycStatus(value: unknown): CustomerKycStatus {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "in_progress") return "in_progress";
  if (normalized === "pending_review") return "pending_review";
  if (normalized === "approved") return "approved";
  if (normalized === "rejected") return "rejected";
  if (normalized === "blocked") return "blocked";
  return "not_started";
}

function toKycProfile(customerId: string, row: CustomerKycProfileRow | null): CustomerKycProfile {
  return {
    customerId,
    kycStatus: normalizeKycStatus(row?.kyc_status),
    kycLevel: String(row?.kyc_level ?? "none").trim() || "none",
    approvedAt: String(row?.approved_at ?? "").trim() || null,
    rejectedReason: String(row?.rejected_reason ?? "").trim() || null,
    provider: String(row?.provider ?? "").trim() || null,
    providerSubjectRef: String(row?.provider_subject_ref ?? "").trim() || null,
    updatedAt: String(row?.updated_at ?? "").trim() || null,
  };
}

async function appendKycAuditLog(input: {
  customerId: string;
  sessionId?: string | null;
  eventType: string;
  eventStatus: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const supabase = getSupabaseServiceRoleClient();
  const { error } = await supabase.from("customer_kyc_audit_logs").insert({
    customer_id: input.customerId,
    session_id: input.sessionId ?? null,
    event_type: input.eventType,
    event_status: input.eventStatus,
    ip_address: input.ipAddress ?? null,
    user_agent: input.userAgent ?? null,
    metadata: input.metadata ?? {},
  });

  if (!error) {
    return;
  }

  const message = normalizeErrorMessage(error);
  if (isMissingTableError(message, "customer_kyc_audit_logs")) {
    throw new CustomerKycError(500, "KYC_SCHEMA_MISSING", "Missing KYC audit table. Run sql/ensure-customer-kyc.sql first.");
  }
  throw new CustomerKycError(500, "KYC_AUDIT_LOG_FAILED", message || "Failed to write KYC audit log.");
}

export async function ensureCustomerKycProfile(customerId: string) {
  const normalizedCustomerId = String(customerId ?? "").trim();
  if (!normalizedCustomerId) {
    throw new CustomerKycError(400, "INVALID_CUSTOMER_ID", "Customer id is required.");
  }

  const supabase = getSupabaseServiceRoleClient();
  const upserted = await supabase
    .from("customer_kyc_profiles")
    .upsert({ customer_id: normalizedCustomerId }, { onConflict: "customer_id" })
    .select("customer_id,kyc_status,kyc_level,approved_at,rejected_reason,provider,provider_subject_ref,updated_at")
    .single();

  if (upserted.error) {
    const message = normalizeErrorMessage(upserted.error);
    if (isMissingTableError(message, "customer_kyc_profiles")) {
      throw new CustomerKycError(500, "KYC_SCHEMA_MISSING", "Missing customer_kyc_profiles table. Run sql/ensure-customer-kyc.sql first.");
    }
    throw new CustomerKycError(500, "KYC_PROFILE_UPSERT_FAILED", message || "Failed to ensure KYC profile.");
  }

  return toKycProfile(normalizedCustomerId, upserted.data as CustomerKycProfileRow | null);
}

export async function getCustomerKycProfile(customerId: string) {
  const normalizedCustomerId = String(customerId ?? "").trim();
  if (!normalizedCustomerId) {
    throw new CustomerKycError(400, "INVALID_CUSTOMER_ID", "Customer id is required.");
  }

  const supabase = getSupabaseServiceRoleClient();
  const result = await supabase
    .from("customer_kyc_profiles")
    .select("customer_id,kyc_status,kyc_level,approved_at,rejected_reason,provider,provider_subject_ref,updated_at")
    .eq("customer_id", normalizedCustomerId)
    .maybeSingle();

  if (result.error) {
    const message = normalizeErrorMessage(result.error);
    if (isMissingTableError(message, "customer_kyc_profiles")) {
      throw new CustomerKycError(500, "KYC_SCHEMA_MISSING", "Missing customer_kyc_profiles table. Run sql/ensure-customer-kyc.sql first.");
    }
    throw new CustomerKycError(500, "KYC_PROFILE_FETCH_FAILED", message || "Failed to load KYC profile.");
  }

  if (!result.data) {
    return ensureCustomerKycProfile(normalizedCustomerId);
  }
  return toKycProfile(normalizedCustomerId, result.data as CustomerKycProfileRow | null);
}

export async function createCustomerKycSession(input: {
  customerId: string;
  purpose: CustomerKycPurpose;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const normalizedCustomerId = String(input.customerId ?? "").trim();
  if (!normalizedCustomerId) {
    throw new CustomerKycError(400, "INVALID_CUSTOMER_ID", "Customer id is required.");
  }

  const purpose = String(input.purpose ?? "").trim().toLowerCase();
  if (purpose !== "onboarding" && purpose !== "account_recovery" && purpose !== "step_up") {
    throw new CustomerKycError(400, "INVALID_KYC_PURPOSE", "Invalid KYC purpose.");
  }

  const profile = await getCustomerKycProfile(normalizedCustomerId);
  const supabase = getSupabaseServiceRoleClient();
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const expiresAt = new Date(now + DEFAULT_SESSION_TTL_MS).toISOString();

  const existing = await supabase
    .from("customer_kyc_sessions")
    .select("id,purpose,status,challenge_nonce,challenge_payload,expires_at")
    .eq("customer_id", normalizedCustomerId)
    .eq("purpose", purpose)
    .in("status", [...ACTIVE_SESSION_STATUSES])
    .gt("expires_at", nowIso)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing.error) {
    const message = normalizeErrorMessage(existing.error);
    if (isMissingTableError(message, "customer_kyc_sessions")) {
      throw new CustomerKycError(500, "KYC_SCHEMA_MISSING", "Missing customer_kyc_sessions table. Run sql/ensure-customer-kyc.sql first.");
    }
    throw new CustomerKycError(500, "KYC_SESSION_FETCH_FAILED", message || "Failed to load KYC session.");
  }

  if (existing.data) {
    const existingRow = existing.data as {
      id?: string | null;
      challenge_nonce?: string | null;
      challenge_payload?: Record<string, unknown> | null;
      expires_at?: string | null;
      status?: string | null;
    };
    const sessionId = String(existingRow.id ?? "").trim();
    if (!sessionId) {
      throw new CustomerKycError(500, "KYC_SESSION_INVALID", "Invalid KYC session data.");
    }

    await appendKycAuditLog({
      customerId: normalizedCustomerId,
      sessionId,
      eventType: "session_reused",
      eventStatus: String(existingRow.status ?? "created").trim() || "created",
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      metadata: { purpose },
    });

    return {
      sessionId,
      purpose: purpose as CustomerKycPurpose,
      status: String(existingRow.status ?? "created").trim() || "created",
      challengeNonce: String(existingRow.challenge_nonce ?? "").trim(),
      challengePayload: (existingRow.challenge_payload ?? {}) as Record<string, unknown>,
      expiresAt: String(existingRow.expires_at ?? "").trim() || expiresAt,
      kycStatus: profile.kycStatus,
      reused: true,
    };
  }

  const challengeNonce = crypto.randomUUID();
  const challengePayload: Record<string, unknown> = {
    nonce: challengeNonce,
    issuedAt: nowIso,
    requiredSteps:
      purpose === "onboarding"
        ? ["consent", "document_capture", "liveness_check"]
        : ["liveness_check", "face_match"],
  };

  const inserted = await supabase
    .from("customer_kyc_sessions")
    .insert({
      customer_id: normalizedCustomerId,
      purpose,
      status: "created",
      challenge_nonce: challengeNonce,
      challenge_payload: challengePayload,
      expires_at: expiresAt,
    })
    .select("id,status")
    .single();

  if (inserted.error || !inserted.data) {
    const message = normalizeErrorMessage(inserted.error);
    if (isMissingTableError(message, "customer_kyc_sessions")) {
      throw new CustomerKycError(500, "KYC_SCHEMA_MISSING", "Missing customer_kyc_sessions table. Run sql/ensure-customer-kyc.sql first.");
    }
    throw new CustomerKycError(500, "KYC_SESSION_CREATE_FAILED", message || "Failed to create KYC session.");
  }

  if (profile.kycStatus !== "approved" && purpose === "onboarding") {
    await supabase
      .from("customer_kyc_profiles")
      .update({ kyc_status: "in_progress" })
      .eq("customer_id", normalizedCustomerId);
  }

  const sessionId = String((inserted.data as { id?: string | null }).id ?? "").trim();
  await appendKycAuditLog({
    customerId: normalizedCustomerId,
    sessionId,
    eventType: "session_created",
    eventStatus: "created",
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
    metadata: { purpose },
  });

  return {
    sessionId,
    purpose: purpose as CustomerKycPurpose,
    status: "created",
    challengeNonce,
    challengePayload,
    expiresAt,
    kycStatus: purpose === "onboarding" && profile.kycStatus !== "approved" ? "in_progress" : profile.kycStatus,
    reused: false,
  };
}

export async function completeCustomerKycSession(input: {
  customerId: string;
  sessionId: string;
  verificationMethod?: string;
  resultPayload?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const normalizedCustomerId = String(input.customerId ?? "").trim();
  if (!normalizedCustomerId) {
    throw new CustomerKycError(400, "INVALID_CUSTOMER_ID", "Customer id is required.");
  }

  const normalizedSessionId = String(input.sessionId ?? "").trim();
  if (!normalizedSessionId) {
    throw new CustomerKycError(400, "KYC_SESSION_ID_REQUIRED", "Session id is required.");
  }

  const verificationMethod = String(input.verificationMethod ?? "").trim() || "camera";
  const nowIso = new Date().toISOString();
  const supabase = getSupabaseServiceRoleClient();

  const sessionResult = await supabase
    .from("customer_kyc_sessions")
    .select("id,status,purpose,expires_at")
    .eq("id", normalizedSessionId)
    .eq("customer_id", normalizedCustomerId)
    .maybeSingle();

  if (sessionResult.error) {
    const message = normalizeErrorMessage(sessionResult.error);
    if (isMissingTableError(message, "customer_kyc_sessions")) {
      throw new CustomerKycError(500, "KYC_SCHEMA_MISSING", "Missing customer_kyc_sessions table. Run sql/ensure-customer-kyc.sql first.");
    }
    throw new CustomerKycError(500, "KYC_SESSION_FETCH_FAILED", message || "Failed to load KYC session.");
  }

  if (!sessionResult.data) {
    throw new CustomerKycError(404, "KYC_SESSION_NOT_FOUND", "KYC session was not found.");
  }

  const currentStatus = String((sessionResult.data as { status?: string }).status ?? "").trim().toLowerCase();
  if (currentStatus === "passed") {
    const profile = await getCustomerKycProfile(normalizedCustomerId);
    return {
      sessionId: normalizedSessionId,
      status: "passed" as const,
      kycStatus: profile.kycStatus,
      approvedAt: profile.approvedAt,
      alreadyCompleted: true,
    };
  }
  if (currentStatus === "failed" || currentStatus === "expired" || currentStatus === "cancelled") {
    throw new CustomerKycError(409, "KYC_SESSION_FINALIZED", "KYC session is no longer active.");
  }

  const expiresAt = Date.parse(String((sessionResult.data as { expires_at?: string }).expires_at ?? ""));
  if (Number.isFinite(expiresAt) && expiresAt <= Date.now()) {
    await supabase
      .from("customer_kyc_sessions")
      .update({ status: "expired" })
      .eq("id", normalizedSessionId)
      .eq("customer_id", normalizedCustomerId);
    throw new CustomerKycError(410, "KYC_SESSION_EXPIRED", "KYC session has expired.");
  }

  const nextResultPayload: Record<string, unknown> = {
    ...(input.resultPayload ?? {}),
    verificationMethod,
    verifiedAt: nowIso,
    source: "browser-face-scan",
  };

  const updateSession = await supabase
    .from("customer_kyc_sessions")
    .update({
      status: "passed",
      provider: "browser-face-scan",
      result_payload: nextResultPayload,
    })
    .eq("id", normalizedSessionId)
    .eq("customer_id", normalizedCustomerId);

  if (updateSession.error) {
    const message = normalizeErrorMessage(updateSession.error);
    if (isMissingTableError(message, "customer_kyc_sessions")) {
      throw new CustomerKycError(500, "KYC_SCHEMA_MISSING", "Missing customer_kyc_sessions table. Run sql/ensure-customer-kyc.sql first.");
    }
    throw new CustomerKycError(500, "KYC_SESSION_UPDATE_FAILED", message || "Failed to update KYC session.");
  }

  const updateProfile = await supabase
    .from("customer_kyc_profiles")
    .update({
      kyc_status: "approved",
      kyc_level: "basic",
      approved_at: nowIso,
      rejected_reason: null,
      provider: "browser-face-scan",
    })
    .eq("customer_id", normalizedCustomerId);

  if (updateProfile.error) {
    const message = normalizeErrorMessage(updateProfile.error);
    if (isMissingTableError(message, "customer_kyc_profiles")) {
      throw new CustomerKycError(500, "KYC_SCHEMA_MISSING", "Missing customer_kyc_profiles table. Run sql/ensure-customer-kyc.sql first.");
    }
    throw new CustomerKycError(500, "KYC_PROFILE_UPSERT_FAILED", message || "Failed to update KYC profile.");
  }

  await appendKycAuditLog({
    customerId: normalizedCustomerId,
    sessionId: normalizedSessionId,
    eventType: "session_passed",
    eventStatus: "passed",
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
    metadata: {
      verificationMethod,
      purpose: String((sessionResult.data as { purpose?: string }).purpose ?? ""),
    },
  });

  return {
    sessionId: normalizedSessionId,
    status: "passed" as const,
    kycStatus: "approved" as const,
    approvedAt: nowIso,
    alreadyCompleted: false,
  };
}
