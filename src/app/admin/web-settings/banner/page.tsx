import { redirect } from "next/navigation";

import { getAdminActor } from "../../../../../lib/auth/admin";
import { getWebBannerSettings } from "../../../../../lib/db/web-settings";
import { getAdminLocale } from "../../../../../lib/i18n/admin";
import { getDefaultWebBannerSettings } from "../../../../../lib/types/web-settings";
import BannerSettingsClient from "../../../../components/admin/web-settings/BannerSettingsClient";

export default async function AdminWebBannerSettingsPage() {
  const locale = await getAdminLocale();
  const actor = await getAdminActor();
  if (!actor || actor.role !== "admin") {
    redirect("/admin?error=admin_only");
  }

  let initialSettings = getDefaultWebBannerSettings();
  let bootstrapError: string | null = null;

  try {
    initialSettings = await getWebBannerSettings();
  } catch (error) {
    bootstrapError = error instanceof Error ? error.message : "Failed to load web banner settings";
  }

  return <BannerSettingsClient locale={locale} initialSettings={initialSettings} bootstrapError={bootstrapError} />;
}
