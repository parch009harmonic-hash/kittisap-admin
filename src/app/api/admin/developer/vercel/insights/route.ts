import { NextResponse } from "next/server";

import { requireDeveloperApi } from "../../../../../../../lib/auth/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type VercelDeployment = {
  uid: string;
  name: string;
  url: string;
  state: string;
  target: string | null;
  createdAt: number;
  readyStateAt?: number;
  meta?: Record<string, string>;
};

function safeError(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

function maskEnvValue(value: string | undefined) {
  if (!value) return "";
  if (value.length <= 8) return "****";
  return `${value.slice(0, 4)}****${value.slice(-2)}`;
}

async function fetchVercelJson<T>(path: string, token: string) {
  const response = await fetch(`https://api.vercel.com${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });
  if (!response.ok) {
    return null;
  }
  return (await response.json()) as T;
}

export async function GET() {
  try {
    await requireDeveloperApi();

    const projectId = process.env.VERCEL_PROJECT_ID ?? "";
    const teamId = process.env.VERCEL_ORG_ID ?? process.env.VERCEL_TEAM_ID ?? "";
    const token = process.env.VERCEL_TOKEN ?? "";

    const vercelEnv = process.env.VERCEL_ENV ?? "local";
    const currentBranch = process.env.VERCEL_GIT_COMMIT_REF ?? null;
    const currentCommit = process.env.VERCEL_GIT_COMMIT_SHA ?? null;

    let deployments: VercelDeployment[] = [];
    let projects: Array<{ id: string; name: string; framework: string | null; updatedAt: number | null }> = [];
    let projectEnvVars: Array<{ key: string; type: string; target: string[]; createdAt: number | null }> = [];

    if (token) {
      const teamQuery = teamId ? `&teamId=${encodeURIComponent(teamId)}` : "";
      const deploymentsJson = await fetchVercelJson<{ deployments?: VercelDeployment[] }>(
        `/v6/deployments?limit=20${projectId ? `&projectId=${encodeURIComponent(projectId)}` : ""}${teamQuery}`,
        token,
      );
      deployments = deploymentsJson?.deployments ?? [];

      const projectsJson = await fetchVercelJson<{
        projects?: Array<{ id: string; name: string; framework?: string; updatedAt?: number }>;
      }>(`/v9/projects?limit=20${teamQuery}`, token);
      projects =
        projectsJson?.projects?.map((item) => ({
          id: item.id,
          name: item.name,
          framework: item.framework ?? null,
          updatedAt: item.updatedAt ?? null,
        })) ?? [];

      if (projectId) {
        const envJson = await fetchVercelJson<{
          envs?: Array<{ key: string; type: string; target?: string[]; createdAt?: number }>;
        }>(`/v10/projects/${encodeURIComponent(projectId)}/env?limit=100${teamQuery}`, token);
        projectEnvVars =
          envJson?.envs?.map((item) => ({
            key: item.key,
            type: item.type,
            target: item.target ?? [],
            createdAt: item.createdAt ?? null,
          })) ?? [];
      }
    }

    const activeBranches = Array.from(
      new Set(
        [
          currentBranch,
          ...deployments
            .map((item) => item.meta?.githubCommitRef ?? item.meta?.gitlabCommitRef ?? item.meta?.bitbucketCommitRef ?? null)
            .filter((item): item is string => Boolean(item)),
        ].filter((item): item is string => Boolean(item)),
      ),
    );

    const now = Date.now();
    const last7d = now - 7 * 24 * 60 * 60 * 1000;
    const recentDeployments = deployments.filter((item) => item.createdAt >= last7d);
    const productionDeployments = recentDeployments.filter((item) => item.target === "production");
    const previewDeployments = recentDeployments.filter((item) => item.target !== "production");
    const successDeployments = recentDeployments.filter((item) => item.state === "READY");

    const deployDurations = deployments
      .map((item) => {
        if (!item.readyStateAt || !item.createdAt) return null;
        return Math.max(0, item.readyStateAt - item.createdAt);
      })
      .filter((item): item is number => typeof item === "number");

    const avgDeployDurationMs =
      deployDurations.length > 0 ? Math.round(deployDurations.reduce((sum, value) => sum + value, 0) / deployDurations.length) : null;

    const envKeys = Object.keys(process.env)
      .filter((key) => key.startsWith("VERCEL") || key.startsWith("NEXT_PUBLIC_VERCEL"))
      .sort();

    const runtimeEnvVars = envKeys.map((key) => ({
      key,
      valueMasked: maskEnvValue(process.env[key]),
      source: "runtime",
    }));

    return NextResponse.json(
      {
        ok: true,
        checkedAt: new Date().toISOString(),
        overview: {
          linked: Boolean(projectId),
          env: vercelEnv,
          projectIdConfigured: Boolean(projectId),
          teamConfigured: Boolean(teamId),
          tokenConfigured: Boolean(token),
          currentBranch,
          currentCommit,
        },
        usage: {
          recent7dDeployments: recentDeployments.length,
          recent7dProductionDeployments: productionDeployments.length,
          recent7dPreviewDeployments: previewDeployments.length,
          recent7dSuccessRate:
            recentDeployments.length > 0 ? Math.round((successDeployments.length / recentDeployments.length) * 100) : null,
          avgDeployDurationMs,
        },
        speedInsights: {
          enabled: Boolean(process.env.VERCEL_SPEED_INSIGHTS_ID || process.env.NEXT_PUBLIC_VERCEL_SPEED_INSIGHTS_ID),
          avgDeployDurationMs,
          sampleSize: deployDurations.length,
        },
        activeBranches,
        deployments: deployments.slice(0, 12).map((item) => ({
          uid: item.uid,
          name: item.name,
          url: item.url,
          state: item.state,
          target: item.target,
          createdAt: item.createdAt,
          readyStateAt: item.readyStateAt ?? null,
          branch:
            item.meta?.githubCommitRef ?? item.meta?.gitlabCommitRef ?? item.meta?.bitbucketCommitRef ?? null,
        })),
        projects,
        environmentVariables: {
          runtime: runtimeEnvVars,
          project: projectEnvVars,
        },
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    const message = safeError(error);
    const status = message === "Unauthorized" ? 401 : message === "Developer only" ? 403 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

