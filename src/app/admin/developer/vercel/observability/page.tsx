import { requireDeveloper } from "../../../../../../lib/auth/admin";
import { getAdminLocale } from "../../../../../../lib/i18n/admin";
import DeveloperStatusClient from "../../../../../components/admin/developer/DeveloperStatusClient";
import VercelObservabilityClient from "../../../../../components/admin/developer/VercelObservabilityClient";

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const json = Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function pickFirstNonEmpty(...values: Array<string | undefined | null>) {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

function inferProjectSlugFromUrl(urlOrHost?: string | null) {
  const raw = urlOrHost?.trim();
  if (!raw) return null;
  const host = raw.replace(/^https?:\/\//i, "").split("/")[0]?.toLowerCase();
  if (!host || !host.endsWith(".vercel.app")) return null;
  const [subdomain] = host.split(".");
  return subdomain?.trim() || null;
}

export default async function AdminDeveloperVercelObservabilityPage() {
  await requireDeveloper();
  const locale = await getAdminLocale();

  const oidcPayload = process.env.VERCEL_OIDC_TOKEN
    ? decodeJwtPayload(process.env.VERCEL_OIDC_TOKEN)
    : null;
  const oidcOwner = typeof oidcPayload?.owner === "string" ? oidcPayload.owner : null;
  const oidcProject = typeof oidcPayload?.project === "string" ? oidcPayload.project : null;

  const teamSlug = pickFirstNonEmpty(process.env.VERCEL_TEAM_SLUG, process.env.VERCEL_ORG_SLUG, oidcOwner);
  const projectSlug = pickFirstNonEmpty(
    process.env.VERCEL_PROJECT_SLUG,
    process.env.VERCEL_PROJECT_NAME,
    oidcProject,
    inferProjectSlugFromUrl(process.env.NEXT_PUBLIC_SITE_URL),
    inferProjectSlugFromUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL),
    inferProjectSlugFromUrl(process.env.VERCEL_URL),
  );
  const projectId = pickFirstNonEmpty(process.env.VERCEL_PROJECT_ID);
  const projectObservabilityUrl = teamSlug && projectSlug
    ? `https://vercel.com/${teamSlug}/${projectSlug}/observability`
    : projectId
      ? `https://vercel.com/dashboard/observability?projectId=${encodeURIComponent(projectId)}`
      : null;
  const dashboardObservabilityUrl = "https://vercel.com/dashboard/observability";

  return (
    <div className="space-y-4">
      <DeveloperStatusClient mode="vercel" locale={locale} />
      <VercelObservabilityClient
        locale={locale}
        projectObservabilityUrl={projectObservabilityUrl}
        dashboardObservabilityUrl={dashboardObservabilityUrl}
        teamSlug={teamSlug}
        projectSlug={projectSlug}
      />
    </div>
  );
}

