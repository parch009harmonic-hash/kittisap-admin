import { requireDeveloper } from "../../../../../lib/auth/admin";
import { getAdminLocale } from "../../../../../lib/i18n/admin";
import GitHubOpsClient from "../../../../components/admin/developer/GitHubOpsClient";

export default async function AdminDeveloperGitHubPage() {
  await requireDeveloper();
  const locale = await getAdminLocale();

  return (
    <div className="space-y-4">
      <GitHubOpsClient locale={locale} />
    </div>
  );
}

