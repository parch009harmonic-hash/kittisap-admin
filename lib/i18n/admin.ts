import { cookies } from "next/headers";

export type AdminLocale = "th" | "en";

export const ADMIN_LOCALE_COOKIE = "admin_locale";

export function normalizeAdminLocale(value: string | undefined | null): AdminLocale {
  return value === "en" ? "en" : "th";
}

export async function getAdminLocale(): Promise<AdminLocale> {
  const store = await cookies();
  return normalizeAdminLocale(store.get(ADMIN_LOCALE_COOKIE)?.value);
}
