import { requireDeveloper } from "../../../../../lib/auth/admin";
import { getAdminLocale } from "../../../../../lib/i18n/admin";
import DeveloperRoleDebugClient from "../../../../components/admin/developer/DeveloperRoleDebugClient";

export default async function AdminDeveloperAuthRolePage() {
  await requireDeveloper();
  const locale = await getAdminLocale();

  return (
    <div className="space-y-4">
      <DeveloperRoleDebugClient locale={locale} />
    </div>
  );
}

