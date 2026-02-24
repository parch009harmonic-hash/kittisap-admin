"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type AppLocale = "th" | "en";

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
    auth: string;
  };
  cta: {
    auth: string;
    products: string;
  };
};

function withLocale(locale: AppLocale, path: string, useLocalePrefix: boolean) {
  if (!useLocalePrefix && locale === "th") {
    return path;
  }
  return `/${locale}${path}`;
}

export function MarketingTopNav({ locale, useLocalePrefix, brand, nav, cta }: MarketingTopNavProps) {
  const pathname = usePathname() || withLocale(locale, "/", useLocalePrefix);
  const [mobileOpen, setMobileOpen] = useState(false);

  const homePath = withLocale(locale, "/", useLocalePrefix);
  const productsPath = withLocale(locale, "/products", useLocalePrefix);
  const pricingPath = withLocale(locale, "/pricing", useLocalePrefix);
  const promotionsPath = withLocale(locale, "/promotions", useLocalePrefix);
  const contactPath = withLocale(locale, "/contact", useLocalePrefix);
  const authPath = withLocale(locale, "/auth/login", useLocalePrefix);

  const topMenu = [
    { href: homePath, label: nav.home },
    { href: productsPath, label: nav.products },
    { href: pricingPath, label: nav.pricing },
    { href: promotionsPath, label: nav.promotions },
    { href: contactPath, label: nav.contact },
    { href: authPath, label: nav.auth },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3">
        <Link href={homePath} className="flex items-center gap-3 text-sm font-extrabold tracking-wide text-slate-900" aria-label="Go to home">
          <span className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-300 to-amber-700 shadow-[0_12px_28px_rgba(245,158,11,0.22)]" />
          <span>{brand}</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Desktop top navigation">
          {topMenu.map((item) => {
            const active =
              item.href === homePath
                ? pathname === homePath
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
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
          <Link
            href={authPath}
            className="app-press hidden rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 md:inline-flex"
          >
            {cta.auth}
          </Link>
          <Link
            href={productsPath}
            className="app-press inline-flex rounded-full border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-extrabold text-amber-700"
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
            const active =
              item.href === homePath
                ? pathname === homePath
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
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
        </nav>
      </div>
    </header>
  );
}
