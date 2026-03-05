import { redirect } from "next/navigation";

import { getAdminActor } from "../../../../../lib/auth/admin";
import { getWebHomepagePopupSettings } from "../../../../../lib/db/web-settings";
import { getAdminLocale } from "../../../../../lib/i18n/admin";
import { getDefaultWebHomepagePopupSettings } from "../../../../../lib/types/web-settings";
import HomepagePopupSettingsClient from "../../../../components/admin/web-settings/HomepagePopupSettingsClient";

export default async function AdminWebHomepagePopupSettingsPage() {
  const locale = await getAdminLocale();
  const actor = await getAdminActor();
  if (!actor || actor.role !== "admin") {
    redirect("/admin?error=admin_only");
  }

  let initialSettings = getDefaultWebHomepagePopupSettings();
  let bootstrapError: string | null = null;

  try {
    initialSettings = await getWebHomepagePopupSettings();
  } catch (error) {
    bootstrapError = error instanceof Error ? error.message : "Failed to load homepage popup settings";
  }

  return (
    <HomepagePopupSettingsClient
      locale={locale}
      initialSettings={initialSettings}
      bootstrapError={bootstrapError}
    />
  );
}
