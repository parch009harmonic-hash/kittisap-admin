"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useState } from "react";

import { AdminLocale } from "../../../lib/i18n/admin";
import { getSupabaseBrowserClient } from "../../../lib/supabase/client";

type DeveloperShellProps = {
  children: ReactNode;
  locale: AdminLocale;
};

const NAV_ITEMS = [
  { href: "/admin/developer", key: "dashboard" },
  { href: "/admin/developer/ui-check", key: "uiCheck" },
  { href: "/admin/developer/logs", key: "logs" },
  { href: "/admin/developer/github", key: "github" },
  { href: "/admin/developer/supabase", key: "supabase" },
  { href: "/admin/developer/vercel", key: "vercel" },
  { href: "/admin/developer/vercel/observability", key: "observability" },
  { href: "/admin/settings", key: "settings" },
] as const;

export default function DeveloperShell({ children, locale }: DeveloperShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const text = {
    title: locale === "th" ? "Developer Console" : "Developer Console",
    subtitle: locale === "th" ? "โหมดนักพัฒนา" : "Developer mode",
    dashboard: locale === "th" ? "แดชบอร์ดนักพัฒนา" : "Developer Dashboard",
    uiCheck: locale === "th" ? "ตรวจสอบ UI" : "UI Monitor",
    logs: locale === "th" ? "บันทึกระบบ" : "System Logs",
    github: locale === "th" ? "GitHub" : "GitHub",
    supabase: locale === "th" ? "Supabase" : "Supabase",
    vercel: locale === "th" ? "Vercel" : "Vercel",
    observability: locale === "th" ? "Observability" : "Observability",
    settings: locale === "th" ? "ตั้งค่าระบบ" : "System Settings",
    logout: locale === "th" ? "ออกจากระบบ" : "Logout",
    loggingOut: locale === "th" ? "กำลังออก..." : "Logging out...",
  };

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

  return (
    <div className="admin-ui h-[100dvh] overflow-hidden bg-[radial-gradient(circle_at_16%_10%,#0e7490_0,#0f172a_36%,#020617_76%,#000_100%)] text-slate-100">
      <div className="mx-auto grid h-full max-w-[1600px] grid-cols-1 lg:grid-cols-[300px_1fr]">
        <aside className="border-r border-slate-800/90 bg-slate-950/70 p-5 backdrop-blur-sm">
          <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">{text.subtitle}</p>
            <h1 className="mt-1 text-xl font-semibold text-white">{text.title}</h1>
          </div>

          <nav className="mt-4 space-y-2">
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.key === "dashboard"
                  ? pathname === item.href
                  : item.key === "vercel"
                    ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
              const label =
                item.key === "dashboard"
                  ? text.dashboard
                  : item.key === "uiCheck"
                    ? text.uiCheck
                  : item.key === "logs"
                    ? text.logs
                    : item.key === "github"
                      ? text.github
                    : item.key === "supabase"
                      ? text.supabase
                      : item.key === "vercel"
                        ? text.vercel
                        : item.key === "observability"
                          ? text.observability
                        : text.settings;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-xl border px-3 py-2 text-sm transition ${
                    isActive
                      ? "border-cyan-300/70 bg-cyan-400/20 text-cyan-100"
                      : "border-slate-800 bg-slate-900/70 text-slate-200 hover:border-cyan-400/50"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={isLoggingOut}
            className="mt-6 w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isLoggingOut ? text.loggingOut : text.logout}
          </button>
        </aside>

        <main className="no-scrollbar overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
