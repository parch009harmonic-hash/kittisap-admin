import type { AppLocale } from "../i18n/locale";

const LOCALHOST_URL_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i;

function normalizeBaseUrl(input: string) {
  return input.trim().replace(/\/+$/, "");
}

function isHttpUrl(input: string) {
  return /^https?:\/\//i.test(input);
}

export function resolveAuthRedirectBaseUrl() {
  const envRaw = normalizeBaseUrl(String(process.env.NEXT_PUBLIC_SITE_URL ?? ""));
  const envUrl = isHttpUrl(envRaw) ? envRaw : "";
  const runtimeUrl =
    typeof window !== "undefined" ? normalizeBaseUrl(window.location.origin) : "";

  if (envUrl && !LOCALHOST_URL_PATTERN.test(envUrl)) {
    return envUrl;
  }

  if (runtimeUrl && LOCALHOST_URL_PATTERN.test(runtimeUrl) && envUrl && !LOCALHOST_URL_PATTERN.test(envUrl)) {
    return envUrl;
  }

  return runtimeUrl || envUrl || "";
}

export function buildCustomerAuthCallbackUrl(locale: AppLocale, options?: { recoverAccount?: boolean }) {
  const baseUrl = resolveAuthRedirectBaseUrl();
  if (!baseUrl) {
    return null;
  }
  const url = new URL("/auth/callback", `${baseUrl}/`);
  url.searchParams.set("intent", "customer");
  url.searchParams.set("locale", locale);
  if (options?.recoverAccount) {
    url.searchParams.set("recover_account", "1");
  }
  return url.toString();
}

export function buildAdminAuthCallbackUrl() {
  const baseUrl = resolveAuthRedirectBaseUrl();
  if (!baseUrl) {
    return null;
  }
  const url = new URL("/auth/callback", `${baseUrl}/`);
  url.searchParams.set("intent", "admin");
  return url.toString();
}
