import { redirect } from "next/navigation";

import { getAdminActor } from "../../../../../lib/auth/admin";
import { getWebHomepageImageStripSettings } from "../../../../../lib/db/web-settings";
import { getAdminLocale } from "../../../../../lib/i18n/admin";
import { getDefaultWebHomepageImageStripSettings } from "../../../../../lib/types/web-settings";
import HomepageImageBoxesClient from "../../../../components/admin/web-settings/HomepageImageBoxesClient";

export default async function AdminWebHomepageImagesPage() {
  const locale = await getAdminLocale();
  const actor = await getAdminActor();
  if (!actor || actor.role !== "admin") {
    redirect("/admin?error=admin_only");
  }

  let initialSettings = getDefaultWebHomepageImageStripSettings();
  let bootstrapError: string | null = null;

  try {
    initialSettings = await getWebHomepageImageStripSettings();
  } catch (error) {
    bootstrapError = error instanceof Error ? error.message : "Failed to load web homepage image settings";
  }

  return (
    <HomepageImageBoxesClient
      locale={locale}
      initialSettings={initialSettings}
      bootstrapError={bootstrapError}
    />
  );
}
