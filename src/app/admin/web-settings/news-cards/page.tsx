import { redirect } from "next/navigation";

import { getAdminActor } from "../../../../../lib/auth/admin";
import { getWebNewsCardsSettings } from "../../../../../lib/db/web-settings";
import { getAdminLocale } from "../../../../../lib/i18n/admin";
import { getDefaultWebNewsCardsSettings } from "../../../../../lib/types/web-settings";
import NewsCardsSettingsClient from "../../../../components/admin/web-settings/NewsCardsSettingsClient";

export default async function AdminWebNewsCardsSettingsPage() {
  const locale = await getAdminLocale();
  const actor = await getAdminActor();
  if (!actor || actor.role !== "admin") {
    redirect("/admin?error=admin_only");
  }

  let initialSettings = getDefaultWebNewsCardsSettings();
  let bootstrapError: string | null = null;

  try {
    initialSettings = await getWebNewsCardsSettings();
  } catch (error) {
    bootstrapError = error instanceof Error ? error.message : "Failed to load news cards settings";
  }

  return (
    <NewsCardsSettingsClient
      locale={locale}
      initialSettings={initialSettings}
      bootstrapError={bootstrapError}
    />
  );
}
