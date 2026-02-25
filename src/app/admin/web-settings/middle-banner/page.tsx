import { redirect } from "next/navigation";

import { getAdminActor } from "../../../../../lib/auth/admin";
import { getWebMiddleBannerSettings } from "../../../../../lib/db/web-settings";
import { getAdminLocale } from "../../../../../lib/i18n/admin";
import { getDefaultWebMiddleBannerSettings } from "../../../../../lib/types/web-settings";
import MiddleBannerSettingsClient from "../../../../components/admin/web-settings/MiddleBannerSettingsClient";

export default async function AdminWebMiddleBannerSettingsPage() {
  const locale = await getAdminLocale();
  const actor = await getAdminActor();
  if (!actor || actor.role !== "admin") {
    redirect("/admin?error=admin_only");
  }

  let initialSettings = getDefaultWebMiddleBannerSettings();
  let bootstrapError: string | null = null;

  try {
    initialSettings = await getWebMiddleBannerSettings();
  } catch (error) {
    bootstrapError = error instanceof Error ? error.message : "Failed to load middle banner settings";
  }

  return (
    <MiddleBannerSettingsClient
      locale={locale}
      initialSettings={initialSettings}
      bootstrapError={bootstrapError}
    />
  );
}
