import { ReactNode } from "react";

import { getAdminActor, requireAdmin } from "../../../lib/auth/admin";
import { getAdminSettings } from "../../../lib/db/admin-settings";
import { getAdminLocale } from "../../../lib/i18n/admin";
import { ThemePreset, UiMode } from "../../../lib/types/admin-settings";
import { AdminShell } from "../../components/admin/AdminShell";

type AdminLayoutProps = {
  children: ReactNode;
};

export default async function AdminLayout({ children }: AdminLayoutProps) {
  await requireAdmin();
  const actor = await getAdminActor();
  const locale = await getAdminLocale();

  let initialUiMode: UiMode = "auto";
  let initialThemePreset: ThemePreset = "default";

  try {
    const settings = await getAdminSettings();
    initialUiMode = settings.uiMode;
    initialThemePreset = settings.themePreset;
  } catch {
    initialUiMode = "auto";
    initialThemePreset = "default";
  }

  return (
    <AdminShell
      initialLocale={locale}
      initialUiMode={initialUiMode}
      initialThemePreset={initialThemePreset}
      actorRole={actor?.role ?? "staff"}
      showDeveloperMenu={actor?.role === "admin"}
    >
      {children}
    </AdminShell>
  );
}
