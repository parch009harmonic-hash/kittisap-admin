import { requireDeveloper } from "../../../../../lib/auth/admin";
import { getAdminLocale } from "../../../../../lib/i18n/admin";
import DeveloperStatusClient from "../../../../components/admin/developer/DeveloperStatusClient";
import VercelInsightsClient from "../../../../components/admin/developer/VercelInsightsClient";

export default async function AdminDeveloperVercelPage() {
  await requireDeveloper();
  const locale = await getAdminLocale();

  return (
    <div className="space-y-4">
      <DeveloperStatusClient mode="vercel" locale={locale} />
      <VercelInsightsClient locale={locale} />
    </div>
  );
}

