export type UiRole = "admin" | "staff";
export type UiPlatform = "windows" | "android" | "ios";

export type UiMaintenanceRule = {
  path: string;
  enabled: boolean;
  roles: UiRole[];
  platforms: UiPlatform[];
  message: string;
  updatedAt: string | null;
  updatedBy: string | null;
};

export const UI_MAINTENANCE_PATHS = [
  "/admin",
  "/admin/products",
  "/admin/orders",
  "/admin/coupons",
  "/admin/settings",
  "/admin/web-settings",
] as const;

export function normalizeUiPath(pathname: string): string | null {
  if (!pathname.startsWith("/admin")) {
    return null;
  }
  const matched = [...UI_MAINTENANCE_PATHS]
    .sort((a, b) => b.length - a.length)
    .find((path) => pathname === path || pathname.startsWith(`${path}/`));
  return matched ?? null;
}

export function getDefaultUiMaintenanceRule(path: string): UiMaintenanceRule {
  return {
    path,
    enabled: false,
    roles: ["admin", "staff"],
    platforms: ["windows", "android", "ios"],
    message: "This page is temporarily under maintenance.",
    updatedAt: null,
    updatedBy: null,
  };
}

export function detectUiPlatformFromUserAgent(userAgent: string): UiPlatform {
  const ua = userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua) || (ua.includes("macintosh") && ua.includes("mobile"))) {
    return "ios";
  }
  if (ua.includes("android")) {
    return "android";
  }
  return "windows";
}
