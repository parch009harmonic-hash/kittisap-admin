import { NextRequest, NextResponse } from "next/server";

import { requireDeveloperApi } from "../../../../../../../lib/auth/admin";
import { appendDeveloperLog } from "../../../../../../../lib/monitor/developer-logs";
import { getSupabaseServiceRoleClient } from "../../../../../../../lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INSPECT_TABLES = ["admin_settings", "profiles", "products", "product_images"] as const;

type InspectTable = (typeof INSPECT_TABLES)[number];

function safeError(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

function parseLimit(value: string | null, fallback: number, max: number, min = 1) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function parseRuns(value: string | null, fallback: number, max: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(max, parsed));
}

function parsePage(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, parsed);
}

function isDangerousSql(query: string) {
  const lower = query.toLowerCase();
  const blocked = ["insert", "update", "delete", "drop", "alter", "create", "truncate", "grant", "revoke", "comment"];
  return blocked.some((keyword) => lower.includes(keyword));
}

function sanitizeSql(query: string) {
  return query.trim().replace(/;+\s*$/g, "");
}

async function inspectTables() {
  const supabase = getSupabaseServiceRoleClient();

  const tables = await Promise.all(
    INSPECT_TABLES.map(async (name) => {
      const start = performance.now();
      const { count, error } = await supabase.from(name).select("*", { count: "exact", head: true });
      const latencyMs = Math.max(1, Math.round(performance.now() - start));
      return {
        name,
        ok: !error,
        rowCount: count ?? null,
        latencyMs,
        error: error?.message ?? null,
      };
    }),
  );

  return tables;
}

async function inspectDataPage(table: InspectTable, page: number, limit: number) {
  const supabase = getSupabaseServiceRoleClient();
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const start = performance.now();
  const { data, count, error } = await supabase.from(table).select("*", { count: "exact" }).range(from, to);
  const latencyMs = Math.max(1, Math.round(performance.now() - start));

  if (error) {
    throw new Error(error.message);
  }

  const totalRows = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalRows / limit));

  return {
    table,
    page,
    limit,
    totalRows,
    totalPages,
    latencyMs,
    returned: data?.length ?? 0,
    rows: data ?? [],
  };
}

async function inspectStability(runs: number) {
  const supabase = getSupabaseServiceRoleClient();
  const dbSamples: Array<{ ok: boolean; latencyMs: number; error: string | null }> = [];
  const storageSamples: Array<{ ok: boolean; latencyMs: number; error: string | null }> = [];

  for (let i = 0; i < runs; i += 1) {
    const dbStart = performance.now();
    const dbResult = await supabase.from("admin_settings").select("user_id").limit(1);
    dbSamples.push({
      ok: !dbResult.error,
      latencyMs: Math.max(1, Math.round(performance.now() - dbStart)),
      error: dbResult.error?.message ?? null,
    });

    const storageStart = performance.now();
    const storageResult = await supabase.storage.listBuckets();
    storageSamples.push({
      ok: !storageResult.error,
      latencyMs: Math.max(1, Math.round(performance.now() - storageStart)),
      error: storageResult.error?.message ?? null,
    });
  }

  const dbSuccess = dbSamples.filter((item) => item.ok).length;
  const storageSuccess = storageSamples.filter((item) => item.ok).length;
  const dbAvgMs = Math.round(dbSamples.reduce((sum, item) => sum + item.latencyMs, 0) / dbSamples.length);
  const storageAvgMs = Math.round(storageSamples.reduce((sum, item) => sum + item.latencyMs, 0) / storageSamples.length);
  const successRate = (dbSuccess + storageSuccess) / (dbSamples.length + storageSamples.length);
  const stable = successRate >= 0.95;

  if (!stable) {
    appendDeveloperLog({
      level: "warn",
      source: "developer-status",
      message: "Supabase stability check detected degraded connectivity.",
      meta: { runs, dbSuccess, storageSuccess, dbAvgMs, storageAvgMs, successRate },
    });
  }

  return {
    runs,
    stable,
    successRate,
    db: { success: dbSuccess, total: dbSamples.length, avgLatencyMs: dbAvgMs, samples: dbSamples },
    storage: { success: storageSuccess, total: storageSamples.length, avgLatencyMs: storageAvgMs, samples: storageSamples },
    checkedAt: new Date().toISOString(),
  };
}

