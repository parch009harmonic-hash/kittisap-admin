"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { AppLocale } from "../../../lib/i18n/locale";
import { getSupabaseBrowserClient } from "../../../lib/supabase/client";
import { FeaturedProductsShowcase } from "./FeaturedProductsShowcase";

type ShowroomItem = {
  id: string;
  slug: string;
  title: string;
  price: number;
  stock: number;
  coverUrl: string | null;
  description: string | null;
};

type FeaturedProductsLiveSectionProps = {
  initialItems: ShowroomItem[];
  locale: AppLocale;
  useLocalePrefix: boolean;
};

type ApiFeaturedItem = {
  id: string;
  slug: string;
  title_th: string;
  title_en?: string | null;
  title_lo?: string | null;
  description_th?: string | null;
  description_en?: string | null;
  description_lo?: string | null;
  price: number;
  stock: number;
  cover_url?: string | null;
};

function toShowroomItem(item: ApiFeaturedItem, locale: AppLocale): ShowroomItem {
  const title =
    locale === "en"
      ? item.title_en?.trim() || item.title_th
      : locale === "lo"
        ? item.title_lo?.trim() || item.title_th
        : item.title_th;
  const description =
    locale === "en"
      ? item.description_en?.trim() || item.description_th?.trim() || null
      : locale === "lo"
        ? item.description_lo?.trim() || item.description_th?.trim() || null
        : item.description_th?.trim() || null;

  return {
    id: item.id,
    slug: item.slug,
    title,
    price: Number(item.price ?? 0),
    stock: Number(item.stock ?? 0),
    coverUrl: item.cover_url ?? null,
    description,
  };
}

export function FeaturedProductsLiveSection({
  initialItems,
  locale,
  useLocalePrefix,
}: FeaturedProductsLiveSectionProps) {
  const [items, setItems] = useState<ShowroomItem[]>(initialItems);
  const loadingRef = useRef(false);
  const lastSeenUpdateRef = useRef<string | null>(null);
  const signatureRef = useRef(
    initialItems.map((item) => `${item.id}:${item.stock}:${item.price}`).join("|"),
  );

  const refreshFeatured = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const response = await fetch(`/api/public/featured-products?t=${Date.now()}`, {
        method: "GET",
        cache: "no-store",
        headers: { "Cache-Control": "no-store" },
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; data?: { items?: ApiFeaturedItem[] } }
        | null;
      if (!response.ok || !payload?.ok) return;
      const nextItems = (payload.data?.items ?? []).map((item) => toShowroomItem(item, locale)).slice(0, 4);
      const nextSignature = nextItems.map((item) => `${item.id}:${item.stock}:${item.price}`).join("|");
      if (nextSignature !== signatureRef.current) {
        signatureRef.current = nextSignature;
        setItems(nextItems);
      }
    } finally {
      loadingRef.current = false;
    }
  }, [locale]);

  useEffect(() => {
    const readSignal = () => {
      try {
        return window.localStorage.getItem("kittisap_featured_updated_at");
      } catch {
        return null;
      }
    };

    const refreshBurst = () => {
      void refreshFeatured();
      window.setTimeout(() => void refreshFeatured(), 450);
      window.setTimeout(() => void refreshFeatured(), 1200);
    };

    lastSeenUpdateRef.current = readSignal();

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel("kittisap-sync");
      channel.onmessage = (event) => {
        if (event.data?.type === "featured-products-updated") {
          refreshBurst();
        }
      };
    } catch {
      channel = null;
    }

    const onStorage = (event: StorageEvent) => {
      if (event.key === "kittisap_featured_updated_at") {
        refreshBurst();
      }
    };

    const supabase = getSupabaseBrowserClient();
    const realtimeChannel = supabase
      .channel("featured-products-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => {
          refreshBurst();
        },
      )
      .subscribe();

    const signalPollId = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      const current = readSignal();
      if (!current || current === lastSeenUpdateRef.current) return;
      lastSeenUpdateRef.current = current;
      refreshBurst();
    }, 2500);

    // Fallback when realtime events are blocked/delayed.
    const serverPollId = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void refreshFeatured();
    }, 15000);

    window.addEventListener("storage", onStorage);
    return () => {
      window.clearInterval(signalPollId);
      window.clearInterval(serverPollId);
      window.removeEventListener("storage", onStorage);
      if (channel) channel.close();
      void supabase.removeChannel(realtimeChannel);
    };
  }, [refreshFeatured]);

  return <FeaturedProductsShowcase items={items} locale={locale} useLocalePrefix={useLocalePrefix} />;
}
