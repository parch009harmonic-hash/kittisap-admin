import { NextResponse } from "next/server";

import { requireAdminApi } from "../../../../../lib/auth/admin";
import { appendDeveloperLog } from "../../../../../lib/monitor/developer-logs";
import { getSupabaseServiceRoleClient } from "../../../../../lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type HealthPart = {
  ok: boolean;
  latencyMs: number | null;
  error?: string;
};

type ProbeResult = {
  ok: boolean;
  latencyMs: number;
  error: string | null;
  attempts: number;
};

type RetryConfig = {
  timeoutRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
};

function safeError(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Unknown error";
}

function extractTimeoutTargets(message: string) {
  const matches = [...message.matchAll(/\b(?:\d{1,3}\.){3}\d{1,3}:\d+\b/g)];
  if (matches.length > 0) {
    return matches.map((item) => item[0]);
  }

  const hostMatch = message.match(/attempted address:\s*([^\s,]+)/i);
  return hostMatch ? [hostMatch[1]] : [];
}

function timeoutAlert(message: string, service: "db" | "storage") {
  const lower = message.toLowerCase();
  const isConnectTimeout =
    lower.includes("und_err_connect_timeout") ||
    lower.includes("connect timeout") ||
    lower.includes("connecttimeouterror");

  if (!isConnectTimeout) {
    return null;
  }

  return {
    code: "UND_ERR_CONNECT_TIMEOUT",
    service,
    targets: extractTimeoutTargets(message),
    message,
  };
}

function isConnectTimeoutMessage(message: string) {
  const lower = message.toLowerCase();
  return (
    lower.includes("und_err_connect_timeout") ||
    lower.includes("connect timeout") ||
    lower.includes("connecttimeouterror")
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function envInt(name: string, fallback: number, min: number, max: number) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function getRetryConfig(): RetryConfig {
  return {
    timeoutRetries: envInt("ADMIN_PROBE_TIMEOUT_RETRIES", 2, 0, 10),
    baseDelayMs: envInt("ADMIN_PROBE_RETRY_BASE_MS", 180, 50, 5000),
    maxDelayMs: envInt("ADMIN_PROBE_RETRY_MAX_MS", 1200, 100, 10000),
  };
}

async function probeWithRetry(action: () => Promise<string | null>, config: RetryConfig): Promise<ProbeResult> {
  const maxAttempts = 1 + Math.max(0, config.timeoutRetries);
  let lastError: string | null = null;
  let attempts = 0;
  const start = performance.now();

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    attempts = attempt;
    const errorMessage = await action();
    if (!errorMessage) {
      return {
        ok: true,
        latencyMs: Math.max(1, Math.round(performance.now() - start)),
        error: null,
        attempts,
      };
    }

    lastError = errorMessage;
    if (!isConnectTimeoutMessage(errorMessage) || attempt === maxAttempts) {
      break;
    }

    const delay = Math.min(config.maxDelayMs, config.baseDelayMs * attempt);
    await sleep(delay);
  }

  return {
    ok: false,
    latencyMs: Math.max(1, Math.round(performance.now() - start)),
    error: lastError,
    attempts,
  };
}

export async function GET() {
  try {
    await requireAdminApi();
    const supabase = getSupabaseServiceRoleClient();
    const retryConfig = getRetryConfig();

    const apiStart = performance.now();
    const api: HealthPart = {
      ok: true,
      latencyMs: Math.max(1, Math.round(performance.now() - apiStart)),
    };

    let db: HealthPart;
    const dbProbe = await probeWithRetry(async () => {
      const { error } = await supabase.from("admin_settings").select("user_id").limit(1);
      return error?.message ?? null;
    }, retryConfig);
    let dbAlert: ReturnType<typeof timeoutAlert> = null;
    if (!dbProbe.ok) {
      db = { ok: false, latencyMs: dbProbe.latencyMs, error: dbProbe.error ?? "Unknown error" };
      dbAlert = timeoutAlert(dbProbe.error ?? "", "db");
    } else {
      db = { ok: true, latencyMs: dbProbe.latencyMs };
    }

    let storage: HealthPart;
    const storageProbe = await probeWithRetry(async () => {
      const { error } = await supabase.storage.listBuckets();
      return error?.message ?? null;
    }, retryConfig);
    let storageAlert: ReturnType<typeof timeoutAlert> = null;
    if (!storageProbe.ok) {
      storage = { ok: false, latencyMs: storageProbe.latencyMs, error: storageProbe.error ?? "Unknown error" };
      storageAlert = timeoutAlert(storageProbe.error ?? "", "storage");
    } else {
      storage = { ok: true, latencyMs: storageProbe.latencyMs };
    }

    const ok = api.ok && db.ok && storage.ok;
    const alerts = [dbAlert, storageAlert].filter(Boolean);

    if (!ok) {
      appendDeveloperLog({
        level: alerts.length > 0 ? "warn" : "error",
        source: alerts.length > 0 ? "network" : "health",
        message: alerts.length > 0 ? "Supabase connectivity timeout detected." : "Health check failed.",
        meta: {
          db,
          storage,
          alerts,
          attempts: { db: dbProbe.attempts, storage: storageProbe.attempts },
          retryConfig,
        },
      });
    }

    return NextResponse.json(
      {
        ok,
        checkedAt: new Date().toISOString(),
        api,
        db,
        storage,
        alerts,
        attempts: { db: dbProbe.attempts, storage: storageProbe.attempts },
      },
      {
        status: ok ? 200 : 503,
        headers: { "Cache-Control": "no-store, max-age=0" },
      },
    );
  } catch (error) {
    const message = safeError(error);
    const status = message === "Unauthorized" ? 401 : 500;
    appendDeveloperLog({
      level: "error",
      source: "health",
      message: "Health endpoint crashed.",
      meta: { message },
    });
    return NextResponse.json(
      {
        ok: false,
        checkedAt: new Date().toISOString(),
        api: { ok: false, latencyMs: null, error: message },
        db: { ok: false, latencyMs: null, error: "Skipped" },
        storage: { ok: false, latencyMs: null, error: "Skipped" },
        error: message,
      },
      { status, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }
}