async function runReadOnlySql(rawQuery: string) {
  const query = sanitizeSql(rawQuery);
  if (!query) {
    throw new Error("Empty query");
  }
  if (query.includes("--") || query.includes("/*") || query.includes("*/")) {
    throw new Error("Comments are not supported");
  }
  if (isDangerousSql(query)) {
    throw new Error("Only read-only SELECT queries are allowed");
  }

  const countMatch = query.match(/^select\s+count\(\*\)\s+from\s+([a-z_][a-z0-9_]*)$/i);
  if (countMatch) {
    const table = countMatch[1] as InspectTable;
    if (!INSPECT_TABLES.includes(table)) {
      throw new Error("Table is not allowed");
    }
    const supabase = getSupabaseServiceRoleClient();
    const start = performance.now();
    const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
    const latencyMs = Math.max(1, Math.round(performance.now() - start));
    if (error) throw new Error(error.message);
    return {
      mode: "count",
      table,
      latencyMs,
      returned: 1,
      rows: [{ count: count ?? 0 }],
    };
  }

  const selectMatch = query.match(
    /^select\s+([*a-z0-9_,\s"]+)\s+from\s+([a-z_][a-z0-9_]*)(?:\s+limit\s+(\d+))?(?:\s+offset\s+(\d+))?$/i,
  );
  if (!selectMatch) {
    throw new Error("Unsupported SQL. Use SELECT ... FROM <allowed_table> [LIMIT n] [OFFSET n]");
  }

  const columns = selectMatch[1].trim();
  const table = selectMatch[2] as InspectTable;
  if (!INSPECT_TABLES.includes(table)) {
    throw new Error("Table is not allowed");
  }
  if (columns !== "*" && !/^[a-z0-9_",\s]+$/i.test(columns)) {
    throw new Error("Invalid column list");
  }

  const limit = parseLimit(selectMatch[3] ?? null, 50, 500);
  const offset = parseLimit(selectMatch[4] ?? null, 0, 100000, 0);
  const from = offset;
  const to = offset + limit - 1;

  const supabase = getSupabaseServiceRoleClient();
  const start = performance.now();
  const { data, error } = await supabase.from(table).select(columns).range(from, to);
  const latencyMs = Math.max(1, Math.round(performance.now() - start));
  if (error) throw new Error(error.message);

  return {
    mode: "select",
    table,
    latencyMs,
    returned: data?.length ?? 0,
    rows: data ?? [],
  };
}

export async function GET(request: NextRequest) {
  try {
    await requireDeveloperApi();

    const action = request.nextUrl.searchParams.get("action") ?? "tables";

    if (action === "tables") {
      const tables = await inspectTables();
      return NextResponse.json({ ok: true, tables }, { headers: { "Cache-Control": "no-store, max-age=0" } });
    }

    if (action === "data") {
      const table = request.nextUrl.searchParams.get("table");
      if (!table || !INSPECT_TABLES.includes(table as InspectTable)) {
        return NextResponse.json({ ok: false, error: "Invalid table" }, { status: 400 });
      }

      const limit = parseLimit(request.nextUrl.searchParams.get("limit"), 25, 200);
      const page = parsePage(request.nextUrl.searchParams.get("page"), 1);
      const payload = await inspectDataPage(table as InspectTable, page, limit);
      return NextResponse.json({ ok: true, ...payload }, { headers: { "Cache-Control": "no-store, max-age=0" } });
    }

    if (action === "stability") {
      const runs = parseRuns(request.nextUrl.searchParams.get("runs"), 6, 20);
      const payload = await inspectStability(runs);
      return NextResponse.json({ ok: true, ...payload }, { headers: { "Cache-Control": "no-store, max-age=0" } });
    }

    if (action === "sql") {
      const query = request.nextUrl.searchParams.get("query") ?? "";
      const payload = await runReadOnlySql(query);
      return NextResponse.json({ ok: true, ...payload }, { headers: { "Cache-Control": "no-store, max-age=0" } });
    }

    return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
  } catch (error) {
    const message = safeError(error);
    const status = message === "Unauthorized" ? 401 : message === "Developer only" ? 403 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

