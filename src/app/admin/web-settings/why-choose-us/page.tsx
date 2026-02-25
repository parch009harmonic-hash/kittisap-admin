import { redirect } from "next/navigation";

import { getAdminActor } from "../../../../../lib/auth/admin";
import { getWebWhyChooseUsSettings } from "../../../../../lib/db/web-settings";
import { getAdminLocale } from "../../../../../lib/i18n/admin";
import { getDefaultWebWhyChooseUsSettings } from "../../../../../lib/types/web-settings";
import WhyChooseUsSettingsClient from "../../../../components/admin/web-settings/WhyChooseUsSettingsClient";

export default async function AdminWebWhyChooseUsSettingsPage() {
  const locale = await getAdminLocale();
  const actor = await getAdminActor();
  if (!actor || actor.role !== "admin") {
    redirect("/admin?error=admin_only");
  }

  let initialSettings = getDefaultWebWhyChooseUsSettings();
  let bootstrapError: string | null = null;

  try {
    initialSettings = await getWebWhyChooseUsSettings();
  } catch (error) {
    bootstrapError = error instanceof Error ? error.message : "Failed to load why choose us settings";
  }

  return (
    <WhyChooseUsSettingsClient
      locale={locale}
      initialSettings={initialSettings}
      bootstrapError={bootstrapError}
    />
  );
}
