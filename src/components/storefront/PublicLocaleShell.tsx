"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";

type AppLocale = "th" | "en";

type PublicLocaleShellProps = {
  locale: AppLocale;
  children: ReactNode;
};

type NavItem = {
  key: string;
  label: string;
  ariaLabel: string;
  href: string;
};

function withLocale(locale: AppLocale, path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `/${locale}${normalized === "/" ? "" : normalized}`;
}

function switchLocalePath(pathname: string, nextLocale: AppLocale) {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] === "th" || segments[0] === "en") {
    segments[0] = nextLocale;
    return `/${segments.join("/")}`;
  }
  return withLocale(nextLocale, pathname || "/");
}

function navItems(locale: AppLocale): NavItem[] {
  const t = locale === "th"
    ? {
        home: "\u0e2b\u0e19\u0e49\u0e32\u0e41\u0e23\u0e01",
        products: "\u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32",
        cart: "\u0e15\u0e30\u0e01\u0e23\u0e49\u0e32",
        promotions: "\u0e42\u0e1b\u0e23\u0e42\u0e21\u0e0a\u0e31\u0e19",
        account: "\u0e1a\u0e31\u0e0d\u0e0a\u0e35",
      }
    : {
        home: "Home",
        products: "Products",
        cart: "Cart",
        promotions: "Promotions",
        account: "Account",
      };

  return [
    { key: "home", label: t.home, ariaLabel: `${t.home} tab`, href: withLocale(locale, "/") },
    { key: "products", label: t.products, ariaLabel: `${t.products} tab`, href: withLocale(locale, "/products") },
    { key: "cart", label: t.cart, ariaLabel: `${t.cart} tab`, href: withLocale(locale, "/cart") },
    { key: "promotions", label: t.promotions, ariaLabel: `${t.promotions} tab`, href: withLocale(locale, "/promotions") },
    { key: "account", label: t.account, ariaLabel: `${t.account} tab`, href: withLocale(locale, "/account") },
  ];
}

function isActive(pathname: string, href: string) {
  if (pathname === href) {
    return true;
  }
  return pathname.startsWith(`${href}/`);
}

export function PublicLocaleShell({ locale, children }: PublicLocaleShellProps) {
  const pathname = usePathname() || withLocale(locale, "/");
  const items = useMemo(() => navItems(locale), [locale]);

  const [mobileNavVisible, setMobileNavVisible] = useState(true);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    function onScroll() {
      const y = window.scrollY;
      const delta = y - lastScrollYRef.current;

      if (y <= 24) {
        setMobileNavVisible(true);
      } else if (delta > 10) {
        setMobileNavVisible(false);
      } else if (delta < -10) {
        setMobileNavVisible(true);
      }

      lastScrollYRef.current = y;
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const enPath = switchLocalePath(pathname, "en");
  const thPath = switchLocalePath(pathname, "th");

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_#5c3f00_0%,_#1a1200_30%,_#090909_68%)] text-amber-50">
      <header className="sticky top-0 z-30 border-b border-amber-500/20 bg-black/70 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3">
          <Link href={withLocale(locale, "/")} className="text-base font-semibold tracking-wide text-amber-300" aria-label="Kittisap Home">
            Kittisap
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href={thPath}
              aria-label="Switch language Thai"
              className={`rounded-md px-2.5 py-1 text-xs font-semibold ${locale === "th" ? "bg-amber-400/25 text-amber-100" : "text-amber-200/80"}`}
            >
              TH
            </Link>
            <Link
              href={enPath}
              aria-label="Switch language English"
              className={`rounded-md px-2.5 py-1 text-xs font-semibold ${locale === "en" ? "bg-amber-400/25 text-amber-100" : "text-amber-200/80"}`}
            >
              EN
            </Link>
            <Link
              href={withLocale(locale, "/cart")}
              aria-label="Open cart"
              className="rounded-full border border-amber-500/30 bg-black/45 px-3 py-1.5 text-xs font-semibold text-amber-100 hover:bg-black/60"
            >
              Cart
            </Link>
          </div>
        </div>
      </header>

      <main className="pb-20">
        <div className="mx-auto w-full max-w-7xl px-4">{children}</div>
      </main>

      <footer className="hidden border-t border-amber-500/20 bg-black/60 py-8 md:block">
        <div className="mx-auto w-full max-w-7xl px-4 text-sm text-amber-100/70">
          Kittisap © {new Date().getFullYear()}
        </div>
      </footer>

      <nav
        aria-label="Mobile Bottom Navigation"
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-amber-500/25 bg-black/85 p-2 backdrop-blur transition-transform duration-300 md:hidden ${
          mobileNavVisible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mx-auto grid w-full max-w-7xl grid-cols-5 gap-1">
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.key}
                href={item.href}
                aria-label={item.ariaLabel}
                aria-current={active ? "page" : undefined}
                className={`rounded-lg px-1 py-2 text-center text-[11px] font-semibold transition-all duration-200 ${
                  active
                    ? "scale-[1.03] bg-amber-400/25 text-amber-100 shadow-[0_8px_18px_rgba(245,158,11,0.25)]"
                    : "text-amber-100/65"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
