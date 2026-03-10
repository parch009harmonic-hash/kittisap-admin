import "server-only";

import { createHash } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

import {
  CustomerAccountDeletionError,
  resolveCustomerIdByEmail,
} from "../db/customer-account-deletion";
import { getSupabaseServiceRoleClient } from "../supabase/service";
import { takeRateLimitToken } from "./rate-limit";

export type CustomerAuthOtpPurpose = "forgot_password" | "account_recovery";

type OtpAuditStatus =
  | "accepted_sent"
  | "accepted_not_found"
  | "rate_limited_ip"
  | "rate_limited_email"
  | "rate_limited_ip_email"
  | "provider_rate_limited"
  | "invalid_email"
  | "provider_error";

const REQUEST_LIMIT_BY_IP = 8;
const REQUEST_LIMIT_BY_EMAIL = 4;
const REQUEST_LIMIT_BY_IP_EMAIL = 2;
const REQUEST_WINDOW_MS = 15 * 60 * 1000;
const REQUEST_WINDOW_IP_EMAIL_MS = 5 * 60 * 1000;

const GENERIC_ACCEPTED_MESSAGE = "If this email exists in our system, OTP has been sent.";

export class CustomerAuthOtpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly retryAfterSeconds: number | null;

  constructor(status: number, code: string, message: string, retryAfterSeconds?: number | null) {
    super(message);
    this.name = "CustomerAuthOtpError";
    this.status = status;
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds ?? null;
  }
}

export function extractClientIp(headers: Headers) {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  return headers.get("x-real-ip") ?? "unknown";
}

function secondsUntil(resetAt: number) {
  return Math.max(Math.ceil((resetAt - Date.now()) / 1000), 1);
}

function isLikelyEmail(value: string) {
  // Keep validation intentionally broad to avoid rejecting uncommon valid addresses.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function maskEmail(email: string) {
  const normalized = String(email ?? "").trim().toLowerCase();
  const atIndex = normalized.indexOf("@");
  if (atIndex <= 0) {
    return "***";
  }
  const local = normalized.slice(0, atIndex);
  const domain = normalized.slice(atIndex + 1);
  if (!domain) {
    return "***";
  }
  if (local.length <= 2) {
    return `${local[0] ?? "*"}***@${domain}`;
  }
  return `${local.slice(0, 2)}***@${domain}`;
}

function emailHash(email: string) {
  return createHash("sha256").update(String(email ?? "").trim().toLowerCase()).digest("hex");
}

function normalizeProviderRateLimit(message: string) {
  const lower = String(message ?? "").trim().toLowerCase();
  return lower.includes("rate limit") || lower.includes("too many");
}

function sanitizeRedirect(value?: string | null) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    return null;
  }
  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function isMissingOtpAuditTable(message: string) {
  const lower = message.toLowerCase();
  return lower.includes("customer_auth_otp_audit_logs")
    && (lower.includes("does not exist") || lower.includes("schema cache") || lower.includes("could not find the table"));
}

async function appendCustomerOtpAuditLog(input: {
  purpose: CustomerAuthOtpPurpose;
  email: string;
  customerId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  eventStatus: OtpAuditStatus;
  metadata?: Record<string, unknown>;
}) {
  try {
    const supabase = getSupabaseServiceRoleClient();
    const { error } = await supabase.from("customer_auth_otp_audit_logs").insert({
      purpose: input.purpose,
      customer_id: input.customerId ?? null,
      email_hash: emailHash(input.email),
      email_masked: maskEmail(input.email),
      ip_address: input.ipAddress ?? null,
      user_agent: input.userAgent ?? null,
      event_status: input.eventStatus,
      metadata: input.metadata ?? {},
    });

    if (!error) {
      return;
    }
    const message = String((error as { message?: string }).message ?? "").trim();
    if (isMissingOtpAuditTable(message)) {
      return;
    }
    console.error("[customer-auth-otp] failed to write OTP audit log:", message || error);
  } catch (error) {
    console.error("[customer-auth-otp] unexpected OTP audit log failure:", error);
  }
}

