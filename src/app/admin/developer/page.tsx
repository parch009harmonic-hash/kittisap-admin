import { requireDeveloper } from "../../../../lib/auth/admin";
import { getAdminLocale } from "../../../../lib/i18n/admin";
import DeveloperStatusClient from "../../../components/admin/developer/DeveloperStatusClient";

export default async function AdminDeveloperPage() {
  await requireDeveloper({ allowAdmin: true });
  const locale = await getAdminLocale();

  return (
    <div className="space-y-4">
      <DeveloperStatusClient mode="all" locale={locale} />
    </div>
  );
}
