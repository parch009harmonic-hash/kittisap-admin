import { requireDeveloper } from "../../../../../lib/auth/admin";
import { getAdminLocale } from "../../../../../lib/i18n/admin";
import DeveloperStatusClient from "../../../../components/admin/developer/DeveloperStatusClient";
import SupabaseInspectorClient from "../../../../components/admin/developer/SupabaseInspectorClient";

export default async function AdminDeveloperSupabasePage() {
  await requireDeveloper();
  const locale = await getAdminLocale();

  return (
    <div className="space-y-4">
      <DeveloperStatusClient mode="supabase" locale={locale} />
      <SupabaseInspectorClient locale={locale} />
    </div>
  );
}

