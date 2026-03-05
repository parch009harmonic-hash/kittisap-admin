"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import type { AppLocale } from "../../../lib/i18n/locale";
import type { WebHomepagePopupSettings } from "../../../lib/types/web-settings";

type HomepagePromoPopupProps = {
  locale: AppLocale;
  settings: WebHomepagePopupSettings;
};

export function HomepagePromoPopup({ locale, settings }: HomepagePromoPopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isActive = settings.enabled && Boolean(settings.imageUrl);

  const signature = useMemo(
    () => `${settings.updatedAt ?? ""}|${settings.imageUrl ?? ""}|${settings.targetUrl}`,
    [settings.imageUrl, settings.targetUrl, settings.updatedAt],
  );

  const closeLabel = locale === "th" ? "ปิด" : locale === "lo" ? "ປິດ" : "Close";

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const storageKey = "kittisap_home_popup_signature";
    if (!settings.showOnEveryVisit && window.sessionStorage.getItem(storageKey) === signature) {
      return;
    }

    const timer = window.setTimeout(() => {
      setIsOpen(true);
    }, Math.max(0, settings.delayMs));

    return () => window.clearTimeout(timer);
  }, [isActive, settings.delayMs, settings.showOnEveryVisit, signature]);

  useEffect(() => {
    if (!isOpen || !isActive) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isActive, isOpen]);

  if (!isActive || !isOpen || !settings.imageUrl) {
    return null;
  }

  function closePopup() {
    if (!settings.showOnEveryVisit) {
      window.sessionStorage.setItem("kittisap_home_popup_signature", signature);
    }
    setIsOpen(false);
  }

  function handleImageClick() {
    const href = settings.targetUrl.trim();
    if (!href) return;
    if (settings.openInNewTab) {
      window.open(href, "_blank", "noopener,noreferrer");
      return;
    }
    window.location.href = href;
  }

  const hasTarget = settings.targetUrl.trim().length > 0;

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center px-4 py-5 sm:px-6">
      <button
        type="button"
        onClick={closePopup}
        className="absolute inset-0"
        style={{ backgroundColor: `rgba(2, 6, 23, ${settings.backdropOpacityPercent / 100})` }}
        aria-label={closeLabel}
      />

      <div
        className="relative w-full max-w-[420px] rounded-[30px] border border-white/25 p-3 shadow-[0_40px_80px_rgba(2,6,23,0.6)]"
        style={{ backgroundColor: `rgba(255, 255, 255, ${Math.min(Math.max(settings.panelOpacityPercent, 0), 100) / 100})` }}
      >
        <button
          type="button"
          onClick={closePopup}
          className="absolute right-4 top-4 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-2xl font-semibold text-slate-700 shadow-xl transition hover:scale-105"
          aria-label={closeLabel}
        >
          ×
        </button>

        {hasTarget ? (
          <button type="button" onClick={handleImageClick} className="block w-full overflow-hidden rounded-3xl text-left">
            <div className="relative aspect-[4/5] w-full">
              <Image src={settings.imageUrl} alt={settings.altText || "Promotion popup"} fill className="object-cover" priority unoptimized />
            </div>
          </button>
        ) : (
          <div className="overflow-hidden rounded-3xl">
            <div className="relative aspect-[4/5] w-full">
              <Image src={settings.imageUrl} alt={settings.altText || "Promotion popup"} fill className="object-cover" priority unoptimized />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
