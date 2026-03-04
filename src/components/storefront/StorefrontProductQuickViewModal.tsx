"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { AppLocale } from "../../../lib/i18n/locale";
import { AddToCartButton } from "./AddToCartButton";
import { OrderNowButton } from "./OrderNowButton";

export type StorefrontQuickViewItem = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  price: number;
  stock: number;
  coverUrl: string | null;
  images: Array<{ id: string; url: string }>;
};

type GalleryImage = {
  key: string;
  url: string;
};

type StorefrontQuickViewText = {
  close: string;
  noImage: string;
  stock: string;
  outOfStockLabel: string;
  addToCart: string;
  goToCart: string;
  orderNow: string;
  viewDetails: string;
};

type StorefrontProductQuickViewModalProps = {
  open: boolean;
  item: StorefrontQuickViewItem | null;
  locale: AppLocale;
  useLocalePrefix: boolean;
  eyebrow: string;
  text: StorefrontQuickViewText;
  onClose: () => void;
};

type QuickViewThemeKey = "brand_gold" | "midnight_cyan" | "carbon_crimson";

type QuickViewTheme = {
  label: string;
  vibe: string;
  overlay: string;
  shell: string;
  closeTop: string;
  closeTopIcon: string;
  mediaPane: string;
  thumbRail: string;
  thumbActive: string;
  thumbIdle: string;
  arrow: string;
  arrowPrevIcon: string;
  arrowNextIcon: string;
  counter: string;
  infoPane: string;
  eyebrow: string;
  eyebrowText: string;
  title: string;
  titleText: string;
  description: string;
  priceCard: string;
  priceValue: string;
  stockValue: string;
  addToCart: string;
  goToCart: string;
  orderNowOn: string;
  orderNowOff: string;
  detailLink: string;
  closeLink: string;
  chipOn: string;
  chipOff: string;
};

const DEFAULT_QUICK_VIEW_THEME: QuickViewThemeKey = "brand_gold";
const QUICK_VIEW_THEME_STORAGE_KEY = "kittisap_quickview_theme";

