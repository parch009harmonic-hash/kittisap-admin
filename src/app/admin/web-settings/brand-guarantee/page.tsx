import { redirect } from "next/navigation";

import { getAdminActor } from "../../../../../lib/auth/admin";
import { getWebBrandGuaranteeSettings } from "../../../../../lib/db/web-settings";
import { getAdminLocale } from "../../../../../lib/i18n/admin";
import { getDefaultWebBrandGuaranteeSettings } from "../../../../../lib/types/web-settings";
import BrandGuaranteeSettingsClient from "../../../../components/admin/web-settings/BrandGuaranteeSettingsClient";

export default async function AdminWebBrandGuaranteeSettingsPage() {
  const locale = await getAdminLocale();
  const actor = await getAdminActor();
  if (!actor || actor.role !== "admin") {
    redirect("/admin?error=admin_only");
  }

  let initialSettings = getDefaultWebBrandGuaranteeSettings();
  let bootstrapError: string | null = null;

  try {
    initialSettings = await getWebBrandGuaranteeSettings();
  } catch (error) {
    bootstrapError = error instanceof Error ? error.message : "Failed to load brand guarantee settings";
  }

  return (
    <BrandGuaranteeSettingsClient
      locale={locale}
      initialSettings={initialSettings}
      bootstrapError={bootstrapError}
    />
  );
}
