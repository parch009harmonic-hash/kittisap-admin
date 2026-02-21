import { requireDeveloper } from "../../../../../lib/auth/admin";
import { getAdminLocale } from "../../../../../lib/i18n/admin";
import UiAccessMonitorClient from "../../../../components/admin/developer/UiAccessMonitorClient";

export default async function AdminDeveloperUiCheckPage() {
  await requireDeveloper({ allowAdmin: true });
  const locale = await getAdminLocale();

  return (
    <div className="space-y-4">
      <UiAccessMonitorClient locale={locale} />
    </div>
  );
}
