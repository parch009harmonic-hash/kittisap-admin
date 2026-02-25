"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type AppLocale = "th" | "en" | "lo";

type MarketingTopNavProps = {
  locale: AppLocale;
  useLocalePrefix: boolean;
  brand: string;
  nav: {
    home: string;
    products: string;
    pricing: string;
    promotions: string;
    contact: string;
  };
  cta: {
    products: string;
  };
};

function withLocale(locale: AppLocale, path: string, useLocalePrefix: boolean) {
  if (!useLocalePrefix && locale === "th") {
    return path;
  }
  return `/${locale}${path}`;
}

function switchLocalePath(pathname: string, nextLocale: AppLocale) {
  const normalized = normalizePath(pathname);
  const segments = normalized.split("/").filter(Boolean);
  const current = segments[0];
  const hasPrefix = current === "th" || current === "en" || current === "lo";

  if (hasPrefix) {
    if (nextLocale === "th") {
      const rest = segments.slice(1).join("/");
      return rest ? `/${rest}` : "/";
    }
    segments[0] = nextLocale;
    return `/${segments.join("/")}`;
  }

  if (nextLocale === "th") {
    return normalized || "/";
  }
  return normalized === "/" ? `/${nextLocale}` : `/${nextLocale}${normalized}`;
}

function normalizePath(path: string) {
  if (!path) return "/";
  const noQuery = path.split("?")[0]?.split("#")[0] || "/";
  if (noQuery.length > 1 && noQuery.endsWith("/")) {
    return noQuery.slice(0, -1);
  }
  return noQuery;
}

export function MarketingTopNav({ locale, useLocalePrefix, brand, nav, cta }: MarketingTopNavProps) {
  const pathname = normalizePath(usePathname() || withLocale(locale, "/", useLocalePrefix));
  const [mobileOpen, setMobileOpen] = useState(false);

  const homePath = withLocale(locale, "/", useLocalePrefix);
  const productsPath = withLocale(locale, "/products", useLocalePrefix);
  const pricingPath = withLocale(locale, "/pricing", useLocalePrefix);
  const promotionsPath = withLocale(locale, "/promotions", useLocalePrefix);
  const contactPath = withLocale(locale, "/contact", useLocalePrefix);
  const normalizedProductsPath = normalizePath(productsPath);
  const thPath = switchLocalePath(pathname, "th");
  const enPath = switchLocalePath(pathname, "en");
  const loPath = switchLocalePath(pathname, "lo");

  const topMenu = [
    { href: homePath, label: nav.home },
    { href: productsPath, label: nav.products },
    { href: pricingPath, label: nav.pricing },
    { href: promotionsPath, label: nav.promotions },
    { href: contactPath, label: nav.contact },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto flex min-h-[64px] w-full max-w-7xl items-center justify-between gap-3 px-4 py-3">
        <Link href={homePath} className="flex items-center gap-3 text-sm font-extrabold tracking-wide text-slate-900" aria-label="Go to home">
          <span className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-300 to-amber-700 shadow-[0_12px_28px_rgba(245,158,11,0.22)]" />
          <span>{brand}</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Desktop top navigation">
          {topMenu.map((item) => {
            const normalizedHref = normalizePath(item.href);
            const active =
              normalizedHref === normalizePath(homePath)
                ? pathname === normalizePath(homePath)
                : pathname === normalizedHref || pathname.startsWith(`${normalizedHref}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`app-press rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  active ? "bg-amber-50 text-amber-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-1 md:inline-flex">
            <Link href={thPath} className={`app-press rounded-full px-2.5 py-1 text-[11px] font-bold ${locale === "th" ? "bg-white text-amber-700 shadow-sm" : "text-slate-600"}`}>TH</Link>
            <Link href={enPath} className={`app-press rounded-full px-2.5 py-1 text-[11px] font-bold ${locale === "en" ? "bg-white text-amber-700 shadow-sm" : "text-slate-600"}`}>EN</Link>
            <Link href={loPath} className={`app-press rounded-full px-2.5 py-1 text-[11px] font-bold ${locale === "lo" ? "bg-white text-amber-700 shadow-sm" : "text-slate-600"}`}>LO</Link>
          </div>
          <Link
            href={productsPath}
            className={`app-press inline-flex rounded-full border px-3 py-2 text-xs font-extrabold transition ${
              pathname === normalizedProductsPath || pathname.startsWith(`${normalizedProductsPath}/`)
                ? "border-amber-500 bg-amber-500 text-zinc-900 shadow-[0_8px_22px_rgba(245,158,11,0.35)]"
                : "border-amber-300 bg-amber-50 text-amber-700"
            }`}
          >
            {cta.products}
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            aria-controls="marketing-top-nav-mobile"
            className="app-press inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 md:hidden"
          >
            <span className="text-lg leading-none">{mobileOpen ? "×" : "☰"}</span>
          </button>
        </div>
      </div>

      <div
        id="marketing-top-nav-mobile"
        className={`overflow-hidden border-t border-slate-200 bg-white transition-all duration-200 md:hidden ${
          mobileOpen ? "max-h-[420px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <nav className="mx-auto flex w-full max-w-7xl flex-col gap-1 px-3 py-3" aria-label="Mobile top navigation">
          {topMenu.map((item) => {
            const normalizedHref = normalizePath(item.href);
            const active =
              normalizedHref === normalizePath(homePath)
                ? pathname === normalizePath(homePath)
                : pathname === normalizedHref || pathname.startsWith(`${normalizedHref}/`);
            return (
              <Link
                key={`mobile-${item.href}`}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`app-press rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  active ? "bg-amber-50 text-amber-700" : "text-slate-700 hover:bg-slate-100"
                }`}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
          <div className="mt-2 flex items-center gap-2 border-t border-slate-200 pt-2">
            <Link href={thPath} onClick={() => setMobileOpen(false)} className={`app-press rounded-md px-3 py-2 text-sm font-semibold ${locale === "th" ? "bg-amber-50 text-amber-700" : "text-slate-700 hover:bg-slate-100"}`}>TH</Link>
            <Link href={enPath} onClick={() => setMobileOpen(false)} className={`app-press rounded-md px-3 py-2 text-sm font-semibold ${locale === "en" ? "bg-amber-50 text-amber-700" : "text-slate-700 hover:bg-slate-100"}`}>EN</Link>
            <Link href={loPath} onClick={() => setMobileOpen(false)} className={`app-press rounded-md px-3 py-2 text-sm font-semibold ${locale === "lo" ? "bg-amber-50 text-amber-700" : "text-slate-700 hover:bg-slate-100"}`}>LO</Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
