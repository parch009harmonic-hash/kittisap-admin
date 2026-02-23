"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { getPublicCart } from "../../../lib/storefront/cart";

type AppLocale = "th" | "en";

type MobileBottomNavProps = {
  locale: AppLocale;
};

type TabItem = {
  key: string;
  label: string;
  icon: string;
  href: string;
  ariaLabel: string;
};

function withLocale(locale: AppLocale, path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `/${locale}${normalized === "/" ? "" : normalized}`;
}

function isActive(pathname: string, href: string) {
  if (pathname === href) return true;
  return pathname.startsWith(`${href}/`);
}

function tabs(locale: AppLocale): TabItem[] {
  const th = locale === "th";
  return [
    {
      key: "home",
      label: th ? "หน้าแรก" : "Home",
      icon: "⌂",
      href: withLocale(locale, "/"),
      ariaLabel: th ? "ไปหน้าแรก" : "Go to home",
    },
    {
      key: "products",
      label: th ? "สินค้า" : "Products",
      icon: "◫",
      href: withLocale(locale, "/products"),
      ariaLabel: th ? "ไปหน้าสินค้า" : "Go to products",
    },
    {
      key: "promotions",
      label: th ? "โปรโมชัน" : "Promotions",
      icon: "%",
      href: withLocale(locale, "/promotions"),
      ariaLabel: th ? "ไปหน้าโปรโมชัน" : "Go to promotions",
    },
    {
      key: "cart",
      label: th ? "ตะกร้า" : "Cart",
      icon: "◍",
      href: withLocale(locale, "/cart"),
      ariaLabel: th ? "ไปหน้าตะกร้า" : "Go to cart",
    },
    {
      key: "account",
      label: th ? "บัญชี" : "Account",
      icon: "◉",
      href: withLocale(locale, "/account"),
      ariaLabel: th ? "ไปหน้าบัญชี" : "Go to account",
    },
  ];
}

export function MobileBottomNav({ locale }: MobileBottomNavProps) {
  const pathname = usePathname() || withLocale(locale, "/");
  const items = useMemo(() => tabs(locale), [locale]);
  const [hidden, setHidden] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const updateCount = () => {
      const count = getPublicCart().reduce((sum, item) => sum + item.qty, 0);
      setCartCount(count);
    };

    updateCount();
    window.addEventListener("storage", updateCount);
    window.addEventListener("focus", updateCount);
    return () => {
      window.removeEventListener("storage", updateCount);
      window.removeEventListener("focus", updateCount);
    };
  }, []);

  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const current = window.scrollY;
      if (current < 24) {
        setHidden(false);
      } else if (current > lastY + 10) {
        setHidden(true);
      } else if (current < lastY - 10) {
        setHidden(false);
      }
      lastY = current;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-2 py-2 backdrop-blur transition-transform duration-300 md:hidden ${
        hidden ? "translate-y-full" : "translate-y-0"
      }`}
    >
      <div className="mx-auto grid w-full max-w-7xl grid-cols-5 gap-1">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          const isCart = item.key === "cart";
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-label={item.ariaLabel}
              aria-current={active ? "page" : undefined}
              className={`app-press relative rounded-lg px-1 py-2 text-center transition ${
                active ? "bg-amber-50 text-amber-600" : "text-slate-500"
              }`}
            >
              <span className="block text-[13px] leading-none">{item.icon}</span>
              <span className="mt-1 block text-[11px] font-semibold">{item.label}</span>
              {isCart && cartCount > 0 ? (
                <span className="absolute right-2 top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold leading-4 text-zinc-900">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
