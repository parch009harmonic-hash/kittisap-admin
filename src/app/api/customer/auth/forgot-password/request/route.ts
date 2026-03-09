import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

import {
  CustomerAccountDeletionError,
  resolveCustomerIdByEmail,
} from "../../../../../../../lib/db/customer-account-deletion";
import { takeRateLimitToken } from "../../../../../../../lib/security/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REQUEST_LIMIT = 8;
const REQUEST_WINDOW_MS = 15 * 60 * 1000;

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  return request.headers.get("x-real-ip") ?? "unknown";
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

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rate = takeRateLimitToken(`forgot-password:otp:${ip}`, {
      limit: REQUEST_LIMIT,
      windowMs: REQUEST_WINDOW_MS,
    });

    if (!rate.ok) {
      return NextResponse.json(
        { ok: false, code: "RATE_LIMITED", error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.max(Math.ceil((rate.resetAt - Date.now()) / 1000), 1)),
            "Cache-Control": "no-store, max-age=0",
          },
        },
      );
    }

    const body = (await request.json().catch(() => ({}))) as { email?: string };
    const normalizedEmail = String(body.email ?? "").trim().toLowerCase();
    if (!normalizedEmail) {
      return NextResponse.json({ ok: false, code: "EMAIL_REQUIRED", error: "Email is required" }, { status: 400 });
    }

    try {
      await resolveCustomerIdByEmail(normalizedEmail);
    } catch (error) {
      if (error instanceof CustomerAccountDeletionError && error.code === "PROFILE_NOT_FOUND") {
        return NextResponse.json(
          { ok: false, code: "EMAIL_NOT_FOUND", error: "This email is not registered in our system." },
          { status: 404 },
        );
      }
      throw error;
    }

    const supabase = getSupabaseAnonClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        shouldCreateUser: false,
      },
    });

    if (otpError) {
      if (isRateLimitError(otpError.message)) {
        return NextResponse.json(
          { ok: false, code: "RATE_LIMITED", error: "Too many requests. Please try again later." },
          { status: 429 },
        );
      }
      return NextResponse.json({ ok: false, code: "OTP_SEND_FAILED", error: otpError.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    if (error instanceof CustomerAccountDeletionError) {
      return NextResponse.json({ ok: false, code: error.code, error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Failed to send OTP";
    return NextResponse.json({ ok: false, code: "OTP_SEND_FAILED", error: message }, { status: 500 });
  }
}
