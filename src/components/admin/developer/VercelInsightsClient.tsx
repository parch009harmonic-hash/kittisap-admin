"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { AdminLocale } from "../../../../lib/i18n/admin";
import { assertApiSuccess } from "../api-error";

type TabKey = "overview" | "usage" | "deployments" | "branches" | "projects" | "env" | "speed";

type Payload = {
  ok: boolean;
  checkedAt: string;
  overview: {
    linked: boolean;
    env: string;
    projectIdConfigured: boolean;
    teamConfigured: boolean;
    tokenConfigured: boolean;
    currentBranch: string | null;
    currentCommit: string | null;
  };
  usage: {
    recent7dDeployments: number;
    recent7dProductionDeployments: number;
    recent7dPreviewDeployments: number;
    recent7dSuccessRate: number | null;
    avgDeployDurationMs: number | null;
  };
  speedInsights: {
    enabled: boolean;
    avgDeployDurationMs: number | null;
    sampleSize: number;
  };
  activeBranches: string[];
  deployments: Array<{
    uid: string;
    name: string;
    url: string;
    state: string;
    target: string | null;
    branch: string | null;
    createdAt: number;
    readyStateAt: number | null;
  }>;
  projects: Array<{ id: string; name: string; framework: string | null; updatedAt: number | null }>;
  environmentVariables: {
    runtime: Array<{ key: string; valueMasked: string; source: string }>;
    project: Array<{ key: string; type: string; target: string[]; createdAt: number | null }>;
  };
  error?: string;
};

const TABS: TabKey[] = ["overview", "usage", "deployments", "branches", "projects", "env", "speed"];

