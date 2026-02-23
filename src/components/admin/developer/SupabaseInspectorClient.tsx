"use client";

import { useMemo, useState } from "react";

import type { AdminLocale } from "../../../../lib/i18n/admin";
import { assertApiSuccess } from "../api-error";

type InspectorTab = "tables" | "data" | "stability" | "sql";

type TableSummary = {
  name: string;
  ok: boolean;
  rowCount: number | null;
  latencyMs: number;
  error: string | null;
};

type StabilitySample = { ok: boolean; latencyMs: number; error: string | null };
type StabilityResult = {
  runs: number;
  stable: boolean;
  successRate: number;
  db: { success: number; total: number; avgLatencyMs: number; samples: StabilitySample[] };
  storage: { success: number; total: number; avgLatencyMs: number; samples: StabilitySample[] };
  checkedAt: string;
};

type DataResult = {
  table: string;
  page: number;
  limit: number;
  totalRows: number;
  totalPages: number;
  latencyMs: number;
  returned: number;
  rows: Array<Record<string, unknown>>;
};

type SqlResult = {
  table: string;
  mode: "select" | "count";
  latencyMs: number;
  returned: number;
  rows: Array<Record<string, unknown>>;
};

const TABLE_OPTIONS = ["admin_settings", "profiles", "products", "product_images"] as const;
const PAGE_SIZES = [10, 25, 50] as const;

