import { redirect } from "next/navigation";

import { getAdminActor } from "../../../../../lib/auth/admin";
import { getWebHomepageAppearanceSettings } from "../../../../../lib/db/web-settings";
import { getAdminLocale } from "../../../../../lib/i18n/admin";
import { getDefaultWebHomepageAppearanceSettings } from "../../../../../lib/types/web-settings";
import HomepageSettingsClient from "../../../../components/admin/web-settings/HomepageSettingsClient";

export default async function AdminWebHomepageSettingsPage() {
  const locale = await getAdminLocale();
  const actor = await getAdminActor();
  if (!actor || actor.role !== "admin") {
    redirect("/admin?error=admin_only");
  }

  let initialSettings = getDefaultWebHomepageAppearanceSettings();
  let bootstrapError: string | null = null;

  try {
    initialSettings = await getWebHomepageAppearanceSettings();
  } catch (error) {
    bootstrapError = error instanceof Error ? error.message : "Failed to load web homepage settings";
  }

  return (
    <HomepageSettingsClient
      locale={locale}
      initialSettings={initialSettings}
      bootstrapError={bootstrapError}
    />
  );
}