function getSupabaseAnonClient() {
  const supabaseUrl = String(process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "").trim();
  const supabaseAnonKey = String(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new CustomerAuthOtpError(500, "SUPABASE_ENV_MISSING", "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function requestCustomerEmailOtp(input: {
  email: string;
  purpose: CustomerAuthOtpPurpose;
  ipAddress?: string | null;
  userAgent?: string | null;
  emailRedirectTo?: string | null;
}) {
  const normalizedPurpose = input.purpose === "account_recovery" ? "account_recovery" : "forgot_password";
  const normalizedEmail = String(input.email ?? "").trim().toLowerCase();
  const normalizedIp = String(input.ipAddress ?? "").trim() || "unknown";
  const normalizedUserAgent = String(input.userAgent ?? "").trim() || null;

  if (!normalizedEmail) {
    throw new CustomerAuthOtpError(400, "EMAIL_REQUIRED", "Email is required");
  }
  if (!isLikelyEmail(normalizedEmail)) {
    await appendCustomerOtpAuditLog({
      purpose: normalizedPurpose,
      email: normalizedEmail,
      ipAddress: normalizedIp,
      userAgent: normalizedUserAgent,
      eventStatus: "invalid_email",
    });
    throw new CustomerAuthOtpError(400, "INVALID_EMAIL", "Invalid email format");
  }

  const rateByIp = takeRateLimitToken(`customer-auth-otp:${normalizedPurpose}:ip:${normalizedIp}`, {
    limit: REQUEST_LIMIT_BY_IP,
    windowMs: REQUEST_WINDOW_MS,
  });
  if (!rateByIp.ok) {
    await appendCustomerOtpAuditLog({
      purpose: normalizedPurpose,
      email: normalizedEmail,
      ipAddress: normalizedIp,
      userAgent: normalizedUserAgent,
      eventStatus: "rate_limited_ip",
    });
    throw new CustomerAuthOtpError(429, "RATE_LIMITED", "Too many requests. Please try again later.", secondsUntil(rateByIp.resetAt));
  }

  const rateByEmail = takeRateLimitToken(`customer-auth-otp:${normalizedPurpose}:email:${normalizedEmail}`, {
    limit: REQUEST_LIMIT_BY_EMAIL,
    windowMs: REQUEST_WINDOW_MS,
  });
  if (!rateByEmail.ok) {
    await appendCustomerOtpAuditLog({
      purpose: normalizedPurpose,
      email: normalizedEmail,
      ipAddress: normalizedIp,
      userAgent: normalizedUserAgent,
      eventStatus: "rate_limited_email",
    });
    throw new CustomerAuthOtpError(429, "RATE_LIMITED", "Too many requests. Please try again later.", secondsUntil(rateByEmail.resetAt));
  }

  const rateByIpEmail = takeRateLimitToken(`customer-auth-otp:${normalizedPurpose}:pair:${normalizedIp}:${normalizedEmail}`, {
    limit: REQUEST_LIMIT_BY_IP_EMAIL,
    windowMs: REQUEST_WINDOW_IP_EMAIL_MS,
  });
  if (!rateByIpEmail.ok) {
    await appendCustomerOtpAuditLog({
      purpose: normalizedPurpose,
      email: normalizedEmail,
      ipAddress: normalizedIp,
      userAgent: normalizedUserAgent,
      eventStatus: "rate_limited_ip_email",
    });
    throw new CustomerAuthOtpError(429, "RATE_LIMITED", "Too many requests. Please try again later.", secondsUntil(rateByIpEmail.resetAt));
  }

  let customerId: string | null = null;
  try {
    customerId = await resolveCustomerIdByEmail(normalizedEmail);
  } catch (error) {
    if (error instanceof CustomerAccountDeletionError && error.code === "PROFILE_NOT_FOUND") {
      await appendCustomerOtpAuditLog({
        purpose: normalizedPurpose,
        email: normalizedEmail,
        ipAddress: normalizedIp,
        userAgent: normalizedUserAgent,
        eventStatus: "accepted_not_found",
      });
      return {
        ok: true as const,
        message: GENERIC_ACCEPTED_MESSAGE,
        delivered: false,
      };
    }
    if (error instanceof CustomerAccountDeletionError) {
      throw new CustomerAuthOtpError(error.status, error.code, error.message);
    }
    throw error;
  }

  const supabase = getSupabaseAnonClient();
  const emailRedirectTo = sanitizeRedirect(input.emailRedirectTo);
  const { error: otpError } = await supabase.auth.signInWithOtp({
    email: normalizedEmail,
    options: {
      shouldCreateUser: false,
      ...(emailRedirectTo ? { emailRedirectTo } : {}),
    },
  });

  if (otpError) {
    if (normalizeProviderRateLimit(otpError.message)) {
      await appendCustomerOtpAuditLog({
        purpose: normalizedPurpose,
        email: normalizedEmail,
        customerId,
        ipAddress: normalizedIp,
        userAgent: normalizedUserAgent,
        eventStatus: "provider_rate_limited",
      });
      throw new CustomerAuthOtpError(429, "RATE_LIMITED", "Too many requests. Please try again later.");
    }
    await appendCustomerOtpAuditLog({
      purpose: normalizedPurpose,
      email: normalizedEmail,
      customerId,
      ipAddress: normalizedIp,
      userAgent: normalizedUserAgent,
      eventStatus: "provider_error",
      metadata: {
        providerError: otpError.message,
      },
    });
    throw new CustomerAuthOtpError(400, "OTP_SEND_FAILED", otpError.message || "Failed to send OTP");
  }

  await appendCustomerOtpAuditLog({
    purpose: normalizedPurpose,
    email: normalizedEmail,
    customerId,
    ipAddress: normalizedIp,
    userAgent: normalizedUserAgent,
    eventStatus: "accepted_sent",
  });

  return {
    ok: true as const,
    message: GENERIC_ACCEPTED_MESSAGE,
    delivered: true,
  };
}
