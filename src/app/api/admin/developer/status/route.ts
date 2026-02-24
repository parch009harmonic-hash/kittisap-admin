import { readdir, stat } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { requireDeveloperApi } from "../../../../../../lib/auth/admin";
import { appendDeveloperLog } from "../../../../../../lib/monitor/developer-logs";
import { getSupabaseServiceRoleClient } from "../../../../../../lib/supabase/service";

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

const ROOTS = ["src", "lib", "sql", "scripts"];
const IGNORE_DIRS = new Set(["node_modules", ".next", ".git", ".vercel", ".npm-cache"]);

function safeError(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

function extractTimeoutTargets(message: string) {
  const matches = [...message.matchAll(/\b(?:\d{1,3}\.){3}\d{1,3}:\d+\b/g)];
  if (matches.length > 0) {
    return matches.map((item) => item[0]);
  }

  const hostMatch = message.match(/attempted address(?:es)?:\s*([^)]+)/i);
  return hostMatch ? hostMatch[1].split(",").map((item) => item.trim()).filter(Boolean) : [];
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

async function scanCodebase() {
  let files = 0;
  let bytes = 0;

  async function walk(absDir: string) {
    const items = await readdir(absDir, { withFileTypes: true });

    for (const item of items) {
      if (item.name.startsWith(".") && item.name !== ".env.example") {
        continue;
      }
      if (IGNORE_DIRS.has(item.name)) {
        continue;
      }

      const absPath = path.join(absDir, item.name);

      if (item.isDirectory()) {
        await walk(absPath);
        continue;
      }

      if (item.isFile()) {
        const info = await stat(absPath);
        files += 1;
        bytes += info.size;
      }
    }
  }

  for (const root of ROOTS) {
    const abs = path.join(process.cwd(), root);
    try {
      await walk(abs);
    } catch {
      // Skip missing roots.
    }
  }

  return { files, bytes };
}

export async function GET() {
  try {
    await requireDeveloperApi();
    const retryConfig = getRetryConfig();

    const supabase = getSupabaseServiceRoleClient();

    const api: HealthPart = {
      ok: true,
      latencyMs: 1,
    };

    const dbProbe = await probeWithRetry(async () => {
      const { error } = await supabase.from("admin_settings").select("user_id").limit(1);
      return error?.message ?? null;
    }, retryConfig);

    const storageProbe = await probeWithRetry(async () => {
      const { error } = await supabase.storage.listBuckets();
      return error?.message ?? null;
    }, retryConfig);

    const db: HealthPart = dbProbe.error
      ? { ok: false, latencyMs: dbProbe.latencyMs, error: dbProbe.error }
      : { ok: true, latencyMs: dbProbe.latencyMs };

    const storage: HealthPart = storageProbe.error
      ? { ok: false, latencyMs: storageProbe.latencyMs, error: storageProbe.error }
      : { ok: true, latencyMs: storageProbe.latencyMs };
    const alerts = [
      dbProbe.error ? timeoutAlert(dbProbe.error, "db") : null,
      storageProbe.error ? timeoutAlert(storageProbe.error, "storage") : null,
    ].filter(Boolean);

    const source = await scanCodebase();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const vercelEnv = process.env.VERCEL_ENV ?? "local";

    const payload = {
      ok: api.ok && db.ok && storage.ok,
      checkedAt: new Date().toISOString(),
      api,
      db,
      storage,
      alerts,
      attempts: { db: dbProbe.attempts, storage: storageProbe.attempts },
      retryConfig,
      runtime: {
        node: process.version,
        uptimeSec: Math.floor(process.uptime()),
        env: process.env.NODE_ENV ?? "development",
      },
      supabase: {
        urlConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
        anonKeyConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
        serviceRoleConfigured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
        projectRef: supabaseUrl ? supabaseUrl.replace(/^https?:\/\//, "").split(".")[0] : null,
      },
      vercel: {
        isVercel: process.env.VERCEL === "1",
        env: vercelEnv,
        projectIdConfigured: Boolean(process.env.VERCEL_PROJECT_ID),
        gitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
      },
      source,
    };

    if (!payload.ok) {
      appendDeveloperLog({
        level: alerts.length > 0 ? "warn" : "error",
        source: alerts.length > 0 ? "network" : "developer-status",
        message: alerts.length > 0 ? "Connectivity timeout seen in developer status." : "Developer status check failed.",
        meta: {
          db,
          storage,
          alerts,
          attempts: { db: dbProbe.attempts, storage: storageProbe.attempts },
          retryConfig,
        },
      });
    }

    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    const message = safeError(error);
    const status = message === "Unauthorized" ? 401 : message === "Developer only" ? 403 : 500;
    appendDeveloperLog({
      level: "error",
      source: "developer-status",
      message: "Developer status endpoint crashed.",
      meta: { message },
    });

    return NextResponse.json(
      {
        ok: false,
        checkedAt: new Date().toISOString(),
        error: message,
      },
      { status, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }
}