const QUICK_VIEW_THEMES: Record<QuickViewThemeKey, QuickViewTheme> = {
  brand_gold: {
    label: "Luxe Gold",
    vibe: "luxe",
    overlay: "bg-slate-950/72",
    shell: "border-white/25 bg-white shadow-[0_32px_95px_rgba(2,6,23,0.55)]",
    closeTop: "h-9 w-9 rounded-full border-slate-300 bg-white/90 text-slate-600 hover:bg-white",
    closeTopIcon: "x",
    mediaPane: "bg-slate-950",
    thumbRail: "border-white/15 bg-slate-950/95",
    thumbActive: "border-amber-300 ring-2 ring-amber-200/70",
    thumbIdle: "border-white/20 hover:border-white/60",
    arrow: "h-10 w-10 rounded-full border-white/35 bg-slate-900/60 text-white hover:bg-slate-900/85",
    arrowPrevIcon: "<",
    arrowNextIcon: ">",
    counter: "border-white/25 bg-slate-950/75 text-slate-100",
    infoPane: "bg-[linear-gradient(180deg,#0b1232,#030a1f)] text-slate-100",
    eyebrow: "text-amber-300",
    eyebrowText: "font-semibold tracking-[0.22em]",
    title: "text-slate-50",
    titleText: "font-semibold tracking-[0.03em]",
    description: "font-medium text-slate-300",
    priceCard: "border-cyan-400/20 bg-cyan-300/10",
    priceValue: "font-black text-emerald-300",
    stockValue: "font-medium text-slate-300",
    addToCart: "rounded-2xl border border-amber-300/45 bg-gradient-to-r from-amber-300 via-amber-200 to-yellow-100 text-slate-900 shadow-[0_12px_28px_rgba(245,158,11,0.35)] hover:translate-y-[-1px]",
    goToCart: "rounded-2xl border-slate-400/40 bg-white/10 text-slate-100 hover:bg-white/15",
    orderNowOn: "rounded-2xl border border-slate-400/35 bg-white/10 text-slate-100 hover:bg-white/15",
    orderNowOff: "rounded-2xl border border-slate-500/40 bg-slate-700/40 text-slate-300",
    detailLink: "rounded-full border-amber-400/40 bg-amber-500/20 text-amber-100 hover:bg-amber-500/30",
    closeLink: "rounded-full border-slate-500/40 bg-white/5 text-slate-100 hover:bg-white/10",
    chipOn: "rounded-full border-amber-300 bg-amber-300/20 text-amber-100",
    chipOff: "rounded-full border-white/20 bg-white/5 text-slate-300 hover:bg-white/10",
  },
  midnight_cyan: {
    label: "Clean Cyan",
    vibe: "clean",
    overlay: "bg-[#020817]/78",
    shell: "border-cyan-300/30 bg-[#030712] shadow-[0_30px_100px_rgba(8,145,178,0.35)]",
    closeTop: "h-9 w-9 rounded-md border-cyan-200/40 bg-cyan-950/70 text-cyan-100 hover:bg-cyan-900/80",
    closeTopIcon: "+",
    mediaPane: "bg-[#010409]",
    thumbRail: "border-cyan-300/20 bg-[#050d1a]",
    thumbActive: "border-cyan-300 ring-2 ring-cyan-300/55",
    thumbIdle: "border-cyan-100/20 hover:border-cyan-200/60",
    arrow: "h-10 w-10 rounded-md border-cyan-200/50 bg-cyan-950/45 text-cyan-100 hover:bg-cyan-900/70",
    arrowPrevIcon: "|<",
    arrowNextIcon: ">|",
    counter: "border-cyan-200/30 bg-cyan-950/75 text-cyan-100",
    infoPane: "bg-[linear-gradient(180deg,#052035,#020b16)] text-cyan-50",
    eyebrow: "text-cyan-300",
    eyebrowText: "font-medium tracking-[0.16em]",
    title: "text-cyan-50",
    titleText: "font-bold tracking-tight",
    description: "font-normal text-cyan-100/70",
    priceCard: "border-cyan-300/35 bg-cyan-300/15",
    priceValue: "font-extrabold text-cyan-200",
    stockValue: "font-normal text-cyan-100/85",
    addToCart: "rounded-lg border border-cyan-200/60 bg-gradient-to-r from-cyan-300 via-cyan-200 to-sky-100 text-slate-900 shadow-[0_12px_28px_rgba(6,182,212,0.35)] hover:translate-y-[-1px]",
    goToCart: "rounded-lg border-cyan-200/35 bg-cyan-300/10 text-cyan-50 hover:bg-cyan-300/20",
    orderNowOn: "rounded-lg border border-cyan-200/35 bg-cyan-300/10 text-cyan-50 hover:bg-cyan-300/20",
    orderNowOff: "rounded-lg border border-cyan-900/60 bg-cyan-950/55 text-cyan-100/45",
    detailLink: "rounded-lg border-cyan-300/45 bg-cyan-300/15 text-cyan-100 hover:bg-cyan-300/25",
    closeLink: "rounded-lg border-cyan-100/30 bg-cyan-300/5 text-cyan-50 hover:bg-cyan-300/15",
    chipOn: "rounded-md border-cyan-300 bg-cyan-300/25 text-cyan-50",
    chipOff: "rounded-md border-cyan-100/25 bg-cyan-300/5 text-cyan-100/85 hover:bg-cyan-300/15",
  },
  carbon_crimson: {
    label: "Sport Crimson",
    vibe: "sport",
    overlay: "bg-[#15060a]/80",
    shell: "border-rose-200/25 bg-[#0e1117] shadow-[0_32px_95px_rgba(220,38,38,0.28)]",
    closeTop: "h-9 w-9 rounded-md border-rose-300/45 bg-rose-950/60 text-rose-100 hover:bg-rose-900/75",
    closeTopIcon: "//",
    mediaPane: "bg-[#0b0d12]",
    thumbRail: "border-rose-300/20 bg-[#170d11]",
    thumbActive: "border-rose-300 ring-2 ring-rose-300/60",
    thumbIdle: "border-rose-100/20 hover:border-rose-200/55",
    arrow: "h-10 w-10 rounded-md border-rose-200/45 bg-rose-950/45 text-rose-100 hover:bg-rose-900/75",
    arrowPrevIcon: "<<",
    arrowNextIcon: ">>",
    counter: "border-rose-200/30 bg-rose-950/75 text-rose-100",
    infoPane: "bg-[linear-gradient(180deg,#2a0d13,#13080c)] text-rose-50",
    eyebrow: "text-rose-300",
    eyebrowText: "font-bold tracking-[0.2em]",
    title: "text-rose-50",
    titleText: "font-black tracking-[0.05em] uppercase",
    description: "font-semibold text-rose-100/75",
    priceCard: "border-rose-300/30 bg-rose-300/10",
    priceValue: "font-black text-rose-200",
    stockValue: "font-semibold text-rose-100/85",
    addToCart: "rounded-md border border-rose-300/55 bg-gradient-to-r from-rose-300 via-red-200 to-amber-100 text-slate-900 uppercase tracking-[0.08em] shadow-[0_12px_28px_rgba(244,63,94,0.38)] hover:translate-y-[-1px]",
    goToCart: "rounded-md border-rose-200/35 bg-rose-300/10 text-rose-50 uppercase tracking-[0.06em] hover:bg-rose-300/20",
    orderNowOn: "rounded-md border border-rose-200/35 bg-rose-300/10 text-rose-50 uppercase tracking-[0.08em] hover:bg-rose-300/20",
    orderNowOff: "rounded-md border border-rose-900/70 bg-rose-950/60 text-rose-100/45 uppercase tracking-[0.08em]",
    detailLink: "rounded-md border-rose-300/45 bg-rose-300/15 text-rose-100 uppercase tracking-[0.07em] hover:bg-rose-300/25",
    closeLink: "rounded-md border-rose-100/30 bg-rose-300/5 text-rose-50 uppercase tracking-[0.07em] hover:bg-rose-300/15",
    chipOn: "rounded-md border-rose-300 bg-rose-300/25 text-rose-50",
    chipOff: "rounded-md border-rose-100/25 bg-rose-300/5 text-rose-100/85 hover:bg-rose-300/15",
  },
};

