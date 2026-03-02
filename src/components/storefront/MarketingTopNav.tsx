"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getPublicCart, PUBLIC_CART_UPDATED_EVENT } from "../../../lib/storefront/cart";

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
    auth?: string;
  };
  cta: {
    products?: string;
    call?: string;
    phone?: string;
  };
};

type PublicStorefrontResponse = {
  ok?: boolean;
  data?: {
    brandName?: string;
    callButtonLabel?: string;
    callPhone?: string;
  };
};

const localeFlagMap: Record<AppLocale, { code: string; flagUrl: string; alt: string }> = {
  th: {
    code: "TH",
    flagUrl:
      "https://zbedxvzrbotwngxaktgj.supabase.co/storage/v1/object/sign/Kittisap%20Admin/products/pngtree-spherical-thailand-flag-png-image_3510746.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8wYTM3NDc3Mi1jM2RhLTQ5Y2ItOGMzNy1kODkyYzRlOWIxZWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJLaXR0aXNhcCBBZG1pbi9wcm9kdWN0cy9wbmd0cmVlLXNwaGVyaWNhbC10aGFpbGFuZC1mbGFnLXBuZy1pbWFnZV8zNTEwNzQ2LmpwZyIsImlhdCI6MTc3MjI4MjI1NSwiZXhwIjoxODAzODE4MjU1fQ.9kIqCXkNSkq2nLPM1kIu25a9-fw_xDFFhHen47CkKR8",
    alt: "Thai flag",
  },
  en: {
    code: "EN",
    flagUrl:
      "https://zbedxvzrbotwngxaktgj.supabase.co/storage/v1/object/sign/Kittisap%20Admin/products/depositphotos_490775414-stock-illustration-britain-british-flag-icon-flat.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8wYTM3NDc3Mi1jM2RhLTQ5Y2ItOGMzNy1kODkyYzRlOWIxZWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJLaXR0aXNhcCBBZG1pbi9wcm9kdWN0cy9kZXBvc2l0cGhvdG9zXzQ5MDc3NTQxNC1zdG9jay1pbGx1c3RyYXRpb24tYnJpdGFpbi1icml0aXNoLWZsYWctaWNvbi1mbGF0LmpwZyIsImlhdCI6MTc3MjI4MjI3OCwiZXhwIjoxODAzODE4Mjc4fQ.-umc0tslEAC_ySweCJDy-v91aEFERuA-yFM7X6cw0X0",
    alt: "UK flag",
  },
  lo: {
    code: "LO",
    flagUrl:
      "https://zbedxvzrbotwngxaktgj.supabase.co/storage/v1/object/sign/Kittisap%20Admin/products/flag-laos-with-red-blue-stripes-white-circle-vector-icon-design_877269-3713.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8wYTM3NDc3Mi1jM2RhLTQ5Y2ItOGMzNy1kODkyYzRlOWIxZWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJLaXR0aXNhcCBBZG1pbi9wcm9kdWN0cy9mbGFnLWxhb3Mtd2l0aC1yZWQtYmx1ZS1zdHJpcGVzLXdoaXRlLWNpcmNsZS12ZWN0b3ItaWNvbi1kZXNpZ25fODc3MjY5LTM3MTMuanBnIiwiaWF0IjoxNzcyMjgyMjk2LCJleHAiOjE4MDM4MTgyOTZ9.kcbablkqo9ZKJF1saZTmMDCESDjXdN0Y4DLb8A1LnDs",
    alt: "Lao flag",
  },
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
  const router = useRouter();
  const pathname = normalizePath(usePathname() || withLocale(locale, "/", useLocalePrefix));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [localeMenuOpen, setLocaleMenuOpen] = useState(false);
  const [isCustomerLoggedIn, setIsCustomerLoggedIn] = useState(false);
  const [customerInitial, setCustomerInitial] = useState("U");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [cartQty, setCartQty] = useState(0);
  const [brandOverride, setBrandOverride] = useState<string | null>(null);
  const [callLabelOverride, setCallLabelOverride] = useState<string | null>(null);
  const [callPhoneOverride, setCallPhoneOverride] = useState<string | null>(null);
  const localeMenuRef = useRef<HTMLDivElement | null>(null);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const localeMeta = localeFlagMap[locale];

  const homePath = withLocale(locale, "/", useLocalePrefix);
  const productsPath = withLocale(locale, "/products", useLocalePrefix);
  const pricingPath = withLocale(locale, "/pricing", useLocalePrefix);
  const promotionsPath = withLocale(locale, "/promotions", useLocalePrefix);
  const contactPath = withLocale(locale, "/contact", useLocalePrefix);
  const authPath = withLocale(locale, "/auth/login", useLocalePrefix);
  const accountPath = withLocale(locale, "/account", useLocalePrefix);
  const cartPath = withLocale(locale, "/cart", useLocalePrefix);
  const checkoutPath = withLocale(locale, "/checkout", useLocalePrefix);
  const authLabel = nav.auth ?? (locale === "th" ? "เข้าสู่ระบบ/สมัครสมาชิก" : locale === "lo" ? "ເຂົ້າລະບົບ/ສະໝັກສະມາຊິກ" : "Login/Register");
  const accountLabel = locale === "th" ? "บัญชีลูกค้า" : locale === "lo" ? "ບັນຊີລູກຄ້າ" : "Customer Account";
  const cartLabel = locale === "th" ? "ตะกร้า" : locale === "lo" ? "ກະຕ່າ" : "Cart";
  const checkoutLabel = locale === "th" ? "ชำระเงิน" : locale === "lo" ? "ຊຳລະເງິນ" : "Checkout";
  const quickMenuLabel = locale === "th" ? "เมนูลัดลูกค้า" : locale === "lo" ? "ເມນູລັດລູກຄ້າ" : "Customer shortcuts";
  const callPhone = callPhoneOverride ?? cta.phone ?? "+66843374982";
  const callHref = `tel:${callPhone}`;
  const callLabel =
    callLabelOverride ?? cta.call ?? (locale === "th" ? "โทรหาเรา" : locale === "lo" ? "ໂທຫາພວກເຮົາ" : "Call Us");
  const onLocaleChange = (nextLocale: AppLocale) => {
    if (nextLocale === locale) return;
    setLocaleMenuOpen(false);
    router.push(switchLocalePath(pathname, nextLocale));
  };

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!localeMenuRef.current?.contains(event.target as Node)) {
        setLocaleMenuOpen(false);
      }
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setLocaleMenuOpen(false);
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadStorefrontSettings() {
      try {
        const response = await fetch("/api/public/storefront-settings", { cache: "no-store" });
        const payload = (await response.json().catch(() => null)) as PublicStorefrontResponse | null;
        if (!active || !response.ok || !payload?.ok || !payload.data) {
          return;
        }

        const nextBrand = String(payload.data.brandName ?? "").trim();
        const nextCallLabel = String(payload.data.callButtonLabel ?? "").trim();
        const nextCallPhone = String(payload.data.callPhone ?? "").trim();
        setBrandOverride(nextBrand || null);
        setCallLabelOverride(nextCallLabel || null);
        setCallPhoneOverride(nextCallPhone || null);
      } catch {
        // no-op fallback to static copy
      }
    }

    void loadStorefrontSettings();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const updateCartQty = () => {
      const nextQty = getPublicCart().reduce((sum, item) => sum + item.qty, 0);
      setCartQty(nextQty);
    };

    updateCartQty();
    window.addEventListener("storage", updateCartQty);
    window.addEventListener(PUBLIC_CART_UPDATED_EVENT, updateCartQty as EventListener);
    return () => {
      window.removeEventListener("storage", updateCartQty);
      window.removeEventListener(PUBLIC_CART_UPDATED_EVENT, updateCartQty as EventListener);
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function checkCustomerSession() {
      try {
        const response = await fetch("/api/customer/profile", { cache: "no-store" });
        if (!active) return;
        if (!response.ok) {
          setIsCustomerLoggedIn(false);
          setCustomerInitial("U");
          return;
        }
        const payload = (await response.json()) as {
          ok?: boolean;
          data?: { full_name?: string | null };
        };
        const fullName = String(payload?.data?.full_name ?? "").trim();
        const initial = fullName ? fullName.charAt(0).toUpperCase() : "U";
        setIsCustomerLoggedIn(Boolean(payload?.ok));
        setCustomerInitial(initial);
      } catch {
        if (!active) return;
        setIsCustomerLoggedIn(false);
        setCustomerInitial("U");
      }
    }

    void checkCustomerSession();
    return () => {
      active = false;
    };
  }, []);

  const topMenu = [
    { href: homePath, label: nav.home },
    { href: productsPath, label: nav.products },
    { href: pricingPath, label: nav.pricing },
    { href: promotionsPath, label: nav.promotions },
    { href: contactPath, label: nav.contact },
  ];
  if (!isCustomerLoggedIn) {
    topMenu.push({ href: authPath, label: authLabel });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto flex min-h-[64px] w-full max-w-7xl items-center justify-between gap-3 px-4 py-3">
        <Link href={homePath} className="flex items-center gap-3 text-sm font-extrabold tracking-wide text-slate-900" aria-label="Go to home">
          <span className="relative h-9 w-9 overflow-hidden rounded-xl shadow-[0_12px_28px_rgba(15,23,42,0.22)]">
            <Image src="/icons/pwa-icon-192.png" alt="" fill sizes="36px" className="object-cover" priority />
          </span>
          <span>{brandOverride ?? brand}</span>
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
          <div ref={localeMenuRef} className="relative hidden md:block">
            <button
              type="button"
              aria-label="Select language"
              aria-haspopup="menu"
              aria-expanded={localeMenuOpen}
              onClick={() => setLocaleMenuOpen((prev) => !prev)}
              className="app-press inline-flex h-9 w-[94px] items-center rounded-full border border-amber-400 bg-slate-50 pl-2.5 pr-7 text-xs font-bold uppercase tracking-wide text-slate-700 outline-none transition hover:bg-slate-100 focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
            >
              <span className="mr-2 inline-flex items-center">
                <Image src={localeMeta.flagUrl} alt={localeMeta.alt} width={16} height={16} unoptimized className="h-4 w-4 rounded-full object-cover" />
              </span>
              <span>{localeMeta.code}</span>
            </button>
            {localeMenuOpen && (
              <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-[94px] overflow-hidden rounded-md border border-slate-300 bg-white shadow-lg">
                {(["th", "en", "lo"] as AppLocale[]).map((localeKey) => {
                  const optionMeta = localeFlagMap[localeKey];
                  const active = localeKey === locale;
                  return (
                    <button
                      key={localeKey}
                      type="button"
                      role="menuitemradio"
                      aria-checked={active}
                      onClick={() => onLocaleChange(localeKey)}
                      className={`flex w-full items-center gap-2 px-2 py-2 text-left text-sm ${
                        active ? "bg-blue-600 text-white" : "bg-white text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <Image src={optionMeta.flagUrl} alt={optionMeta.alt} width={16} height={16} unoptimized className="h-4 w-4 rounded-full object-cover" />
                      <span className="text-xs font-semibold uppercase tracking-wide">{optionMeta.code}</span>
                    </button>
                  );
                })}
              </div>
            )}
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">
              ▾
            </span>
          </div>
          {isCustomerLoggedIn ? (
            <div ref={profileMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setProfileMenuOpen((prev) => !prev)}
                className="app-press inline-flex h-9 w-9 items-center justify-center rounded-full border border-amber-400 bg-amber-50 text-xs font-extrabold text-amber-700 transition hover:border-amber-500 hover:bg-amber-100"
                aria-label={accountLabel}
                title={accountLabel}
                aria-haspopup="menu"
                aria-expanded={profileMenuOpen}
              >
                {customerInitial}
              </button>
              {cartQty > 0 ? (
                <span className="pointer-events-none absolute -right-1 -top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold leading-4 text-zinc-900">
                  {cartQty > 99 ? "99+" : cartQty}
                </span>
              ) : null}
              {profileMenuOpen ? (
                <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                  <Link
                    href={accountPath}
                    onClick={() => setProfileMenuOpen(false)}
                    className="block px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {accountLabel}
                  </Link>
                  <Link
                    href={cartPath}
                    onClick={() => setProfileMenuOpen(false)}
                    className="block px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {cartLabel}
                  </Link>
                  <Link
                    href={checkoutPath}
                    onClick={() => setProfileMenuOpen(false)}
                    className="block px-3 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50"
                  >
                    {checkoutLabel}
                  </Link>
                </div>
              ) : null}
            </div>
          ) : (
            <a
              href={callHref}
              className="app-press inline-flex rounded-full border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-extrabold text-amber-700 transition hover:border-amber-400 hover:bg-amber-100"
              aria-label={callLabel}
            >
              {callLabel}
            </a>
          )}

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
          {isCustomerLoggedIn ? (
            <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50/50 p-2">
              <p className="px-1 pb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-amber-700">{quickMenuLabel}</p>
              <div className="space-y-1">
                <Link
                  href={accountPath}
                  onClick={() => setMobileOpen(false)}
                  className="app-press block rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {accountLabel}
                </Link>
                <Link
                  href={cartPath}
                  onClick={() => setMobileOpen(false)}
                  className="app-press flex items-center justify-between rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <span>{cartLabel}</span>
                  {cartQty > 0 ? (
                    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold leading-5 text-zinc-900">
                      {cartQty > 99 ? "99+" : cartQty}
                    </span>
                  ) : null}
                </Link>
                <Link
                  href={checkoutPath}
                  onClick={() => setMobileOpen(false)}
                  className="app-press block rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-amber-400"
                >
                  {checkoutLabel}
                </Link>
              </div>
            </div>
          ) : null}
          <div className="mt-2 border-t border-slate-200 pt-2">
            <span className="sr-only">Select language</span>
            <div id="mobile-locale-select" className="overflow-hidden rounded-lg border border-slate-200">
              {(["th", "en", "lo"] as AppLocale[]).map((localeKey) => {
                const optionMeta = localeFlagMap[localeKey];
                const active = localeKey === locale;
                return (
                  <button
                    key={`mobile-locale-${localeKey}`}
                    type="button"
                    onClick={() => {
                      onLocaleChange(localeKey);
                      setMobileOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-sm font-semibold ${
                      active ? "bg-blue-600 text-white" : "bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <Image src={optionMeta.flagUrl} alt={optionMeta.alt} width={16} height={16} unoptimized className="h-4 w-4 rounded-full object-cover" />
                    <span className="uppercase tracking-wide">{optionMeta.code}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
}
