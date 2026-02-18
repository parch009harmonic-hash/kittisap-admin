"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useMemo, useState } from "react";

import { getSupabaseBrowserClient } from "../../../lib/supabase/client";

type AdminShellProps = {
  children: ReactNode;
};

const NAV_LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/coupons", label: "Coupons" },
  { href: "/admin/points", label: "Points" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeSection = useMemo(() => {
    const current = NAV_LINKS.find(
      (link) => pathname === link.href || pathname.startsWith(`${link.href}/`)
    );
    return current?.label ?? "Dashboard";
  }, [pathname]);

  async function handleLogout() {
    setIsLoggingOut(true);
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
    setIsLoggingOut(false);
  }

  return (
    <div className="app-surface min-h-screen">
      <div className="mx-auto grid min-h-screen max-w-[1440px] grid-cols-1 lg:grid-cols-[280px_1fr]">
        <aside className="hidden border-r border-slate-200 bg-white/80 p-4 backdrop-blur lg:block">
          <div className="sst-card-soft rounded-2xl p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-blue-600">Kittisap Admin</p>
            <h1 className="mt-2 font-heading text-3xl font-semibold text-slate-900">Console</h1>
            <p className="mt-1 text-sm text-slate-600">ระบบผู้ดูแล / Admin system</p>
          </div>

          <nav className="mt-4 space-y-1 rounded-2xl border border-slate-200 bg-white p-3 shadow-card-soft">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`block rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? "bg-slate-900 text-white"
                      : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="flex min-h-screen flex-col">
          <header className="app-safe-top sticky top-0 z-50 border-b border-slate-200 bg-white/90 px-3 pb-3 pt-2 backdrop-blur md:px-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMobileOpen((prev) => !prev)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 lg:hidden"
                >
                  Menu
                </button>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{activeSection}</p>
                  <p className="truncate text-xs text-slate-500">Admin Panel</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
              >
                {isLoggingOut ? "Logging out..." : "Logout"}
              </button>
            </div>

            {mobileOpen && (
              <nav className="mt-3 grid grid-cols-2 gap-2 lg:hidden">
                {NAV_LINKS.map((link) => {
                  const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className={`rounded-xl px-3 py-2 text-xs font-semibold ${
                        isActive ? "bg-slate-900 text-white" : "bg-white text-slate-700 border border-slate-200"
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </nav>
            )}
          </header>

          <main className="app-safe-bottom flex-1 px-3 py-4 md:px-6 md:py-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