export default function VercelInsightsClient({ locale }: { locale: AdminLocale }) {
  const [tab, setTab] = useState<TabKey>("overview");
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = useMemo(
    () =>
      locale === "th"
        ? {
            title: "Vercel Control Center",
            subtitle: "รวมสถานะ Vercel ที่สำคัญพร้อมแท็บแยกอ่านง่าย",
            refresh: "รีเฟรช",
            loading: "กำลังโหลด...",
            overview: "ภาพรวม",
            usage: "Overview Usage",
            deployments: "Deployments",
            branches: "Active Branches",
            projects: "Projects",
            env: "Environment Variables",
            speed: "Speed Insights",
            yes: "พร้อม",
            no: "ไม่พร้อม",
            none: "ไม่มีข้อมูล",
            checkedAt: "ตรวจล่าสุด",
            linked: "Project linked",
            tokenConfigured: "Vercel token",
            teamConfigured: "Team configured",
            currentBranch: "Current branch",
            currentCommit: "Current commit",
            envName: "Environment",
            successRate: "Success rate 7d",
            avgDuration: "Average deploy duration",
            deployments7d: "Deployments 7d",
            production7d: "Production 7d",
            preview7d: "Preview 7d",
            state: "State",
            target: "Target",
            branch: "Branch",
            createdAt: "Created",
            url: "URL",
            framework: "Framework",
            updatedAt: "Updated",
            runtimeEnv: "Runtime env",
            projectEnv: "Project env",
            maskedValue: "Masked value",
            type: "Type",
            enabled: "Enabled",
            sampleSize: "Sample size",
          }
        : {
            title: "Vercel Control Center",
            subtitle: "Organized Vercel data with tab navigation",
            refresh: "Refresh",
            loading: "Loading...",
            overview: "Overview",
            usage: "Overview Usage",
            deployments: "Deployments",
            branches: "Active Branches",
            projects: "Projects",
            env: "Environment Variables",
            speed: "Speed Insights",
            yes: "Yes",
            no: "No",
            none: "No data",
            checkedAt: "Checked",
            linked: "Project linked",
            tokenConfigured: "Vercel token",
            teamConfigured: "Team configured",
            currentBranch: "Current branch",
            currentCommit: "Current commit",
            envName: "Environment",
            successRate: "Success rate 7d",
            avgDuration: "Average deploy duration",
            deployments7d: "Deployments 7d",
            production7d: "Production 7d",
            preview7d: "Preview 7d",
            state: "State",
            target: "Target",
            branch: "Branch",
            createdAt: "Created",
            url: "URL",
            framework: "Framework",
            updatedAt: "Updated",
            runtimeEnv: "Runtime env",
            projectEnv: "Project env",
            maskedValue: "Masked value",
            type: "Type",
            enabled: "Enabled",
            sampleSize: "Sample size",
          },
    [locale],
  );

  const tabLabel: Record<TabKey, string> = {
    overview: t.overview,
    usage: t.usage,
    deployments: t.deployments,
    branches: t.branches,
    projects: t.projects,
    env: t.env,
    speed: t.speed,
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/developer/vercel/insights", { cache: "no-store" });
      const json = (await response.json()) as Payload;
      assertApiSuccess({
        response,
        payload: json,
        fallbackMessage: "Failed to load Vercel insights",
        locale,
        requireOkField: true,
      });
      setPayload(json);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="rounded-2xl border border-cyan-400/25 bg-slate-900/60 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">{t.title}</p>
          <p className="mt-1 text-sm text-slate-300">{t.subtitle}</p>
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

      <div className="mt-3 flex flex-wrap gap-2 rounded-xl border border-slate-800 bg-slate-950/50 p-2">
        {TABS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
              tab === item ? "bg-cyan-400 text-slate-950" : "bg-slate-900 text-slate-200 hover:bg-slate-800"
            }`}
          >
            {tabLabel[item]}
          </button>
        ))}
      </div>

      {error ? <p className="mt-3 rounded-lg bg-rose-900/40 p-2 text-xs text-rose-100">{error}</p> : null}
      {!payload ? <p className="mt-3 text-xs text-slate-400">{t.none}</p> : null}

      {payload && (
        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/45 p-3 text-xs text-slate-200">
          <p className="mb-2 text-slate-400">
            {t.checkedAt}: {new Date(payload.checkedAt).toLocaleString(locale === "th" ? "th-TH" : "en-US")}
          </p>

          {tab === "overview" && (
            <div className="grid gap-2 md:grid-cols-2">
              <Info label={t.linked} value={payload.overview.linked ? t.yes : t.no} />
              <Info label={t.envName} value={payload.overview.env} />
              <Info label={t.tokenConfigured} value={payload.overview.tokenConfigured ? t.yes : t.no} />
              <Info label={t.teamConfigured} value={payload.overview.teamConfigured ? t.yes : t.no} />
              <Info label={t.currentBranch} value={payload.overview.currentBranch ?? t.none} />
              <Info label={t.currentCommit} value={payload.overview.currentCommit ?? t.none} />
            </div>
          )}

          {tab === "usage" && (
            <div className="grid gap-2 md:grid-cols-2">
              <Info label={t.deployments7d} value={`${payload.usage.recent7dDeployments}`} />
              <Info label={t.production7d} value={`${payload.usage.recent7dProductionDeployments}`} />
              <Info label={t.preview7d} value={`${payload.usage.recent7dPreviewDeployments}`} />
              <Info label={t.successRate} value={payload.usage.recent7dSuccessRate != null ? `${payload.usage.recent7dSuccessRate}%` : t.none} />
              <Info label={t.avgDuration} value={payload.usage.avgDeployDurationMs != null ? `${payload.usage.avgDeployDurationMs} ms` : t.none} />
            </div>
          )}

          {tab === "deployments" && (
            <div className="max-h-80 overflow-auto">
              {payload.deployments.length === 0 ? (
                <p className="text-slate-400">{t.none}</p>
              ) : (
                <table className="w-full min-w-[760px]">
                  <thead className="text-slate-400">
                    <tr>
                      <th className="px-2 py-1 text-left">Name</th>
                      <th className="px-2 py-1 text-left">{t.state}</th>
                      <th className="px-2 py-1 text-left">{t.target}</th>
                      <th className="px-2 py-1 text-left">{t.branch}</th>
                      <th className="px-2 py-1 text-left">{t.url}</th>
                      <th className="px-2 py-1 text-left">{t.createdAt}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payload.deployments.map((item) => (
                      <tr key={item.uid} className="border-t border-slate-800">
                        <td className="px-2 py-1">{item.name}</td>
                        <td className="px-2 py-1">{item.state}</td>
                        <td className="px-2 py-1">{item.target ?? "-"}</td>
                        <td className="px-2 py-1">{item.branch ?? "-"}</td>
                        <td className="px-2 py-1">
                          <a href={`https://${item.url}`} target="_blank" rel="noreferrer" className="text-cyan-300 underline">
                            {item.url}
                          </a>
                        </td>
                        <td className="px-2 py-1">{new Date(item.createdAt).toLocaleString(locale === "th" ? "th-TH" : "en-US")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {tab === "branches" && (
            <div className="flex flex-wrap gap-2">
              {payload.activeBranches.length === 0 ? (
                <p className="text-slate-400">{t.none}</p>
              ) : (
                payload.activeBranches.map((branch) => (
                  <span key={branch} className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1">
                    {branch}
                  </span>
                ))
              )}
            </div>
          )}

          {tab === "projects" && (
            <div className="max-h-72 overflow-auto">
              {payload.projects.length === 0 ? (
                <p className="text-slate-400">{t.none}</p>
              ) : (
                <table className="w-full min-w-[520px]">
                  <thead className="text-slate-400">
                    <tr>
                      <th className="px-2 py-1 text-left">Name</th>
                      <th className="px-2 py-1 text-left">ID</th>
                      <th className="px-2 py-1 text-left">{t.framework}</th>
                      <th className="px-2 py-1 text-left">{t.updatedAt}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payload.projects.map((item) => (
                      <tr key={item.id} className="border-t border-slate-800">
                        <td className="px-2 py-1">{item.name}</td>
                        <td className="px-2 py-1">{item.id}</td>
                        <td className="px-2 py-1">{item.framework ?? "-"}</td>
                        <td className="px-2 py-1">
                          {item.updatedAt ? new Date(item.updatedAt).toLocaleString(locale === "th" ? "th-TH" : "en-US") : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {tab === "env" && (
            <div className="space-y-3">
              <div>
                <p className="mb-1 font-semibold text-cyan-200">{t.runtimeEnv}</p>
                <div className="max-h-48 overflow-auto">
                  {payload.environmentVariables.runtime.length === 0 ? (
                    <p className="text-slate-400">{t.none}</p>
                  ) : (
                    <table className="w-full min-w-[520px]">
                      <thead className="text-slate-400">
                        <tr>
                          <th className="px-2 py-1 text-left">Key</th>
                          <th className="px-2 py-1 text-left">{t.maskedValue}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payload.environmentVariables.runtime.map((item) => (
                          <tr key={item.key} className="border-t border-slate-800">
                            <td className="px-2 py-1">{item.key}</td>
                            <td className="px-2 py-1">{item.valueMasked}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              <div>
                <p className="mb-1 font-semibold text-cyan-200">{t.projectEnv}</p>
                <div className="max-h-48 overflow-auto">
                  {payload.environmentVariables.project.length === 0 ? (
                    <p className="text-slate-400">{t.none}</p>
                  ) : (
                    <table className="w-full min-w-[520px]">
                      <thead className="text-slate-400">
                        <tr>
                          <th className="px-2 py-1 text-left">Key</th>
                          <th className="px-2 py-1 text-left">{t.type}</th>
                          <th className="px-2 py-1 text-left">Target</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payload.environmentVariables.project.map((item) => (
                          <tr key={`${item.key}-${item.type}`} className="border-t border-slate-800">
                            <td className="px-2 py-1">{item.key}</td>
                            <td className="px-2 py-1">{item.type}</td>
                            <td className="px-2 py-1">{item.target.join(", ") || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === "speed" && (
            <div className="grid gap-2 md:grid-cols-2">
              <Info label={t.enabled} value={payload.speedInsights.enabled ? t.yes : t.no} />
              <Info label={t.avgDuration} value={payload.speedInsights.avgDeployDurationMs != null ? `${payload.speedInsights.avgDeployDurationMs} ms` : t.none} />
              <Info label={t.sampleSize} value={`${payload.speedInsights.sampleSize}`} />
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex items-center justify-between gap-2 rounded-md border border-slate-800 bg-slate-900/70 px-2 py-1.5">
      <span className="text-slate-400">{label}</span>
      <span className="font-semibold text-slate-100">{value}</span>
    </p>
  );
}
