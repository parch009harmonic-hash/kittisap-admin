"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, ReactNode, useEffect, useState } from "react";

import { getPublicCart } from "../../../lib/storefront/cart";

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

function switchLocalePath(pathname: string, nextLocale: AppLocale) {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] === "th" || segments[0] === "en" || segments[0] === "lo") {
    if (nextLocale === "th") {
      const rest = segments.slice(1).join("/");
      return rest ? `/${rest}` : "/";
    }
    segments[0] = nextLocale;
    return `/${segments.join("/")}`;
  }
  if (nextLocale === "th") {
    return pathname || "/";
  }
  return withLocale(nextLocale, pathname || "/");
}

export function PublicLocaleShell({ locale, children }: PublicLocaleShellProps) {
  const router = useRouter();
  const pathname = usePathname() || withLocale(locale, "/");
  const [search, setSearch] = useState("");
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const updateCount = () => {
      const count = getPublicCart().reduce((sum, item) => sum + item.qty, 0);
      setCartCount(count);
    };

    updateCount();
    window.addEventListener("storage", updateCount);
    return () => window.removeEventListener("storage", updateCount);
  }, []);

  function onSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = search.trim();
    const base = withLocale(locale, "/products");
    if (!query) {
      router.push(base);
      return;
    }
    router.push(`${base}?q=${encodeURIComponent(query)}`);
  }

  const enPath = switchLocalePath(pathname, "en");
  const thPath = switchLocalePath(pathname, "th");
  const loPath = switchLocalePath(pathname, "lo");
  const cartPath = withLocale(locale, "/cart");
  const homePath = withLocale(locale, "/");
  const productsPath = withLocale(locale, "/products");
  const pricingPath = withLocale(locale, "/pricing");
  const promotionsPath = withLocale(locale, "/promotions");
  const contactPath = withLocale(locale, "/contact");
  const authPath = withLocale(locale, "/auth/login");
  const topMenu = locale === "th"
    ? [
        { href: homePath, label: "หน้าแรก" },
        { href: productsPath, label: "สินค้าของเรา" },
        { href: pricingPath, label: "หน้าตารางราคา" },
        { href: promotionsPath, label: "กิจกรรม + ส่วนลด/คูปอง" },
        { href: contactPath, label: "ติดต่อเรา" },
        { href: authPath, label: "สมัครสมาชิก/ล็อกอินลูกค้า" },
      ]
    : [
        { href: homePath, label: "Home" },
        { href: productsPath, label: "Products" },
        { href: pricingPath, label: "Pricing" },
        { href: promotionsPath, label: "Promotions + Coupons" },
        { href: contactPath, label: "Contact" },
        { href: authPath, label: "Register/Login" },
      ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_#5c3f00_0%,_#1a1200_30%,_#090909_68%)] text-amber-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-2 px-3 py-2 md:gap-3 md:px-4 md:py-3">
          <Link href={withLocale(locale, "/")} className="shrink-0 text-sm font-extrabold tracking-wide text-slate-900 md:text-base" aria-label="Kittisap Home">
            KITTI<span className="text-amber-600">SAP</span>
          </Link>

          <form onSubmit={onSearchSubmit} className="min-w-0 flex-1">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={locale === "th" ? "ค้นหาสินค้า..." : "Search products..."}
              className="h-10 w-full rounded-full border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
            />
          </form>

          <Link href={cartPath} className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-900" aria-label="Open cart">
            <span className="text-base">◍</span>
            {cartCount > 0 ? (
              <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold leading-5 text-zinc-900">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            ) : null}
          </Link>
        </div>
        <div className="mx-auto hidden w-full max-w-7xl items-center gap-1 px-3 pb-2 md:flex md:px-4">
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
        </div>
      </header>

      <main className="pb-24 md:pb-0">
        <div key={pathname} className="page-enter mx-auto w-full max-w-7xl px-4">{children}</div>
      </main>

      <footer className="hidden border-t border-amber-500/20 bg-black/60 py-8 md:block">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 text-sm text-amber-100/70">
          <span>Kittisap © {new Date().getFullYear()}</span>
          <div className="flex items-center gap-2">
            <Link href={thPath} className={`rounded-md px-2.5 py-1 text-xs font-semibold ${locale === "th" ? "bg-amber-500/20 text-amber-200" : "text-amber-100/80"}`}>TH</Link>
            <Link href={enPath} className={`rounded-md px-2.5 py-1 text-xs font-semibold ${locale === "en" ? "bg-amber-500/20 text-amber-200" : "text-amber-100/80"}`}>EN</Link>
            <Link href={loPath} className={`rounded-md px-2.5 py-1 text-xs font-semibold ${locale === "lo" ? "bg-amber-500/20 text-amber-200" : "text-amber-100/80"}`}>LO</Link>
          </div>
        </div>
      </footer>

      <MobileBottomNav locale={locale} />
    </div>
  );
}
