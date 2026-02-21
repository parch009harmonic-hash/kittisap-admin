"use client";

import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";

import type { AdminLocale } from "../../../../lib/i18n/admin";

type HealthPart = {
  ok: boolean;
  latencyMs: number | null;
  error?: string;
};

type TimeoutAlert = {
  code: string;
  service: "db" | "storage";
  targets: string[];
  message: string;
};

type DeveloperStatus = {
  ok: boolean;
  checkedAt: string;
  api: HealthPart;
  db: HealthPart;
  storage: HealthPart;
  alerts?: TimeoutAlert[];
  attempts?: { db?: number; storage?: number };
  retryConfig?: { timeoutRetries?: number; baseDelayMs?: number; maxDelayMs?: number };
  runtime: { node: string; uptimeSec: number; env: string };
  supabase: { urlConfigured: boolean; anonKeyConfigured: boolean; serviceRoleConfigured: boolean; projectRef: string | null };
  vercel: { isVercel: boolean; env: string; projectIdConfigured: boolean; gitCommitSha: string | null };
  source: { files: number; bytes: number };
  error?: string;
};

type LatencySnapshot = {
  stamp: string;
  api: number;
  db: number;
  storage: number;
};

type Mode = "all" | "supabase" | "vercel";

type SampleWindow = 5 | 15 | 30;

const SAMPLE_WINDOWS: SampleWindow[] = [5, 15, 30];

