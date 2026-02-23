"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MouseEvent, ReactNode, useEffect, useState } from "react";

import { AdminLocale } from "../../../lib/i18n/admin";
import { ThemePreset, UiMode } from "../../../lib/types/admin-settings";
import { getSupabaseBrowserClient } from "../../../lib/supabase/client";

type AdminShellProps = {
  children: ReactNode;
  initialLocale: AdminLocale;
  initialUiMode: UiMode;
  initialThemePreset: ThemePreset;
  actorRole: "admin" | "staff" | "developer";
  showDeveloperMenu?: boolean;
};

type OsTheme = "windows" | "mobile-os";
type MobilePlatform = "ios" | "android" | "other";
type NavIcon = "dashboard" | "products" | "orders" | "coupons" | "settings" | "developer";

type NavLinkItem = {
  href: string;
  label: Record<AdminLocale, string>;
  short: Record<AdminLocale, string>;
  mobileLabel: Record<AdminLocale, string>;
  icon: NavIcon;
};

const NAV_LINKS: NavLinkItem[] = [
  {
    href: "/admin",
    label: { th: "\u0e41\u0e14\u0e0a\u0e1a\u0e2d\u0e23\u0e4c\u0e14", en: "Dashboard" },
    short: { th: "\u0e14", en: "D" },
    mobileLabel: { th: "\u0e41\u0e14\u0e0a", en: "Home" },
    icon: "dashboard",
  },
  {
    href: "/admin/products",
    label: { th: "\u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32", en: "Products" },
    short: { th: "\u0e2a", en: "P" },
    mobileLabel: { th: "\u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32", en: "Product" },
    icon: "products",
  },
  {
    href: "/admin/orders",
    label: { th: "\u0e04\u0e33\u0e2a\u0e31\u0e48\u0e07\u0e0b\u0e37\u0e49\u0e2d", en: "Orders" },
    short: { th: "\u0e04", en: "O" },
    mobileLabel: { th: "\u0e2d\u0e2d\u0e40\u0e14\u0e2d\u0e23\u0e4c", en: "Order" },
    icon: "orders",
  },
  {
    href: "/admin/coupons",
    label: { th: "\u0e04\u0e39\u0e1b\u0e2d\u0e07\u0e41\u0e25\u0e30\u0e41\u0e15\u0e49\u0e21", en: "Coupons & Points" },
    short: { th: "\u0e04", en: "C" },
    mobileLabel: { th: "\u0e04\u0e39\u0e1b\u0e2d\u0e07", en: "Coupons" },
    icon: "coupons",
  },
  {
    href: "/admin/settings",
    label: { th: "\u0e15\u0e31\u0e49\u0e07\u0e04\u0e48\u0e32", en: "Settings" },
    short: { th: "\u0e15", en: "S" },
    mobileLabel: { th: "\u0e15\u0e31\u0e49\u0e07\u0e04\u0e48\u0e32", en: "Setting" },
    icon: "settings",
  },
];

const DEVELOPER_NAV_LINK: NavLinkItem = {
  href: "/admin/developer",
  label: { th: "\u0e42\u0e2b\u0e21\u0e14\u0e19\u0e31\u0e01\u0e1e\u0e31\u0e12\u0e19\u0e32", en: "Developer" },
  short: { th: "\u0e19", en: "DV" },
  mobileLabel: { th: "\u0e19\u0e31\u0e01\u0e1e\u0e31\u0e12\u0e19\u0e32", en: "Dev" },
  icon: "developer",
};

const BRAND_LOGO_URL =
  "https://zbedxvzrbotwngxaktgj.supabase.co/storage/v1/object/sign/Kittisap%20Admin/products/image.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8wYTM3NDc3Mi1jM2RhLTQ5Y2ItOGMzNy1kODkyYzRlOWIxZWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJLaXR0aXNhcCBBZG1pbi9wcm9kdWN0cy9pbWFnZS5wbmciLCJpYXQiOjE3NzE1MTQwNTMsImV4cCI6MTgwMzA1MDA1M30.xtxuD8s_JZAKPvfwAORsuVMZZ3KOZSIe83_ujc5nDFk";

