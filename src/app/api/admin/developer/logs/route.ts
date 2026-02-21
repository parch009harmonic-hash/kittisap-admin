import { NextRequest, NextResponse } from "next/server";

import { requireDeveloperApi } from "../../../../../../lib/auth/admin";
import { clearDeveloperLogs, listDeveloperLogs } from "../../../../../../lib/monitor/developer-logs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toPositiveInt(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return parsed;
}

function toLevel(value: string | null) {
  if (value === "info" || value === "warn" || value === "error") {
    return value;
  }
  return null;
}

function toSource(value: string | null) {
  if (value === "health" || value === "developer-status" || value === "runtime" || value === "network") {
    return value;
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    await requireDeveloperApi({ allowAdmin: true });
    const limit = toPositiveInt(request.nextUrl.searchParams.get("limit"), 120);
    const level = toLevel(request.nextUrl.searchParams.get("level"));
    const source = toSource(request.nextUrl.searchParams.get("source"));
    const q = (request.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase();
    const all = listDeveloperLogs(200);
    const filtered = all.filter((entry) => {
      if (level && entry.level !== level) {
        return false;
      }
      if (source && entry.source !== source) {
        return false;
      }
      if (!q) {
        return true;
      }
      const hay = `${entry.message} ${JSON.stringify(entry.meta ?? {})}`.toLowerCase();
      return hay.includes(q);
    });
    const logs = filtered.slice(0, limit);
    return NextResponse.json(
      { logs, total: filtered.length, checkedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : message === "Developer only" ? 403 : 500;
    return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store, max-age=0" } });
  }
}

export async function DELETE() {
  try {
    await requireDeveloperApi({ allowAdmin: true });
    clearDeveloperLogs();
    return NextResponse.json(
      { ok: true, clearedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : message === "Developer only" ? 403 : 500;
    return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store, max-age=0" } });
  }
}
