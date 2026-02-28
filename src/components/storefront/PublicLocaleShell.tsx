"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname, useSearchParams } from "next/navigation";
import { ReactNode, useEffect } from "react";
import { StorefrontTopMenu } from "./StorefrontTopMenu";

const MobileBottomNav = dynamic(
  () => import("../public/MobileBottomNav").then((mod) => mod.MobileBottomNav),
  { ssr: false },
);

type AppLocale = "th" | "en" | "lo";

type PublicLocaleShellProps = {
  locale: AppLocale;
  children: ReactNode;
};

function withLocale(locale: AppLocale, path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `/${locale}${normalized === "/" ? "" : normalized}`;
}

export function PublicLocaleShell({ locale, children }: PublicLocaleShellProps) {
  const pathname = usePathname() || withLocale(locale, "/");
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!pathname.includes("/products")) return;
    const query = searchParams?.toString();
    const fullPath = query ? `${pathname}?${query}` : pathname;
    window.localStorage.setItem("kittisap_last_products_path", fullPath);
  }, [pathname, searchParams]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_#5c3f00_0%,_#1a1200_30%,_#090909_68%)] text-amber-50">
      <StorefrontTopMenu locale={locale} useLocalePrefix />

      <main className="pb-24 md:pb-0">
        <div key={pathname} className="page-enter mx-auto w-full max-w-7xl px-4">{children}</div>
      </main>

      <footer className="hidden border-t border-amber-500/20 bg-black/60 py-8 md:block">
        <div className="mx-auto flex w-full max-w-7xl items-center px-4 text-sm text-amber-100/70">
          <span>Kittisap © {new Date().getFullYear()}</span>
        </div>
      </footer>

      <MobileBottomNav locale={locale} />
    </div>
  );
}
