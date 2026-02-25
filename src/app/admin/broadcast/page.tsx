import { redirect } from "next/navigation";

import { getAdminActor } from "../../../../lib/auth/admin";
import { listNewsletterSubscribersApi } from "../../../../lib/db/broadcast";
import { getAdminLocale } from "../../../../lib/i18n/admin";
import BroadcastClient from "../../../components/admin/broadcast/BroadcastClient";

export default async function AdminBroadcastPage() {
  const locale = await getAdminLocale();
  const actor = await getAdminActor();
  if (!actor || actor.role !== "admin") {
    redirect("/admin?error=admin_only");
  }

  let bootstrapError: string | null = null;
  let initialSubscribers: Array<{
    id: string;
    fullName: string;
    email: string;
    isActive: boolean;
    unsubscribedAt: string | null;
    createdAt: string;
  }> = [];
  try {
    initialSubscribers = await listNewsletterSubscribersApi();
  } catch (error) {
    bootstrapError = error instanceof Error ? error.message : "Failed to load subscribers";
  }

  return <BroadcastClient locale={locale} initialSubscribers={initialSubscribers} bootstrapError={bootstrapError} />;
}
