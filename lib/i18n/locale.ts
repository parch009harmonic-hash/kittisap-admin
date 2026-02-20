import { cookies } from "next/headers";

export type AppLocale = "th" | "en";

const DEFAULT_LOCALE: AppLocale = "th";
const LOCALE_COOKIE_KEY = "kittisap-admin-locale";

export async function getAppLocale(): Promise<AppLocale> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(LOCALE_COOKIE_KEY)?.value?.toLowerCase();
  if (raw === "th" || raw === "en") {
    return raw;
  }
  return DEFAULT_LOCALE;
}