export default function DeveloperStatusClient({ mode, locale }: { mode: Mode; locale: AdminLocale }) {
  const [status, setStatus] = useState<DeveloperStatus | null>(null);
  const [history, setHistory] = useState<LatencySnapshot[]>([]);
  const [sampleWindow, setSampleWindow] = useState<SampleWindow>(30);
  const [warnThresholdMs, setWarnThresholdMs] = useState(200);
  const [criticalThresholdMs, setCriticalThresholdMs] = useState(500);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = useMemo(
    () =>
      locale === "th"
        ? {
        systemOverview: "System Overview",
        apiStatusTitle: "สถานะระบบ API",
        apiStatusDescription: "ตรวจสอบ API, ฐานข้อมูล และ Storage แบบเรียลไทม์",
        refresh: "รีเฟรช",
        refreshing: "กำลังรีเฟรช...",
        api: "API",
        database: "ฐานข้อมูล",
        storage: "สตอเรจ",
        healthy: "ปกติ",
        unhealthy: "ผิดปกติ",
        snapshot: "ภาพรวมสั้น",
        healthyServices: "บริการที่ปกติ",
        averageLatency: "ค่าเฉลี่ยความหน่วง",
        timeoutAlerts: "การเตือน timeout",
        checkedAt: "ตรวจล่าสุด",
        runtimeInfra: "Runtime + Infra",
        developerMonitor: "Developer Monitor",
        statusError: "ข้อผิดพลาดสถานะระบบ",
        timeoutDetected: "ตรวจพบการเชื่อมต่อเกินเวลา (UND_ERR_CONNECT_TIMEOUT)",
        timeoutMessage: "พบการเชื่อมต่อ Supabase เกินเวลาที่กำหนดในบางจุด",
        supabaseHealth: "สุขภาพระบบ Supabase",
        codeRuntime: "โค้ด + Runtime",
        supabaseChecklist: "รายการตรวจสอบ Supabase",
        vercelStatus: "สถานะ Vercel",
        vercelChecklist: "รายการตรวจสอบ Vercel",
        project: "โปรเจกต์",
        url: "URL",
        anonKey: "Anon Key",
        serviceRole: "Service Role",
        dbRetries: "DB retries",
        storageRetries: "Storage retries",
        retryConfig: "Retry config",
        node: "Node",
        uptime: "Uptime",
        env: "Env",
        files: "Files",
        size: "Size",
        platform: "Platform",
        environment: "Environment",
        projectId: "Project ID",
        commit: "Commit",
        checked: "Checked",
        ok: "OK",
        missing: "MISSING",
        down: "DOWN",
        latencyTrend: "กราฟแนวโน้ม Latency",
        noChartData: "ยังไม่มีข้อมูลกราฟ",
        samples: "ตัวอย่าง",
        sampleWindow: "ช่วงข้อมูล",
        milliseconds: "มิลลิวินาที",
        noData: "-",
        unknownTarget: "ไม่ทราบปลายทาง",
        supabaseUrlConfigured: "ตั้งค่า Supabase URL แล้ว",
        supabaseAnonConfigured: "ตั้งค่า Supabase anon key แล้ว",
        supabaseServiceConfigured: "ตั้งค่า Supabase service role แล้ว",
        dbProbeHealthy: "Database probe ปกติ",
        storageProbeHealthy: "Storage probe ปกติ",
        noTimeoutAlerts: "ไม่มี timeout alerts",
        vercelRuntime: "ทำงานบน Vercel runtime",
        vercelProjectLinked: "เชื่อม Vercel project แล้ว",
        vercelEnvironmentSet: "ตั้งค่า Vercel environment แล้ว",
        vercelCommitAvailable: "มี commit SHA ล่าสุด",
        threshold: "Threshold",
        warnThreshold: "Warn",
        criticalThreshold: "Critical",
        movingAverage: "ค่าเฉลี่ยเคลื่อนที่",
          }
        : {
        systemOverview: "System Overview",
        apiStatusTitle: "API System Status",
        apiStatusDescription: "Monitor API, database, and storage in real time",
        refresh: "Refresh",
        refreshing: "Refreshing...",
        api: "API",
        database: "Database",
        storage: "Storage",
        healthy: "Healthy",
        unhealthy: "Unhealthy",
        snapshot: "Snapshot",
        healthyServices: "Healthy services",
        averageLatency: "Average latency",
        timeoutAlerts: "Timeout alerts",
        checkedAt: "Checked at",
        runtimeInfra: "Runtime + Infra",
        developerMonitor: "Developer Monitor",
        statusError: "Status Error",
        timeoutDetected: "Connectivity Timeout Detected (UND_ERR_CONNECT_TIMEOUT)",
        timeoutMessage: "Some Supabase endpoints exceeded configured timeout.",
        supabaseHealth: "Supabase Health",
        codeRuntime: "Code + Runtime",
        supabaseChecklist: "Supabase Action Checklist",
        vercelStatus: "Vercel Status",
        vercelChecklist: "Vercel Action Checklist",
        project: "Project",
        url: "URL",
        anonKey: "Anon Key",
        serviceRole: "Service Role",
        dbRetries: "DB retries",
        storageRetries: "Storage retries",
        retryConfig: "Retry config",
        node: "Node",
        uptime: "Uptime",
        env: "Env",
        files: "Files",
        size: "Size",
        platform: "Platform",
        environment: "Environment",
        projectId: "Project ID",
        commit: "Commit",
        checked: "Checked",
        ok: "OK",
        missing: "MISSING",
        down: "DOWN",
        latencyTrend: "Latency Trend",
        noChartData: "No chart data yet",
        samples: "samples",
        sampleWindow: "Window",
        milliseconds: "ms",
        noData: "-",
        unknownTarget: "unknown target",
        supabaseUrlConfigured: "Supabase URL configured",
        supabaseAnonConfigured: "Supabase anon key configured",
        supabaseServiceConfigured: "Supabase service role configured",
        dbProbeHealthy: "Database probe healthy",
        storageProbeHealthy: "Storage probe healthy",
        noTimeoutAlerts: "No timeout alerts",
        vercelRuntime: "Running on Vercel runtime",
        vercelProjectLinked: "Vercel project linked",
        vercelEnvironmentSet: "Vercel environment set",
        vercelCommitAvailable: "Recent commit SHA available",
        threshold: "Threshold",
        warnThreshold: "Warn",
        criticalThreshold: "Critical",
        movingAverage: "Moving average",
          },
    [locale],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/developer/status", { cache: "no-store" });
      const json = (await response.json()) as DeveloperStatus;
      if (!response.ok) {
        throw new Error(json.error ?? "Failed to load developer status.");
      }
      setStatus(json);
      setHistory((prev) => {
        const nextPoint: LatencySnapshot = {
          stamp: json.checkedAt,
          api: normalizeLatency(json.api.latencyMs),
          db: normalizeLatency(json.db.latencyMs),
          storage: normalizeLatency(json.storage.latencyMs),
        };
        return [...prev.slice(-59), nextPoint];
      });
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : "Failed to load developer status.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => {
      void load();
    }, 30000);
    return () => clearInterval(timer);
  }, [load]);

  const timeoutHints = useMemo(() => {
    if (!status?.alerts || status.alerts.length === 0) {
      return [];
    }
    return status.alerts.map((alert) => {
      const target = alert.targets.length > 0 ? alert.targets.join(", ") : t.unknownTarget;
      return `${alert.service.toUpperCase()}: ${target}`;
    });
  }, [status, t.unknownTarget]);

  const supabaseChecklist = useMemo(() => {
    if (!status) return [];
    return [
      { label: t.supabaseUrlConfigured, done: status.supabase.urlConfigured },
      { label: t.supabaseAnonConfigured, done: status.supabase.anonKeyConfigured },
      { label: t.supabaseServiceConfigured, done: status.supabase.serviceRoleConfigured },
      { label: t.dbProbeHealthy, done: status.db.ok },
      { label: t.storageProbeHealthy, done: status.storage.ok },
      { label: t.noTimeoutAlerts, done: timeoutHints.length === 0 },
    ];
  }, [status, t, timeoutHints.length]);

  const vercelChecklist = useMemo(() => {
    if (!status) return [];
    return [
      { label: t.vercelRuntime, done: status.vercel.isVercel },
      { label: t.vercelProjectLinked, done: status.vercel.projectIdConfigured },
      { label: t.vercelEnvironmentSet, done: Boolean(status.vercel.env) },
      { label: t.vercelCommitAvailable, done: Boolean(status.vercel.gitCommitSha) },
    ];
  }, [status, t]);

  const responseSummary = useMemo(() => {
    if (!status) return null;
    const points = [status.api, status.db, status.storage];
    const validLatency = points.map((item) => item.latencyMs).filter((item): item is number => typeof item === "number");
    const avgLatency = validLatency.length > 0 ? Math.round(validLatency.reduce((sum, value) => sum + value, 0) / validLatency.length) : null;
    const healthyCount = points.filter((item) => item.ok).length;
    return {
      avgLatency,
      healthyCount,
      total: points.length,
      timeoutCount: timeoutHints.length,
    };
  }, [status, timeoutHints.length]);

  const visibleHistory = useMemo(() => history.slice(-sampleWindow), [history, sampleWindow]);
  const normalizedThresholds = useMemo(() => {
    const warn = Math.max(1, Math.round(warnThresholdMs));
    const critical = Math.max(warn + 1, Math.round(criticalThresholdMs));
    return [warn, critical];
  }, [warnThresholdMs, criticalThresholdMs]);

  return (
    <div className="space-y-4">
      {mode === "all" ? (
        <section className="rounded-2xl border border-cyan-400/30 bg-gradient-to-br from-cyan-500/15 via-slate-900/70 to-slate-950/80 p-5 shadow-[0_0_0_1px_rgba(56,189,248,0.08)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">{t.systemOverview}</p>
              <h2 className="mt-1 text-2xl font-semibold text-white">{t.apiStatusTitle}</h2>
              <p className="mt-1 text-sm text-slate-300">{t.apiStatusDescription}</p>
            </div>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="rounded-lg bg-cyan-400 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60"
            >
              {loading ? t.refreshing : t.refresh}
            </button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <ServiceStatusCard title={t.api} part={status?.api ?? null} healthyLabel={t.healthy} unhealthyLabel={t.unhealthy} noDataLabel={t.noData} tone="cyan" />
            <ServiceStatusCard title={t.database} part={status?.db ?? null} healthyLabel={t.healthy} unhealthyLabel={t.unhealthy} noDataLabel={t.noData} tone="emerald" />
            <ServiceStatusCard title={t.storage} part={status?.storage ?? null} healthyLabel={t.healthy} unhealthyLabel={t.unhealthy} noDataLabel={t.noData} tone="sky" />
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[2fr_1fr]">
            <LatencyChart
              history={visibleHistory}
              locale={locale}
              sampleWindow={sampleWindow}
              onSampleWindowChange={setSampleWindow}
              sampleWindows={SAMPLE_WINDOWS}
              thresholds={normalizedThresholds}
              warnThresholdMs={warnThresholdMs}
              criticalThresholdMs={criticalThresholdMs}
              onWarnThresholdChange={setWarnThresholdMs}
              onCriticalThresholdChange={setCriticalThresholdMs}
              title={t.latencyTrend}
              emptyText={t.noChartData}
              samplesLabel={t.samples}
              windowLabel={t.sampleWindow}
              msLabel={t.milliseconds}
              thresholdLabel={t.threshold}
              warnThresholdLabel={t.warnThreshold}
              criticalThresholdLabel={t.criticalThreshold}
              movingAverageLabel={t.movingAverage}
            />
            <section className="rounded-xl border border-slate-700/70 bg-slate-950/55 p-3">
              <h3 className="text-sm font-semibold text-cyan-200">{t.snapshot}</h3>
              <div className="mt-2 space-y-2 text-sm">
                <MetricLine label={t.healthyServices} value={`${responseSummary?.healthyCount ?? 0}/${responseSummary?.total ?? 3}`} />
                <MetricLine label={t.averageLatency} value={responseSummary?.avgLatency != null ? `${responseSummary.avgLatency} ${t.milliseconds}` : t.noData} />
                <MetricLine label={t.timeoutAlerts} value={`${responseSummary?.timeoutCount ?? 0}`} />
                <MetricLine label={t.checkedAt} value={status ? formatDateTime(status.checkedAt, locale) : t.noData} />
              </div>
            </section>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-cyan-400/25 bg-slate-900/60 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">{t.developerMonitor}</p>
          <h2 className="mt-1 text-2xl font-semibold text-white">{t.runtimeInfra}</h2>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="mt-3 rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
          >
            {loading ? t.refreshing : t.refresh}
          </button>
        </section>
      )}

      {error ? (
        <section className="rounded-2xl border border-rose-400/30 bg-rose-950/20 p-4 text-rose-100">
          <p className="text-sm font-semibold">{t.statusError}</p>
          <p className="mt-1 text-xs">{error}</p>
        </section>
      ) : null}

      {timeoutHints.length > 0 ? (
        <section className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-4">
          <p className="text-sm font-semibold text-amber-200">{t.timeoutDetected}</p>
          <p className="mt-1 text-xs text-amber-100">{t.timeoutMessage}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-amber-100">
            {timeoutHints.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {status ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(mode === "all" || mode === "supabase") && (
            <>
              <Card title={t.supabaseHealth}>
                <Line label={t.database} value={toPart(status.db, t.ok, t.down, t.noData, t.milliseconds)} />
                <Line label={t.storage} value={toPart(status.storage, t.ok, t.down, t.noData, t.milliseconds)} />
                <Line label={t.project} value={status.supabase.projectRef ?? t.noData} />
                <Line label={t.url} value={toBool(status.supabase.urlConfigured, t.ok, t.missing)} />
                <Line label={t.anonKey} value={toBool(status.supabase.anonKeyConfigured, t.ok, t.missing)} />
                <Line label={t.serviceRole} value={toBool(status.supabase.serviceRoleConfigured, t.ok, t.missing)} />
                <Line label={t.dbRetries} value={`${status.attempts?.db ?? 1}`} />
                <Line label={t.storageRetries} value={`${status.attempts?.storage ?? 1}`} />
                <Line label={t.retryConfig} value={`${status.retryConfig?.timeoutRetries ?? 2} / ${status.retryConfig?.baseDelayMs ?? 180}${t.milliseconds}`} />
              </Card>
              <Card title={t.codeRuntime}>
                <Line label={t.node} value={status.runtime.node} />
                <Line label={t.uptime} value={`${status.runtime.uptimeSec}s`} />
                <Line label={t.env} value={status.runtime.env} />
                <Line label={t.files} value={`${status.source.files}`} />
                <Line label={t.size} value={`${(status.source.bytes / 1024 / 1024).toFixed(2)} MB`} />
              </Card>
              <ChecklistCard title={t.supabaseChecklist} items={supabaseChecklist} />
            </>
          )}

          {(mode === "all" || mode === "vercel") && (
            <>
              <Card title={t.vercelStatus}>
                <Line label={t.platform} value={toBool(status.vercel.isVercel, t.ok, t.missing)} />
                <Line label={t.environment} value={status.vercel.env} />
                <Line label={t.projectId} value={toBool(status.vercel.projectIdConfigured, t.ok, t.missing)} />
                <Line label={t.commit} value={status.vercel.gitCommitSha ?? t.noData} />
                <Line label={t.checked} value={formatDateTime(status.checkedAt, locale)} />
              </Card>
              <ChecklistCard title={t.vercelChecklist} items={vercelChecklist} />
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

function formatDateTime(isoDateTime: string, locale: AdminLocale) {
  return new Date(isoDateTime).toLocaleString(locale === "th" ? "th-TH" : "en-US");
}

function normalizeLatency(latencyMs: number | null) {
  if (typeof latencyMs !== "number" || Number.isNaN(latencyMs) || latencyMs < 0) {
    return 0;
  }
  return latencyMs;
}

function toPart(part: HealthPart, okLabel: string, downLabel: string, noDataLabel: string, msLabel: string) {
  if (!part.ok) return `${downLabel} (${part.error ?? "error"})`;
  return `${okLabel} (${part.latencyMs ?? noDataLabel} ${msLabel})`;
}

function toBool(value: boolean, yesLabel: string, noLabel: string) {
  return value ? yesLabel : noLabel;
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <h3 className="mb-3 text-sm font-semibold text-cyan-300">{title}</h3>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex justify-between gap-4 border-b border-slate-800 py-1 text-sm">
      <span className="text-slate-400">{label}</span>
      <span className="text-slate-100">{value}</span>
    </p>
  );
}

function MetricLine({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex items-center justify-between gap-3 border-b border-slate-800/80 pb-1">
      <span className="text-slate-400">{label}</span>
      <span className="font-semibold text-slate-100">{value}</span>
    </p>
  );
}

function ServiceStatusCard({
  title,
  part,
  healthyLabel,
  unhealthyLabel,
  noDataLabel,
  tone,
}: {
  title: string;
  part: HealthPart | null;
  healthyLabel: string;
  unhealthyLabel: string;
  noDataLabel: string;
  tone: "cyan" | "emerald" | "sky";
}) {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-400/35 bg-emerald-400/10"
      : tone === "sky"
        ? "border-sky-400/35 bg-sky-400/10"
        : "border-cyan-400/35 bg-cyan-400/10";

  return (
    <article className={`rounded-xl border p-3 ${toneClass}`}>
      <p className="text-sm font-semibold text-slate-100">{title}</p>
      <p className={`mt-1 text-sm font-semibold ${part?.ok ? "text-emerald-300" : "text-rose-300"}`}>
        {part ? (part.ok ? healthyLabel : unhealthyLabel) : noDataLabel}
      </p>
      <p className="mt-1 text-xs text-slate-200">{part?.latencyMs ?? noDataLabel} ms</p>
    </article>
  );
}

function LatencyChart({
  history,
  locale,
  sampleWindow,
  onSampleWindowChange,
  sampleWindows,
  thresholds,
  warnThresholdMs,
  criticalThresholdMs,
  onWarnThresholdChange,
  onCriticalThresholdChange,
  title,
  emptyText,
  samplesLabel,
  windowLabel,
  msLabel,
  thresholdLabel,
  warnThresholdLabel,
  criticalThresholdLabel,
  movingAverageLabel,
}: {
  history: LatencySnapshot[];
  locale: AdminLocale;
  sampleWindow: SampleWindow;
  onSampleWindowChange: (value: SampleWindow) => void;
  sampleWindows: SampleWindow[];
  thresholds: number[];
  warnThresholdMs: number;
  criticalThresholdMs: number;
  onWarnThresholdChange: (value: number) => void;
  onCriticalThresholdChange: (value: number) => void;
  title: string;
  emptyText: string;
  samplesLabel: string;
  windowLabel: string;
  msLabel: string;
  thresholdLabel: string;
  warnThresholdLabel: string;
  criticalThresholdLabel: string;
  movingAverageLabel: string;
}) {
  if (history.length === 0) {
    return (
      <section className="rounded-xl border border-slate-700/70 bg-slate-950/55 p-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-cyan-200">{title}</h3>
          <SampleWindowControl
            sampleWindow={sampleWindow}
            onSampleWindowChange={onSampleWindowChange}
            sampleWindows={sampleWindows}
            label={windowLabel}
          />
        </div>
        <ThresholdControl
          thresholdLabel={thresholdLabel}
          warnThresholdLabel={warnThresholdLabel}
          criticalThresholdLabel={criticalThresholdLabel}
          msLabel={msLabel}
          warnThresholdMs={warnThresholdMs}
          criticalThresholdMs={criticalThresholdMs}
          onWarnThresholdChange={onWarnThresholdChange}
          onCriticalThresholdChange={onCriticalThresholdChange}
        />
        <p className="mt-2 text-xs text-slate-400">{emptyText}</p>
      </section>
    );
  }

  const movingAverage = buildMovingAverage(history, 3);
  const maxLatency = Math.max(
    thresholds[thresholds.length - 1] ?? 1,
    ...history.flatMap((point) => [point.api, point.db, point.storage]),
    ...movingAverage,
  );
  const movingAveragePolyline = movingAverage
    .map((value, index) => {
      const x = history.length === 1 ? 50 : (index / (history.length - 1)) * 100;
      const y = 100 - Math.min(100, Math.max(0, (value / maxLatency) * 100));
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <section className="rounded-xl border border-slate-700/70 bg-slate-950/55 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-cyan-200">{title}</h3>
        <div className="flex items-center gap-3">
          <p className="text-xs text-slate-400">
            {samplesLabel}: {history.length}
          </p>
          <SampleWindowControl
            sampleWindow={sampleWindow}
            onSampleWindowChange={onSampleWindowChange}
            sampleWindows={sampleWindows}
            label={windowLabel}
          />
        </div>
      </div>
      <ThresholdControl
        thresholdLabel={thresholdLabel}
        warnThresholdLabel={warnThresholdLabel}
        criticalThresholdLabel={criticalThresholdLabel}
        msLabel={msLabel}
        warnThresholdMs={warnThresholdMs}
        criticalThresholdMs={criticalThresholdMs}
        onWarnThresholdChange={onWarnThresholdChange}
        onCriticalThresholdChange={onCriticalThresholdChange}
      />

      <div className="relative isolate mt-3 h-40 overflow-hidden rounded-lg border border-slate-800/80 bg-slate-950/70 px-2 pb-2 pt-1">
        {thresholds.map((threshold) => {
          const pct = Math.min(100, Math.max(0, (threshold / maxLatency) * 100));
          return (
            <div
              key={threshold}
              className="pointer-events-none absolute inset-x-2 border-t border-dashed border-amber-300/50"
              style={{ bottom: `${pct}%` }}
            >
              <span className="absolute -top-3 right-0 bg-slate-950/90 px-1 text-[10px] text-amber-200">
                {threshold} {msLabel}
              </span>
            </div>
          );
        })}

        <div className="pointer-events-none absolute inset-2 z-10 overflow-hidden">
          <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            <polyline
              fill="none"
              stroke="#f472b6"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={movingAveragePolyline}
            />
          </svg>
        </div>

        <div className="relative flex h-full items-end gap-1 overflow-x-auto">
          {history.map((point, index) => {
            const apiHeight = Math.max(6, Math.round((point.api / maxLatency) * 100));
            const dbHeight = Math.max(6, Math.round((point.db / maxLatency) * 100));
            const storageHeight = Math.max(6, Math.round((point.storage / maxLatency) * 100));
            const tooltip = `${new Date(point.stamp).toLocaleTimeString(locale === "th" ? "th-TH" : "en-US")} | API ${point.api}${msLabel}, DB ${point.db}${msLabel}, Storage ${point.storage}${msLabel}`;

            return (
              <div key={`${point.stamp}-${index}`} className="flex min-w-5 flex-col items-center justify-end gap-1" title={tooltip}>
                <span className="w-1.5 rounded-sm bg-cyan-300" style={{ height: `${apiHeight}%` }} />
                <span className="w-1.5 rounded-sm bg-emerald-300" style={{ height: `${dbHeight}%` }} />
                <span className="w-1.5 rounded-sm bg-sky-300" style={{ height: `${storageHeight}%` }} />
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
        <Legend color="bg-cyan-300" label="API" />
        <Legend color="bg-emerald-300" label="DB" />
        <Legend color="bg-sky-300" label="Storage" />
        <Legend color="bg-pink-400" label={movingAverageLabel} />
      </div>
    </section>
  );
}

function ThresholdControl({
  thresholdLabel,
  warnThresholdLabel,
  criticalThresholdLabel,
  msLabel,
  warnThresholdMs,
  criticalThresholdMs,
  onWarnThresholdChange,
  onCriticalThresholdChange,
}: {
  thresholdLabel: string;
  warnThresholdLabel: string;
  criticalThresholdLabel: string;
  msLabel: string;
  warnThresholdMs: number;
  criticalThresholdMs: number;
  onWarnThresholdChange: (value: number) => void;
  onCriticalThresholdChange: (value: number) => void;
}) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
      <span className="font-semibold text-slate-300">{thresholdLabel}</span>
      <label className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900/80 px-2 py-1 text-slate-300">
        <span>{warnThresholdLabel}</span>
        <input
          type="number"
          min={1}
          step={10}
          value={warnThresholdMs}
          onChange={(event) => {
            const value = Number(event.target.value);
            if (Number.isFinite(value) && value > 0) onWarnThresholdChange(value);
          }}
          className="w-16 rounded bg-slate-950 px-1 py-0.5 text-right text-slate-100 outline-none"
        />
        <span>{msLabel}</span>
      </label>
      <label className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900/80 px-2 py-1 text-slate-300">
        <span>{criticalThresholdLabel}</span>
        <input
          type="number"
          min={1}
          step={10}
          value={criticalThresholdMs}
          onChange={(event) => {
            const value = Number(event.target.value);
            if (Number.isFinite(value) && value > 0) onCriticalThresholdChange(value);
          }}
          className="w-16 rounded bg-slate-950 px-1 py-0.5 text-right text-slate-100 outline-none"
        />
        <span>{msLabel}</span>
      </label>
    </div>
  );
}

function SampleWindowControl({
  sampleWindow,
  onSampleWindowChange,
  sampleWindows,
  label,
}: {
  sampleWindow: SampleWindow;
  onSampleWindowChange: (value: SampleWindow) => void;
  sampleWindows: SampleWindow[];
  label: string;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900/80 p-1">
      <span className="px-1 text-[11px] text-slate-400">{label}</span>
      {sampleWindows.map((windowSize) => {
        const active = windowSize === sampleWindow;
        return (
          <button
            key={windowSize}
            type="button"
            onClick={() => onSampleWindowChange(windowSize)}
            className={`rounded-md px-2 py-1 text-xs font-semibold transition ${
              active ? "bg-cyan-400 text-slate-950" : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            {windowSize}
          </button>
        );
      })}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block h-2.5 w-2.5 rounded-sm ${color}`} />
      {label}
    </span>
  );
}

function buildMovingAverage(history: LatencySnapshot[], windowSize: number) {
  return history.map((_, index) => {
    const start = Math.max(0, index - windowSize + 1);
    const slice = history.slice(start, index + 1);
    const total = slice.reduce((sum, point) => sum + point.api + point.db + point.storage, 0);
    return total / (slice.length * 3);
  });
}

function ChecklistCard({
  title,
  items,
}: {
  title: string;
  items: Array<{ label: string; done: boolean }>;
}) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <h3 className="mb-3 text-sm font-semibold text-cyan-300">{title}</h3>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.label} className="flex items-start gap-2 text-sm">
            <span
              className={`mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
                item.done ? "bg-emerald-500/30 text-emerald-200" : "bg-amber-500/30 text-amber-200"
              }`}
            >
              {item.done ? "OK" : "!"}
            </span>
            <span className={item.done ? "text-slate-200" : "text-amber-100"}>{item.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