export default function SupabaseInspectorClient({ locale }: { locale: AdminLocale }) {
  const [activeTab, setActiveTab] = useState<InspectorTab>("tables");
  const [expanded, setExpanded] = useState({ summary: true, detail: true });
  const [tables, setTables] = useState<TableSummary[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>(TABLE_OPTIONS[0]);
  const [dataPage, setDataPage] = useState(1);
  const [dataLimit, setDataLimit] = useState<(typeof PAGE_SIZES)[number]>(25);
  const [dataResult, setDataResult] = useState<DataResult | null>(null);
  const [stability, setStability] = useState<StabilityResult | null>(null);
  const [sqlQuery, setSqlQuery] = useState("select * from products limit 25");
  const [sqlResult, setSqlResult] = useState<SqlResult | null>(null);
  const [loadingAction, setLoadingAction] = useState<"tables" | "data" | "stability" | "sql" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const t = useMemo(
    () =>
      locale === "th"
        ? {
            title: "Supabase Inspector",
            subtitle: "เครื่องมือตรวจตาราง ข้อมูล และเสถียรภาพเซิร์ฟเวอร์ พร้อม SQL Editor",
            tabs: {
              tables: "ตาราง",
              data: "ข้อมูล",
              stability: "เสถียรภาพ",
              sql: "SQL Editor",
            },
            tableLabel: "ตาราง",
            rowCount: "จำนวนแถว",
            latency: "ความหน่วง",
            status: "สถานะ",
            healthy: "ปกติ",
            failed: "ผิดปกติ",
            loading: "กำลังโหลด...",
            loadTables: "โหลดรายการตาราง",
            fetchData: "โหลดข้อมูล",
            runStability: "รันทดสอบ",
            runSql: "รัน SQL",
            page: "หน้า",
            pageSize: "ขนาดหน้า",
            prev: "ก่อนหน้า",
            next: "ถัดไป",
            dataPreview: "ตัวอย่างข้อมูล",
            noData: "ยังไม่มีข้อมูล",
            exportJson: "ส่งออก JSON",
            exportCsv: "ส่งออก CSV",
            successRate: "อัตราสำเร็จ",
            db: "ฐานข้อมูล",
            storage: "สตอเรจ",
            checkedAt: "ตรวจล่าสุด",
            stable: "เสถียร",
            unstable: "ไม่เสถียร",
            sqlHint: "รองรับเฉพาะ SELECT แบบอ่านอย่างเดียว เช่น SELECT * FROM products LIMIT 25",
            summaryToggle: "สรุป",
            detailToggle: "รายละเอียด",
          }
        : {
            title: "Supabase Inspector",
            subtitle: "Inspect tables, data, server stability, and SQL editor",
            tabs: {
              tables: "Tables",
              data: "Data",
              stability: "Stability",
              sql: "SQL Editor",
            },
            tableLabel: "Table",
            rowCount: "Rows",
            latency: "Latency",
            status: "Status",
            healthy: "Healthy",
            failed: "Failed",
            loading: "Loading...",
            loadTables: "Load tables",
            fetchData: "Load data",
            runStability: "Run test",
            runSql: "Run SQL",
            page: "Page",
            pageSize: "Page size",
            prev: "Prev",
            next: "Next",
            dataPreview: "Data preview",
            noData: "No data",
            exportJson: "Export JSON",
            exportCsv: "Export CSV",
            successRate: "Success rate",
            db: "Database",
            storage: "Storage",
            checkedAt: "Checked",
            stable: "Stable",
            unstable: "Unstable",
            sqlHint: "Read-only SELECT only, e.g. SELECT * FROM products LIMIT 25",
            summaryToggle: "Summary",
            detailToggle: "Details",
          },
    [locale],
  );

  function setLoading(action: "tables" | "data" | "stability" | "sql") {
    setLoadingAction(action);
    setError(null);
  }

  async function loadTables() {
    setLoading("tables");
    try {
      const response = await fetch("/api/admin/developer/supabase/inspector?action=tables", { cache: "no-store" });
      const json = (await response.json()) as { ok: boolean; error?: string; tables?: TableSummary[] };
      assertApiSuccess({
        response,
        payload: json,
        fallbackMessage: "Failed to load tables",
        locale,
        requireOkField: true,
      });
      setTables(json.tables ?? []);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Unknown error");
    } finally {
      setLoadingAction(null);
    }
  }

  async function loadData(page = dataPage, limit = dataLimit) {
    setLoading("data");
    try {
      const params = new URLSearchParams({
        action: "data",
        table: selectedTable,
        page: String(page),
        limit: String(limit),
      });
      const response = await fetch(`/api/admin/developer/supabase/inspector?${params.toString()}`, { cache: "no-store" });
      const json = (await response.json()) as { ok: boolean; error?: string } & DataResult;
      assertApiSuccess({
        response,
        payload: json,
        fallbackMessage: "Failed to load data",
        locale,
        requireOkField: true,
      });
      setDataPage(json.page);
      setDataLimit(json.limit as (typeof PAGE_SIZES)[number]);
      setDataResult({
        table: json.table,
        page: json.page,
        limit: json.limit,
        totalRows: json.totalRows,
        totalPages: json.totalPages,
        latencyMs: json.latencyMs,
        returned: json.returned,
        rows: json.rows,
      });
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Unknown error");
    } finally {
      setLoadingAction(null);
    }
  }

  async function runStability() {
    setLoading("stability");
    try {
      const response = await fetch("/api/admin/developer/supabase/inspector?action=stability&runs=8", { cache: "no-store" });
      const json = (await response.json()) as { ok: boolean; error?: string } & StabilityResult;
      assertApiSuccess({
        response,
        payload: json,
        fallbackMessage: "Failed to run stability test",
        locale,
        requireOkField: true,
      });
      setStability(json);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Unknown error");
    } finally {
      setLoadingAction(null);
    }
  }

  async function runSql() {
    setLoading("sql");
    try {
      const params = new URLSearchParams({ action: "sql", query: sqlQuery });
      const response = await fetch(`/api/admin/developer/supabase/inspector?${params.toString()}`, { cache: "no-store" });
      const json = (await response.json()) as { ok: boolean; error?: string } & SqlResult;
      assertApiSuccess({
        response,
        payload: json,
        fallbackMessage: "Failed to run SQL",
        locale,
        requireOkField: true,
      });
      setSqlResult({ table: json.table, mode: json.mode, latencyMs: json.latencyMs, returned: json.returned, rows: json.rows });
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Unknown error");
    } finally {
      setLoadingAction(null);
    }
  }

  function downloadJson(filename: string, payload: unknown) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function toCsv(rows: Array<Record<string, unknown>>) {
    if (rows.length === 0) return "";
    const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
    const escape = (value: unknown) => {
      const text = value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
      return `"${text.replace(/"/g, '""')}"`;
    };
    const lines = [headers.map(escape).join(",")];
    for (const row of rows) {
      lines.push(headers.map((header) => escape(row[header])).join(","));
    }
    return lines.join("\n");
  }

  function downloadCsv(filename: string, rows: Array<Record<string, unknown>>) {
    const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="rounded-2xl border border-cyan-400/25 bg-slate-900/60 p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">{t.title}</p>
      <p className="mt-1 text-sm text-slate-300">{t.subtitle}</p>

      <div className="mt-3 flex flex-wrap gap-2 rounded-xl border border-slate-800 bg-slate-950/50 p-2">
        {(["tables", "data", "stability", "sql"] as InspectorTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
              activeTab === tab ? "bg-cyan-400 text-slate-950" : "bg-slate-900 text-slate-200 hover:bg-slate-800"
            }`}
          >
            {t.tabs[tab]}
          </button>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => setExpanded((prev) => ({ ...prev, summary: !prev.summary }))}
          className="rounded-md border border-slate-700 bg-slate-900/80 px-2 py-1 text-xs text-slate-300"
        >
          {t.summaryToggle}
        </button>
        <button
          type="button"
          onClick={() => setExpanded((prev) => ({ ...prev, detail: !prev.detail }))}
          className="rounded-md border border-slate-700 bg-slate-900/80 px-2 py-1 text-xs text-slate-300"
        >
          {t.detailToggle}
        </button>
      </div>

      {error ? <p className="mt-3 rounded-lg bg-rose-900/40 p-2 text-xs text-rose-100">{error}</p> : null}

      {activeTab === "tables" ? (
        <div className="mt-4 space-y-3">
          <button
            type="button"
            onClick={() => void loadTables()}
            disabled={loadingAction !== null}
            className="rounded-lg border border-cyan-300/70 bg-cyan-400/20 px-3 py-2 text-sm font-semibold text-cyan-100 disabled:opacity-60"
          >
            {loadingAction === "tables" ? t.loading : t.loadTables}
          </button>

          {expanded.summary && tables.length > 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950/45 p-3">
              {tables.map((item) => (
                <p key={item.name} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 py-1 text-xs">
                  <span className="text-slate-200">{item.name}</span>
                  <span className="text-slate-400">
                    {t.status}: {item.ok ? t.healthy : t.failed} | {t.rowCount}: {item.rowCount ?? "-"} | {t.latency}: {item.latencyMs} ms
                  </span>
                </p>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {activeTab === "data" ? (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-1 text-xs text-slate-300">
              <span>{t.tableLabel}</span>
              <select
                value={selectedTable}
                onChange={(event) => {
                  setSelectedTable(event.target.value);
                  setDataPage(1);
                }}
                className="rounded-md bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none"
              >
                {TABLE_OPTIONS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className="inline-flex items-center gap-1 text-xs text-slate-300">
              <span>{t.pageSize}</span>
              <select
                value={dataLimit}
                onChange={(event) => setDataLimit(Number(event.target.value) as (typeof PAGE_SIZES)[number])}
                className="rounded-md bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none"
              >
                {PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => void loadData(1, dataLimit)}
              disabled={loadingAction !== null}
              className="rounded-lg border border-cyan-300/70 bg-cyan-400/20 px-3 py-2 text-sm font-semibold text-cyan-100 disabled:opacity-60"
            >
              {loadingAction === "data" ? t.loading : t.fetchData}
            </button>
          </div>

          {dataResult ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950/45 p-3">
              <p className="text-xs text-slate-300">
                {t.page}: {dataResult.page}/{dataResult.totalPages} | {t.rowCount}: {dataResult.totalRows} | {t.latency}: {dataResult.latencyMs} ms
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void loadData(Math.max(1, dataResult.page - 1), dataResult.limit as (typeof PAGE_SIZES)[number])}
                  disabled={loadingAction !== null || dataResult.page <= 1}
                  className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200 disabled:opacity-50"
                >
                  {t.prev}
                </button>
                <button
                  type="button"
                  onClick={() => void loadData(Math.min(dataResult.totalPages, dataResult.page + 1), dataResult.limit as (typeof PAGE_SIZES)[number])}
                  disabled={loadingAction !== null || dataResult.page >= dataResult.totalPages}
                  className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200 disabled:opacity-50"
                >
                  {t.next}
                </button>
                <button
                  type="button"
                  onClick={() => downloadJson(`${dataResult.table}-p${dataResult.page}.json`, dataResult.rows)}
                  className="rounded-md border border-emerald-700 bg-emerald-900/30 px-2 py-1 text-xs text-emerald-200"
                >
                  {t.exportJson}
                </button>
                <button
                  type="button"
                  onClick={() => downloadCsv(`${dataResult.table}-p${dataResult.page}.csv`, dataResult.rows)}
                  className="rounded-md border border-sky-700 bg-sky-900/30 px-2 py-1 text-xs text-sky-200"
                >
                  {t.exportCsv}
                </button>
              </div>

              {expanded.detail ? (
                <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-slate-950 p-2 text-xs text-slate-200">
                  {JSON.stringify(dataResult.rows, null, 2)}
                </pre>
              ) : null}
            </div>
          ) : (
            <p className="text-xs text-slate-400">{t.noData}</p>
          )}
        </div>
      ) : null}

      {activeTab === "stability" ? (
        <div className="mt-4 space-y-3">
          <button
            type="button"
            onClick={() => void runStability()}
            disabled={loadingAction !== null}
            className="rounded-lg border border-emerald-300/70 bg-emerald-400/20 px-3 py-2 text-sm font-semibold text-emerald-100 disabled:opacity-60"
          >
            {loadingAction === "stability" ? t.loading : t.runStability}
          </button>

          {stability ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950/45 p-3 text-xs">
              {expanded.summary ? (
                <>
                  <p className="text-slate-200">
                    {t.status}: {stability.stable ? t.stable : t.unstable}
                  </p>
                  <p className="text-slate-300">
                    {t.successRate}: {(stability.successRate * 100).toFixed(1)}%
                  </p>
                  <p className="text-slate-300">
                    {t.db}: {stability.db.success}/{stability.db.total} ({stability.db.avgLatencyMs} ms avg)
                  </p>
                  <p className="text-slate-300">
                    {t.storage}: {stability.storage.success}/{stability.storage.total} ({stability.storage.avgLatencyMs} ms avg)
                  </p>
                  <p className="text-slate-400">
                    {t.checkedAt}: {new Date(stability.checkedAt).toLocaleString(locale === "th" ? "th-TH" : "en-US")}
                  </p>
                </>
              ) : null}

              {expanded.detail ? (
                <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-slate-950 p-2 text-xs text-slate-200">
                  {JSON.stringify({ dbSamples: stability.db.samples, storageSamples: stability.storage.samples }, null, 2)}
                </pre>
              ) : null}
            </div>
          ) : (
            <p className="text-xs text-slate-400">{t.noData}</p>
          )}
        </div>
      ) : null}

      {activeTab === "sql" ? (
        <div className="mt-4 space-y-3">
          <p className="text-xs text-slate-400">{t.sqlHint}</p>
          <textarea
            value={sqlQuery}
            onChange={(event) => setSqlQuery(event.target.value)}
            rows={5}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-xs text-slate-100 outline-none"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void runSql()}
              disabled={loadingAction !== null}
              className="rounded-lg border border-cyan-300/70 bg-cyan-400/20 px-3 py-2 text-sm font-semibold text-cyan-100 disabled:opacity-60"
            >
              {loadingAction === "sql" ? t.loading : t.runSql}
            </button>
            <button
              type="button"
              onClick={() => setSqlQuery("select * from products limit 25")}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200"
            >
              products
            </button>
            <button
              type="button"
              onClick={() => setSqlQuery("select count(*) from profiles")}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200"
            >
              profiles count
            </button>
          </div>

          {sqlResult ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950/45 p-3">
              <p className="text-xs text-slate-300">
                {t.tableLabel}: {sqlResult.table} | {t.rowCount}: {sqlResult.returned} | {t.latency}: {sqlResult.latencyMs} ms
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => downloadJson(`sql-${sqlResult.table}.json`, sqlResult.rows)}
                  className="rounded-md border border-emerald-700 bg-emerald-900/30 px-2 py-1 text-xs text-emerald-200"
                >
                  {t.exportJson}
                </button>
                <button
                  type="button"
                  onClick={() => downloadCsv(`sql-${sqlResult.table}.csv`, sqlResult.rows)}
                  className="rounded-md border border-sky-700 bg-sky-900/30 px-2 py-1 text-xs text-sky-200"
                >
                  {t.exportCsv}
                </button>
              </div>
              {expanded.detail ? (
                <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-slate-950 p-2 text-xs text-slate-200">
                  {JSON.stringify(sqlResult.rows, null, 2)}
                </pre>
              ) : null}
            </div>
          ) : (
            <p className="text-xs text-slate-400">{t.noData}</p>
          )}
        </div>
      ) : null}
    </section>
  );
}