const TEXT = {
  appSubtitle: { th: "\u0e23\u0e30\u0e1a\u0e1a\u0e1c\u0e39\u0e49\u0e14\u0e39\u0e41\u0e25", en: "Admin system" },
  menu: { th: "\u0e40\u0e21\u0e19\u0e39", en: "Menu" },
  logout: { th: "\u0e2d\u0e2d\u0e01\u0e08\u0e32\u0e01\u0e23\u0e30\u0e1a\u0e1a", en: "Logout" },
  loggingOut: { th: "\u0e01\u0e33\u0e25\u0e31\u0e07\u0e2d\u0e2d\u0e01\u0e08\u0e32\u0e01\u0e23\u0e30\u0e1a\u0e1a...", en: "Logging out..." },
  collapse: { th: "\u0e22\u0e48\u0e2d\u0e40\u0e21\u0e19\u0e39", en: "Collapse" },
  expand: { th: "\u0e02\u0e22\u0e32\u0e22\u0e40\u0e21\u0e19\u0e39", en: "Expand" },
  closeMenu: { th: "\u0e1b\u0e34\u0e14\u0e40\u0e21\u0e19\u0e39", en: "Close menu" },
} as const;

export function AdminShell({
  children,
  initialLocale,
  initialUiMode,
  initialThemePreset,
  actorRole,
  showDeveloperMenu = false,
}: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [detectedOsTheme] = useState<OsTheme>(() => detectOsTheme());
  const [mobilePlatform] = useState<MobilePlatform>(() => detectMobilePlatform());
  const uiMode = initialUiMode;
  const locale = initialLocale;
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [themePreset, setThemePreset] = useState<ThemePreset>(initialThemePreset);
  const [isRouteChanging, setIsRouteChanging] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [uiMaintenance, setUiMaintenance] = useState<{ blocked: boolean; message: string | null; loading: boolean }>({
    blocked: false,
    message: null,
    loading: false,
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.localStorage.getItem("admin_sidebar_collapsed") === "1";
  });

  const osTheme: OsTheme =
    uiMode === "auto" ? detectedOsTheme : uiMode === "mobile" ? "mobile-os" : "windows";
  const isMobileTheme = osTheme === "mobile-os";
  const themeClass = `admin-theme-${themePreset}`;
  const mobileThemeClass =
    isMobileTheme && mobilePlatform === "ios" ? "os-mobile-ios" : isMobileTheme ? "os-mobile-android" : "";
  const navLinks = showDeveloperMenu ? [...NAV_LINKS, DEVELOPER_NAV_LINK] : NAV_LINKS;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => {
        // no-op: keep app usable even if registration fails
      });
    }

    return;
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const toolbarSelectors = [
      '[data-vercel-toolbar]',
      "#vercel-toolbar",
      "vercel-live-feedback",
      'iframe[src*="vercel.live"]',
      'iframe[src*="vercel.com"][src*="toolbar"]',
    ];
    const selector = toolbarSelectors.join(",");

    const removeToolbarNodes = () => {
      document.querySelectorAll(selector).forEach((node) => node.remove());
    };

    removeToolbarNodes();

    const observer = new MutationObserver(() => {
      removeToolbarNodes();
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setIsRouteChanging(false);
    setPendingHref(null);
  }, [pathname]);

  useEffect(() => {
    if (actorRole !== "admin" && actorRole !== "staff") {
      setUiMaintenance({ blocked: false, message: null, loading: false });
      return;
    }

    let mounted = true;
    let activeController: AbortController | null = null;

    async function checkUiMaintenance() {
      activeController?.abort();
      const controller = new AbortController();
      activeController = controller;

      try {
        const params = new URLSearchParams({ path: pathname });
        const response = await fetch(`/api/admin/ui-maintenance/status?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const json = (await response.json()) as { ok: boolean; blocked?: boolean; message?: string | null };
        if (!response.ok || !json.ok) {
          throw new Error("Failed to verify maintenance state");
        }
        if (!mounted) return;
        setUiMaintenance({
          blocked: Boolean(json.blocked),
          message: json.message ?? null,
          loading: false,
        });
      } catch (error) {
        if (!mounted) return;
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        // Keep last known lock state when the status check fails.
        setUiMaintenance((prev) => ({
          blocked: prev.blocked,
          message: prev.blocked
            ? prev.message ??
              (locale === "th"
                ? "หน้าระบบนี้อยู่ระหว่างปิดปรับปรุงชั่วคราว กรุณาลองใหม่ภายหลัง"
                : "This page is temporarily unavailable for maintenance. Please try again later.")
            : null,
          loading: false,
        }));
      }
    }

    void checkUiMaintenance();
    const pollTimer = window.setInterval(() => {
      void checkUiMaintenance();
    }, 5000);

    return () => {
      mounted = false;
      activeController?.abort();
      window.clearInterval(pollTimer);
    };
  }, [actorRole, locale, pathname]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const html = document.documentElement;
    const body = document.body;

    if (isMobileTheme) {
      html.classList.add("admin-mobile-lock");
      body.classList.add("admin-mobile-lock");
    } else {
      html.classList.remove("admin-mobile-lock");
      body.classList.remove("admin-mobile-lock");
    }

    return () => {
      html.classList.remove("admin-mobile-lock");
      body.classList.remove("admin-mobile-lock");
    };
  }, [isMobileTheme]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handler = (event: Event) => {
      const next = (event as CustomEvent<{ preset?: ThemePreset }>).detail?.preset;
      if (next === "default" || next === "ocean" || next === "mint" || next === "sunset") {
        setThemePreset(next);
      }
    };

    window.addEventListener("admin-theme-change", handler as EventListener);
    return () => window.removeEventListener("admin-theme-change", handler as EventListener);
  }, []);

  function toggleSidebar() {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem("admin_sidebar_collapsed", next ? "1" : "0");
      return next;
    });
  }

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();
      router.replace("/login");
      router.refresh();
    } finally {
      setIsLoggingOut(false);
    }
  }

  function handleNavIntent(event: MouseEvent<HTMLAnchorElement>, href: string) {
    if (uiMaintenance.blocked || uiMaintenance.loading) {
      event.preventDefault();
      return;
    }

    if (
      event.defaultPrevented ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    ) {
      return;
    }

    if (isNavActive(pathname, href)) {
      return;
    }

    setPendingHref(href);
    setIsRouteChanging(true);
  }

  return (
    <div
      className={`admin-ui app-surface min-h-screen ${themeClass} ${isMobileTheme ? "os-mobile" : "os-windows"} ${mobileThemeClass}`}
    >
      <div
        className={`mx-auto grid min-h-screen grid-cols-1 transition-[grid-template-columns] duration-300 ${
          isMobileTheme
            ? "max-w-[500px]"
            : `max-w-[1440px] ${sidebarCollapsed ? "lg:grid-cols-[104px_1fr]" : "lg:grid-cols-[300px_1fr]"}`
        }`}
      >
        {!isMobileTheme ? (
          <aside className="admin-sidebar group/sidebar relative hidden p-4 backdrop-blur lg:flex lg:flex-col">
            <BrandCard collapsed={sidebarCollapsed} locale={locale} />
            <button
              type="button"
              onClick={toggleSidebar}
              title={sidebarCollapsed ? TEXT.expand[locale] : TEXT.collapse[locale]}
              aria-label={sidebarCollapsed ? TEXT.expand[locale] : TEXT.collapse[locale]}
              className="absolute right-3 top-3 z-20 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 opacity-0 shadow-md transition-all duration-100 hover:border-slate-300 hover:text-slate-800 group-hover/sidebar:opacity-100 focus-visible:opacity-100"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-4 w-4"
                aria-hidden
              >
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>

            <nav
              className={`mt-4 space-y-1 ${
                sidebarCollapsed ? "bg-transparent p-0 shadow-none" : "admin-sidebar-nav rounded-2xl p-3"
              }`}
            >
              {!sidebarCollapsed ? (
                <p className="px-3 pb-1 text-[11px] uppercase tracking-[0.22em] text-slate-400">{TEXT.menu[locale]}</p>
              ) : null}
              {navLinks.map((link) => {
                const isActive = isNavActive(pathname, link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={(event) => handleNavIntent(event, link.href)}
                    title={sidebarCollapsed ? link.label[locale] : undefined}
                    className={`admin-sidebar-link block rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                      isActive ? "is-active text-white" : "text-slate-300 hover:text-white"
                    }`}
                  >
                    <span className={`flex items-center ${sidebarCollapsed ? "justify-center" : "gap-2.5"}`}>
                      <MenuIcon icon={link.icon} className={`h-4 w-4 ${isActive ? "text-cyan-200" : "text-slate-400"}`} />
                      {!sidebarCollapsed ? <span>{link.label[locale]}</span> : null}
                    </span>
                  </Link>
                );
              })}
            </nav>

            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className={`btn-primary mt-auto inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-white disabled:opacity-60 ${
                sidebarCollapsed ? "h-11 w-11 self-center rounded-full px-0 py-0" : "w-full"
              }`}
              title={TEXT.logout[locale]}
              aria-label={TEXT.logout[locale]}
            >
              {sidebarCollapsed ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden>
                  <path d="M15 17l5-5-5-5" />
                  <path d="M20 12H9" />
                  <path d="M12 19H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6" />
                </svg>
              ) : isLoggingOut ? (
                TEXT.loggingOut[locale]
              ) : (
                TEXT.logout[locale]
              )}
            </button>

          </aside>
        ) : null}

        <div className={`flex flex-col ${isMobileTheme ? "h-[100dvh] overflow-hidden" : "min-h-screen"}`}>
          <main
            aria-busy={isRouteChanging}
            className={`app-main app-safe-bottom flex-1 ${
              isMobileTheme
                ? "overflow-y-auto px-3 pt-0 pb-24 sm:px-4 md:px-6"
                : "px-3 py-4 sm:px-4 sm:py-5 md:px-6 md:py-6"
            }`}
          >
            {isRouteChanging ? (
              <div className="sticky top-0 z-30 mb-2 h-1 overflow-hidden rounded-full bg-slate-200/80">
                <div className="h-full w-1/3 animate-pulse rounded-full bg-blue-500" />
              </div>
            ) : null}
            {uiMaintenance.blocked ? (
              <UiMaintenanceOverlay locale={locale} message={uiMaintenance.message} />
            ) : (
              children
            )}
          </main>
        </div>
      </div>

      {isMobileTheme ? (
        <BottomTabBar
          pathname={pathname}
          locale={locale}
          platform={mobilePlatform}
          pendingHref={pendingHref}
          onNavigateIntent={handleNavIntent}
        />
      ) : null}

      {!isMobileTheme ? (
        <>
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label={TEXT.menu[locale]}
            className={`fixed left-3 top-3 z-[55] inline-flex h-10 w-10 items-center justify-center rounded-full border border-sky-200/80 bg-white text-slate-700 shadow-lg transition lg:hidden ${
              mobileOpen ? "pointer-events-none opacity-0" : "opacity-100 hover:border-blue-200 hover:text-blue-700"
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden>
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>

          <div
            className={`fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-[1px] transition-opacity duration-200 lg:hidden ${
              mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
            }`}
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />

          <aside
            className={`fixed inset-y-0 left-0 z-[60] w-[290px] max-w-[86vw] bg-[#111827] p-4 shadow-2xl transition-transform duration-300 lg:hidden ${
              mobileOpen ? "translate-x-0" : "-translate-x-full"
            }`}
            aria-hidden={!mobileOpen}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs uppercase tracking-[0.22em] text-slate-400">{TEXT.menu[locale]}</span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label={TEXT.closeMenu[locale]}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-600 text-slate-300"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden>
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>

            <div className="mt-3">
              <BrandCard collapsed={false} locale={locale} />
            </div>

            <nav className="admin-sidebar-nav mt-4 space-y-1 rounded-2xl p-3">
              {navLinks.map((link) => {
                const isActive = isNavActive(pathname, link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={(event) => {
                      handleNavIntent(event, link.href);
                      setMobileOpen(false);
                    }}
                    className={`admin-sidebar-link block rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                      isActive ? "is-active text-white" : "text-slate-300 hover:text-white"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <MenuIcon icon={link.icon} className={`h-4 w-4 ${isActive ? "text-cyan-200" : "text-slate-400"}`} />
                      <span>{link.label[locale]}</span>
                    </span>
                  </Link>
                );
              })}
            </nav>

            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                void handleLogout();
              }}
              disabled={isLoggingOut}
              className="btn-primary mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-white disabled:opacity-60"
            >
              {isLoggingOut ? TEXT.loggingOut[locale] : TEXT.logout[locale]}
            </button>

          </aside>
        </>
      ) : null}

      {uiMaintenance.blocked || uiMaintenance.loading ? (
        <UiMaintenanceLockScreen locale={locale} message={uiMaintenance.message} loading={uiMaintenance.loading} />
      ) : null}
    </div>
  );
}

function BottomTabBar({
  pathname,
  locale,
  platform,
  pendingHref,
  onNavigateIntent,
}: {
  pathname: string;
  locale: AdminLocale;
  platform: MobilePlatform;
  pendingHref: string | null;
  onNavigateIntent: (event: MouseEvent<HTMLAnchorElement>, href: string) => void;
}) {
  const primaryLinks = NAV_LINKS;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[70] mx-auto max-w-[500px]">
      <nav
        className={`mobile-tabbar app-safe-bottom grid ${primaryLinks.length === 4 ? "grid-cols-4" : "grid-cols-5"} gap-1 px-2 py-2 ${
        platform === "ios" ? "is-ios" : "is-android"
      }`}
      >
        {primaryLinks.map((link) => {
          const isActive = isNavActive(pathname, link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={(event) => onNavigateIntent(event, link.href)}
              data-tab={link.icon}
              className={`mobile-tab-item ${isActive ? "is-active" : ""} ${pendingHref === link.href ? "is-pending" : ""}`}
            >
              <span className="mobile-tab-icon-wrap">
                <MenuIcon icon={link.icon} className="h-4 w-4" />
              </span>
              <span className="mobile-tab-label">{link.mobileLabel[locale]}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function UiMaintenanceOverlay({ locale, message }: { locale: AdminLocale; message: string | null }) {
  const title = locale === "th" ? "กำลังปรับปรุงระบบชั่วคราว" : "Temporarily Under Maintenance";
  const description =
    message ??
    (locale === "th"
      ? "หน้านี้ปิดชั่วคราวเพื่อปรับปรุงระบบ โปรดลองใหม่อีกครั้งในภายหลัง"
      : "This page is temporarily closed for maintenance. Please try again later.");

  return (
    <section className="mx-auto mt-8 max-w-2xl rounded-2xl border border-amber-400/45 bg-amber-500/10 p-6 text-amber-100">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5 animate-spin" aria-hidden>
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
        </span>
        <div>
          <h2 className="text-lg font-semibold text-amber-100">{title}</h2>
          <p className="mt-1 text-sm text-amber-50">{description}</p>
        </div>
      </div>
    </section>
  );
}

function UiMaintenanceLockScreen({
  locale,
  message,
  loading,
}: {
  locale: AdminLocale;
  message: string | null;
  loading: boolean;
}) {
  const title = loading
    ? locale === "th"
      ? "กำลังตรวจสอบสถานะระบบ"
      : "Checking System Status"
    : locale === "th"
      ? "ระบบปิดปรับปรุงชั่วคราว"
      : "System Temporarily Under Maintenance";
  const description =
    message ??
    (locale === "th"
      ? "ขณะนี้ปิดการใช้งานชั่วคราว กรุณาลองใหม่อีกครั้งภายหลัง"
      : "Access is temporarily disabled. Please try again later.");

  return (
    <div className="fixed inset-0 z-[200] grid place-items-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <section className="w-full max-w-xl rounded-2xl border border-amber-400/45 bg-amber-500/10 p-6 text-amber-50 shadow-2xl">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-amber-500/20">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-5 w-5 animate-spin"
              aria-hidden
            >
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          </span>
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="mt-1 text-sm">{description}</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function detectOsTheme(): OsTheme {
  if (typeof navigator === "undefined") {
    return "windows";
  }
  const ua = navigator.userAgent.toLowerCase();
  const isMobileOs = /android|iphone|ipad|ipod/.test(ua);
  const isIpadDesktopUa = ua.includes("macintosh") && navigator.maxTouchPoints > 1;
  return isMobileOs || isIpadDesktopUa ? "mobile-os" : "windows";
}

function detectMobilePlatform(): MobilePlatform {
  if (typeof navigator === "undefined") {
    return "other";
  }
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua) || (ua.includes("macintosh") && navigator.maxTouchPoints > 1)) {
    return "ios";
  }
  if (ua.includes("android")) {
    return "android";
  }
  return "other";
}

function BrandCard({ collapsed, locale }: { collapsed: boolean; locale: AdminLocale }) {
  return (
    <div className={collapsed ? "p-0" : "admin-sidebar-head rounded-2xl p-5"}>
      {!collapsed ? (
        <div className="flex items-center gap-3">
          <div className="relative grid h-12 w-12 place-items-center overflow-hidden rounded-xl bg-slate-900/30">
            <Image
              src={BRAND_LOGO_URL}
              alt="Kittisap Admin Logo"
              fill
              className="object-contain object-center p-1"
              sizes="48px"
              unoptimized
            />
          </div>
          <div>
            <h1 className="font-heading text-xl font-semibold text-white">Kittisap Admin</h1>
            <p className="mt-0.5 text-sm text-slate-300">{TEXT.appSubtitle[locale]}</p>
          </div>
        </div>
      ) : (
        <div className="relative mx-auto grid h-12 w-12 place-items-center overflow-hidden">
          <Image
            src={BRAND_LOGO_URL}
            alt="Kittisap Admin Logo"
            fill
            className="object-contain object-center p-1"
            sizes="48px"
            unoptimized
          />
        </div>
      )}
    </div>
  );
}

function isNavActive(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === "/admin";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function MenuIcon({ icon, className }: { icon: NavIcon; className?: string }) {
  const base = className ?? "h-4 w-4";
  switch (icon) {
    case "dashboard":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={base} aria-hidden>
          <path d="M4 20h16" />
          <path d="M7 17V9" />
          <path d="M12 17V5" />
          <path d="M17 17v-7" />
        </svg>
      );
    case "products":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={base} aria-hidden>
          <path d="M12 3 4 7l8 4 8-4-8-4Z" />
          <path d="M4 7v10l8 4 8-4V7" />
          <path d="M12 11v10" />
        </svg>
      );
    case "orders":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={base} aria-hidden>
          <path d="M7 4h10l1 3H6l1-3Z" />
          <path d="M5 7h14v12H5V7Z" />
          <path d="M9 11h6M9 15h4" />
        </svg>
      );
    case "coupons":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={base} aria-hidden>
          <path d="M3 9a2 2 0 0 0 2-2h14v4a2 2 0 1 1 0 4v4H5a2 2 0 0 0-2-2V9Z" />
          <path d="M12 7v12" strokeDasharray="2 2" />
        </svg>
      );
    case "settings":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={base} aria-hidden>
          <path d="M12 9.5A2.5 2.5 0 1 1 9.5 12 2.5 2.5 0 0 1 12 9.5Z" />
          <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a2 2 0 1 1-4 0v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a2 2 0 1 1 0-4h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a2 2 0 1 1 4 0v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6H20a2 2 0 1 1 0 4h-.2a1 1 0 0 0-.9.6Z" />
        </svg>
      );
    case "developer":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={base} aria-hidden>
          <path d="M8 6 3 12l5 6" />
          <path d="m16 6 5 6-5 6" />
          <path d="m14 4-4 16" />
        </svg>
      );
    default:
      return null;
  }
}
