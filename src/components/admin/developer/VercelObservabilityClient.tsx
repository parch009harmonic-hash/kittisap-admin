"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { AdminLocale } from "../../../../lib/i18n/admin";
import { assertApiSuccess } from "../api-error";

type VercelObservabilityClientProps = {
  locale: AdminLocale;
  projectObservabilityUrl: string | null;
  dashboardObservabilityUrl: string;
  teamSlug: string | null;
  projectSlug: string | null;
};

type InsightsPayload = {
  ok: boolean;
  checkedAt: string;
  usage: {
    recent7dDeployments: number;
    recent7dSuccessRate: number | null;
  };
  deployments: Array<{
    uid: string;
    state: string;
    createdAt: number;
  }>;
  error?: string;
};

type DailyPoint = {
  label: string;
  total: number;
  ready: number;
};

function toLocalDateKey(input: number | Date) {
  const date = typeof input === "number" ? new Date(input) : input;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function bucketByDay(deployments: InsightsPayload["deployments"], locale: AdminLocale): DailyPoint[] {
  const counts = new Map<string, { total: number; ready: number }>();
  for (const item of deployments) {
    const key = toLocalDateKey(item.createdAt);
    const prev = counts.get(key) ?? { total: 0, ready: 0 };
    prev.total += 1;
    if (item.state === "READY") prev.ready += 1;
    counts.set(key, prev);
  }

  const days: DailyPoint[] = [];
  const now = new Date();

  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    const key = toLocalDateKey(date);
    const label = date.toLocaleDateString(locale === "th" ? "th-TH" : "en-US", {
      month: "numeric",
      day: "numeric",
    });
    const point = counts.get(key) ?? { total: 0, ready: 0 };
    days.push({ label: `${label}`, total: point.total, ready: point.ready });
  }

  return days;
}

