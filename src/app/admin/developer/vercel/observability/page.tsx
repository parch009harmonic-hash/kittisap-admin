import { requireDeveloper } from "../../../../../../lib/auth/admin";
import { getAdminLocale } from "../../../../../../lib/i18n/admin";
import DeveloperStatusClient from "../../../../../components/admin/developer/DeveloperStatusClient";
import VercelObservabilityClient from "../../../../../components/admin/developer/VercelObservabilityClient";

export default async function AdminDeveloperVercelObservabilityPage() {
  await requireDeveloper({ allowAdmin: true });
  const locale = await getAdminLocale();

  const teamSlug = process.env.VERCEL_TEAM_SLUG?.trim();
  const projectSlug = process.env.VERCEL_PROJECT_SLUG?.trim();
  const projectObservabilityUrl =
    teamSlug && projectSlug ? `https://vercel.com/${teamSlug}/${projectSlug}/observability` : null;
  const dashboardObservabilityUrl = "https://vercel.com/dashboard/observability";

  return (
    <div className="space-y-4">
      <DeveloperStatusClient mode="vercel" locale={locale} />
      <VercelObservabilityClient
        locale={locale}
        projectObservabilityUrl={projectObservabilityUrl}
        dashboardObservabilityUrl={dashboardObservabilityUrl}
      />
    </div>
  );
}