function isQuickViewTheme(value: string | null): value is QuickViewThemeKey {
  return value === "brand_gold" || value === "midnight_cyan" || value === "carbon_crimson";
}

function withLocale(locale: AppLocale, path: string, useLocalePrefix: boolean) {
  if (!useLocalePrefix && locale === "th") return path;
  return `/${locale}${path}`;
}

export function StorefrontProductQuickViewModal({
  open,
  item,
  locale,
  useLocalePrefix,
  eyebrow,
  text,
  onClose,
}: StorefrontProductQuickViewModalProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [themeKey, setThemeKey] = useState<QuickViewThemeKey>(() => {
    if (typeof window === "undefined") {
      return DEFAULT_QUICK_VIEW_THEME;
    }
    try {
      const saved = window.localStorage.getItem(QUICK_VIEW_THEME_STORAGE_KEY);
      return isQuickViewTheme(saved) ? saved : DEFAULT_QUICK_VIEW_THEME;
    } catch {
      return DEFAULT_QUICK_VIEW_THEME;
    }
  });

  const galleryImages = useMemo(() => {
    if (!item) {
      return [] as GalleryImage[];
    }

    const list: GalleryImage[] = [];
    const used = new Set<string>();

    const addImage = (key: string, url: string | null | undefined) => {
      if (!url || used.has(url)) {
        return;
      }
      list.push({ key, url });
      used.add(url);
    };

    for (const image of item.images) {
      addImage(image.id, image.url);
    }
    addImage("cover", item.coverUrl);
    return list;
  }, [item]);

  const theme = QUICK_VIEW_THEMES[themeKey];
  const safeActiveIndex =
    galleryImages.length > 0 ? Math.max(0, Math.min(activeImageIndex, galleryImages.length - 1)) : 0;
  const activeImage = galleryImages[safeActiveIndex] ?? null;

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (galleryImages.length <= 1) {
        return;
      }

      if (event.key === "ArrowLeft") {
        setActiveImageIndex((current) => (current - 1 + galleryImages.length) % galleryImages.length);
        return;
      }
      if (event.key === "ArrowRight") {
        setActiveImageIndex((current) => (current + 1) % galleryImages.length);
      }
    };

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [galleryImages.length, onClose, open]);

  const moveImage = (step: number) => {
    if (galleryImages.length <= 1) {
      return;
    }
    setActiveImageIndex((current) => (current + step + galleryImages.length) % galleryImages.length);
  };

  const handleSelectTheme = (nextTheme: QuickViewThemeKey) => {
    setThemeKey(nextTheme);
    try {
      window.localStorage.setItem(QUICK_VIEW_THEME_STORAGE_KEY, nextTheme);
    } catch {
      // Ignore localStorage failures (private mode/restricted storage).
    }
  };

  if (!open || !item) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[95] grid place-items-center p-3 md:p-5">
      <button type="button" className={`absolute inset-0 backdrop-blur-sm ${theme.overlay}`} onClick={onClose} aria-label={text.close} />

      <article className={`relative z-[96] w-full max-w-[1080px] overflow-hidden rounded-[28px] border ${theme.shell}`}>
        <button
          type="button"
          aria-label={text.close}
          onClick={onClose}
          className={`absolute right-3 top-3 z-20 inline-flex items-center justify-center border text-sm font-bold shadow-sm transition ${theme.closeTop}`}
        >
          {theme.closeTopIcon}
        </button>

        <div className="max-h-[92vh] overflow-y-auto lg:overflow-hidden">
          <div className="grid lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
            <div className={`min-w-0 ${theme.mediaPane}`}>
              <div className="relative aspect-[4/3] min-h-[280px] w-full lg:min-h-[560px]">
                {activeImage ? (
                  <Image
                    src={activeImage.url}
                    alt={item.title}
                    fill
                    sizes="(max-width: 1024px) 100vw, 58vw"
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="grid h-full place-items-center text-slate-200">{text.noImage}</div>
                )}

                {galleryImages.length > 1 ? (
                  <>
                    <button
                      type="button"
                      onClick={() => moveImage(-1)}
                      className={`absolute left-3 top-1/2 inline-flex -translate-y-1/2 items-center justify-center border text-sm font-bold transition ${theme.arrow}`}
                      aria-label="Previous image"
                    >
                      {theme.arrowPrevIcon}
                    </button>
                    <button
                      type="button"
                      onClick={() => moveImage(1)}
                      className={`absolute right-3 top-1/2 inline-flex -translate-y-1/2 items-center justify-center border text-sm font-bold transition ${theme.arrow}`}
                      aria-label="Next image"
                    >
                      {theme.arrowNextIcon}
                    </button>
                    <div className={`absolute bottom-3 right-3 rounded-full border px-3 py-1 text-xs font-semibold ${theme.counter}`}>
                      {safeActiveIndex + 1} / {galleryImages.length}
                    </div>
                  </>
                ) : null}
              </div>

            </div>

            <div className={`min-w-0 p-5 md:p-7 ${theme.infoPane}`}>
              <p className={`text-xs uppercase ${theme.eyebrow} ${theme.eyebrowText}`}>{eyebrow}</p>

              <div className="hidden mt-3 flex-wrap items-center gap-1.5">
                <span className={`border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${theme.chipOn}`}>
                  {theme.vibe}
                </span>
                {(Object.entries(QUICK_VIEW_THEMES) as Array<[QuickViewThemeKey, QuickViewTheme]>).map(([key, themeDef]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleSelectTheme(key)}
                    className={`border px-3 py-1 text-[11px] font-semibold transition ${
                      key === themeKey ? theme.chipOn : theme.chipOff
                    }`}
                  >
                    {themeDef.label}
                  </button>
                ))}
              </div>

              <h3 className={`mt-3 break-words text-3xl md:text-[2.05rem] ${theme.title} ${theme.titleText}`}>{item.title}</h3>
              <p className={`mt-3 line-clamp-4 text-sm leading-6 ${theme.description}`}>{item.description?.trim() || "-"}</p>

              <div className={`mt-5 rounded-2xl border p-4 ${theme.priceCard}`}>
                <p className={`text-[34px] font-black leading-none ${theme.priceValue}`}>THB {item.price.toLocaleString()}</p>
                <p className={`mt-2 text-sm ${theme.stockValue}`}>
                  {text.stock}: {item.stock}
                </p>
              </div>

              <div className="mt-5 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <AddToCartButton
                    locale={locale}
                    productId={item.id}
                    productSlug={item.slug}
                    productTitle={item.title}
                    productPrice={item.price}
                    productStock={item.stock}
                    productCoverUrl={activeImage?.url ?? item.coverUrl}
                    disabled={item.stock <= 0}
                    showNotice={false}
                    label={text.addToCart}
                    className={theme.addToCart}
                  />
                  <Link
                    href={withLocale(locale, "/cart", useLocalePrefix)}
                    className={`app-press inline-flex w-full items-center justify-center border px-4 py-2.5 text-sm font-semibold transition ${theme.goToCart}`}
                  >
                    {text.goToCart}
                  </Link>
                </div>

                <OrderNowButton
                  locale={locale}
                  productId={item.id}
                  disabled={item.stock <= 0}
                  label={item.stock > 0 ? text.orderNow : text.outOfStockLabel}
                  className={`inline-flex w-full items-center justify-center px-5 py-3 text-sm font-extrabold tracking-[0.06em] transition ${
                    item.stock > 0
                      ? theme.orderNowOn
                      : `cursor-not-allowed ${theme.orderNowOff}`
                  }`}
                />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Link
                  href={withLocale(locale, `/products/${item.slug}`, useLocalePrefix)}
                  className={`inline-flex border px-4 py-2 text-xs font-bold transition ${theme.detailLink}`}
                >
                  {text.viewDetails}
                </Link>
                <button
                  type="button"
                  onClick={onClose}
                  className={`inline-flex border px-4 py-2 text-xs font-bold transition ${theme.closeLink}`}
                >
                  {text.close}
                </button>
              </div>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