export default function VercelObservabilityClient({
  locale,
  projectObservabilityUrl,
  dashboardObservabilityUrl,
  teamSlug,
  projectSlug,
}: VercelObservabilityClientProps) {
  const [payload, setPayload] = useState<InsightsPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [lastLoadedAt, setLastLoadedAt] = useState<string | null>(null);

  const t = useMemo(
    () =>
      locale === "th"
        ? {
            title: "Vercel Observability",
            subtitle: "ดูกราฟ Deployments 7 วันล่าสุด และเข้า Observability ได้จากหน้านี้",
            projectBtn: "เปิด Observability (Project)",
            dashboardBtn: "เปิด Observability (Dashboard)",
            noteReady: "พร้อมใช้งาน",
            noteMissing: "ยังไม่มีลิงก์ระดับโปรเจกต์",
            hint: "ถ้าไม่ขึ้นลิงก์โปรเจกต์ ให้เพิ่ม env แล้ว redeploy",
            detected: "ค่าที่ตรวจพบ",
            team: "ทีม",
            project: "โปรเจกต์",
            missing: "ไม่พบ",
            refresh: "รีเฟรช",
            loading: "กำลังโหลด...",
            graphTitle: "Deployment Activity (7 วัน)",
            total7d: "รวม 7 วัน",
            successRate: "อัตราสำเร็จ",
            empty: "ยังไม่มีข้อมูลกราฟ",
            apiError: "โหลดข้อมูล Vercel ไม่สำเร็จ",
            total: "รวม",
            ready: "สำเร็จ",
            checkedAt: "อัปเดตล่าสุด",
          }
        : {
            title: "Vercel Observability",
            subtitle: "View 7-day deployment graph and open Observability from this page",
            projectBtn: "Open Observability (Project)",
            dashboardBtn: "Open Observability (Dashboard)",
            noteReady: "Ready",
            noteMissing: "Project-scoped link is unavailable",
            hint: "Set env values and redeploy to enable project link",
            detected: "Detected values",
            team: "Team",
            project: "Project",
            missing: "missing",
            refresh: "Refresh",
            loading: "Loading...",
            graphTitle: "Deployment Activity (7d)",
            total7d: "Total 7d",
            successRate: "Success rate",
            empty: "No graph data yet",
            apiError: "Failed to load Vercel data",
            total: "Total",
            ready: "Ready",
            checkedAt: "Last updated",
          },
    [locale],
  );

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setFetchError(null);
    try {
      const response = await fetch("/api/admin/developer/vercel/insights", {
        cache: "no-store",
        signal,
      });
      const json = (await response.json()) as Partial<InsightsPayload>;
      assertApiSuccess({
        response,
        payload: json,
        fallbackMessage: t.apiError,
        locale,
        requireOkField: true,
      });
      const normalized = json as InsightsPayload;
      setPayload(normalized);
      setLastLoadedAt(normalized.checkedAt);
    } catch (error) {
      if (signal?.aborted) return;
      setFetchError(error instanceof Error ? error.message : t.apiError);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [locale, t.apiError]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    const timer = setInterval(() => {
      void load(controller.signal);
    }, 30000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [load]);

  const daily = useMemo(() => (payload ? bucketByDay(payload.deployments, locale) : []), [payload, locale]);
  const maxValue = Math.max(1, ...daily.map((item) => item.total));

  return (
    <section className="rounded-2xl border border-cyan-400/25 bg-slate-900/60 p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">{t.title}</p>
          <h2 className="mt-1 text-xl font-semibold text-white">{t.subtitle}</h2>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-lg border border-cyan-300/70 bg-cyan-400/20 px-3 py-2 text-xs font-semibold text-cyan-100 disabled:opacity-60"
        >
          {loading ? t.loading : t.refresh}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        {projectObservabilityUrl ? (
          <a
            href={projectObservabilityUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950"
          >
            {t.projectBtn}
          </a>
        ) : (
          <span className="rounded-lg border border-amber-400/50 bg-amber-500/10 px-4 py-2 text-sm text-amber-200">{t.noteMissing}</span>
        )}

        <a
          href={dashboardObservabilityUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-cyan-300/70 bg-cyan-400/20 px-4 py-2 text-sm font-semibold text-cyan-100"
        >
          {t.dashboardBtn}
        </a>
      </div>

      <p className="mt-3 text-xs text-slate-300">{projectObservabilityUrl ? t.noteReady : t.hint}</p>
      <p className="mt-1 text-xs text-slate-400">
        {t.detected}: {t.team}={teamSlug ?? t.missing}, {t.project}={projectSlug ?? t.missing}
      </p>
      {lastLoadedAt ? (
        <p className="mt-1 text-xs text-slate-500">
          {t.checkedAt}: {new Date(lastLoadedAt).toLocaleString(locale === "th" ? "th-TH" : "en-US")}
        </p>
      ) : null}

      <section className="mt-4 rounded-xl border border-slate-800 bg-slate-950/55 p-3">
        <h3 className="text-sm font-semibold text-cyan-200">{t.graphTitle}</h3>

        {fetchError ? <p className="mt-2 text-xs text-rose-200">{fetchError}</p> : null}

        {!fetchError && daily.length > 0 ? (
          <>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-300">
              <p>
                {t.total7d}: <span className="font-semibold text-slate-100">{payload?.usage.recent7dDeployments ?? 0}</span>
              </p>
              <p>
                {t.successRate}: <span className="font-semibold text-slate-100">{payload?.usage.recent7dSuccessRate ?? 0}%</span>
              </p>
            </div>

            <div className="mt-3 flex h-44 items-end gap-2 overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/70 p-3">
              {daily.map((point) => {
                const totalH = Math.max(6, Math.round((point.total / maxValue) * 100));
                const readyH = point.total > 0 ? Math.max(4, Math.round((point.ready / point.total) * totalH)) : 0;
                return (
                  <div key={point.label} className="flex min-w-12 flex-col items-center justify-end gap-1" title={`${point.label}: ${t.total} ${point.total}, ${t.ready} ${point.ready}`}>
                    <div className="relative flex h-28 w-6 items-end rounded bg-slate-900/80">
                      <span className="block w-full rounded bg-cyan-400/45" style={{ height: `${totalH}%` }} />
                      <span className="absolute bottom-0 block w-full rounded bg-emerald-400/75" style={{ height: `${readyH}%` }} />
                    </div>
                    <span className="text-[10px] text-slate-400">{point.label}</span>
                  </div>
                );
              })}
            </div>

            <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded bg-cyan-400/45" />{t.total}</span>
              <span className="inline-flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded bg-emerald-400/75" />{t.ready}</span>
            </div>
          </>
        ) : null}

        {!fetchError && daily.length === 0 ? <p className="mt-2 text-xs text-slate-400">{t.empty}</p> : null}
      </section>
    </section>
  );
}
