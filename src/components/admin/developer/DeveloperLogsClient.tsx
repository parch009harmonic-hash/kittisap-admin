"use client";

import { useCallback, useEffect, useState } from "react";

type LogEntry = {
  id: string;
  ts: string;
  level: "info" | "warn" | "error";
  source: "health" | "developer-status" | "runtime" | "network";
  message: string;
  meta?: Record<string, unknown>;
};

type LogsPayload = {
  logs: LogEntry[];
  total: number;
  checkedAt: string;
  error?: string;
};

export default function DeveloperLogsClient() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [levelFilter, setLevelFilter] = useState<"all" | "info" | "warn" | "error">("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | "health" | "developer-status" | "runtime" | "network">("all");
  const [query, setQuery] = useState("");
  const [total, setTotal] = useState(0);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "150" });
      if (levelFilter !== "all") {
        params.set("level", levelFilter);
      }
      if (sourceFilter !== "all") {
        params.set("source", sourceFilter);
      }
      if (query.trim()) {
        params.set("q", query.trim());
      }

      const response = await fetch(`/api/admin/developer/logs?${params.toString()}`, { cache: "no-store" });
      const payload = (await response.json()) as LogsPayload;
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load logs.");
      }
      setLogs(payload.logs ?? []);
      setTotal(payload.total ?? payload.logs?.length ?? 0);
      setCheckedAt(payload.checkedAt ?? null);
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : "Failed to load logs.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [levelFilter, query, sourceFilter]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const clearLogs = useCallback(async () => {
    setClearing(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/developer/logs", {
        method: "DELETE",
        cache: "no-store",
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to clear logs.");
      }
      await loadLogs();
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : "Failed to clear logs.";
      setError(message);
    } finally {
      setClearing(false);
    }
  }, [loadLogs]);

  const exportLogs = useCallback(() => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    a.href = url;
    a.download = `developer-logs-${stamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [logs]);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-cyan-400/25 bg-slate-900/60 p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Developer Logs</p>
        <h2 className="mt-1 text-2xl font-semibold text-white">Runtime Events & Timeout Incidents</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <select
            value={levelFilter}
            onChange={(event) => setLevelFilter(event.target.value as typeof levelFilter)}
            className="rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
          >
            <option value="all">All Levels</option>
            <option value="info">Info</option>
            <option value="warn">Warn</option>
            <option value="error">Error</option>
          </select>
          <select
            value={sourceFilter}
            onChange={(event) => setSourceFilter(event.target.value as typeof sourceFilter)}
            className="rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
          >
            <option value="all">All Sources</option>
            <option value="health">Health</option>
            <option value="developer-status">Developer Status</option>
            <option value="runtime">Runtime</option>
            <option value="network">Network</option>
          </select>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search message/meta..."
            className="rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void loadLogs()}
            disabled={loading || clearing}
            className="rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          <button
            type="button"
            onClick={() => void clearLogs()}
            disabled={loading || clearing}
            className="rounded-lg border border-rose-400/50 bg-rose-500/20 px-3 py-2 text-sm font-semibold text-rose-100 disabled:opacity-60"
          >
            {clearing ? "Clearing..." : "Clear logs"}
          </button>
          <button
            type="button"
            onClick={exportLogs}
            disabled={logs.length === 0}
            className="rounded-lg border border-emerald-400/40 bg-emerald-500/20 px-3 py-2 text-sm font-semibold text-emerald-100 disabled:opacity-60"
          >
            Export .json
          </button>
        </div>
        {checkedAt ? <p className="mt-2 text-xs text-slate-300">Last checked: {new Date(checkedAt).toLocaleString()}</p> : null}
        <p className="mt-1 text-xs text-slate-400">Showing {logs.length} of {total} logs</p>
      </section>

      {error ? (
        <section className="rounded-2xl border border-rose-400/30 bg-rose-950/20 p-4 text-rose-100">
          <p className="text-sm font-semibold">Log Error</p>
          <p className="mt-1 text-xs">{error}</p>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-slate-900 text-slate-300">
            <tr>
              <th className="px-3 py-2 font-semibold">Time</th>
              <th className="px-3 py-2 font-semibold">Level</th>
              <th className="px-3 py-2 font-semibold">Source</th>
              <th className="px-3 py-2 font-semibold">Message</th>
              <th className="px-3 py-2 font-semibold">Meta</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-slate-400">
                  No logs yet. Trigger health/status checks to populate.
                </td>
              </tr>
            ) : (
              logs.map((entry) => (
                <tr key={entry.id} className="border-t border-slate-800 text-slate-200">
                  <td className="px-3 py-2 align-top text-xs">{new Date(entry.ts).toLocaleString()}</td>
                  <td className="px-3 py-2 align-top">
                    <span
                      className={`rounded px-2 py-1 text-xs font-semibold ${
                        entry.level === "error"
                          ? "bg-rose-500/20 text-rose-200"
                          : entry.level === "warn"
                            ? "bg-amber-400/20 text-amber-200"
                            : "bg-cyan-500/20 text-cyan-200"
                      }`}
                    >
                      {entry.level.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-3 py-2 align-top text-xs">{entry.source}</td>
                  <td className="px-3 py-2 align-top text-xs">{entry.message}</td>
                  <td className="px-3 py-2 align-top text-[11px] text-slate-400">
                    <pre className="whitespace-pre-wrap break-all">{entry.meta ? JSON.stringify(entry.meta, null, 2) : "-"}</pre>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
