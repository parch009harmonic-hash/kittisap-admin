import { ReactNode } from "react";

import { requireAdmin } from "../../../lib/auth/admin";
import { getAdminSettings } from "../../../lib/db/admin-settings";
import { getAdminLocale } from "../../../lib/i18n/admin";
import { UiMode } from "../../../lib/types/admin-settings";
import { AdminShell } from "../../components/admin/AdminShell";

type AdminLayoutProps = {
  children: ReactNode;
};

export default async function AdminLayout({ children }: AdminLayoutProps) {
  await requireAdmin();
  const locale = await getAdminLocale();
  let initialUiMode: UiMode = "auto";

  try {
    const settings = await getAdminSettings();
    initialUiMode = settings.uiMode;
  } catch {
    initialUiMode = "auto";
  }

  return (
    <AdminShell initialLocale={locale} initialUiMode={initialUiMode}>
      {children}
    </AdminShell>
  );
}
