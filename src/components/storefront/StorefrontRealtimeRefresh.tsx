"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import {
  FEATURED_UPDATED_KEY,
  STOREFRONT_SYNC_CHANNEL,
  STOREFRONT_UPDATED_KEY,
} from "../../../lib/storefront-sync";
import { getSupabaseBrowserClient } from "../../../lib/supabase/client";

export function StorefrontRealtimeRefresh() {
  const router = useRouter();
  const lastRefreshAtRef = useRef(0);
  const lastSeenUpdateRef = useRef<string | null>(null);

  useEffect(() => {
    const refresh = () => {
      const now = Date.now();
      if (now - lastRefreshAtRef.current < 900) {
        return;
      }
      lastRefreshAtRef.current = now;
      router.refresh();
    };

    const refreshBurst = () => {
      refresh();
      window.setTimeout(refresh, 320);
      window.setTimeout(refresh, 920);
    };

    const readSignal = () => {
      try {
        const featured = window.localStorage.getItem(FEATURED_UPDATED_KEY) ?? "";
        const storefront = window.localStorage.getItem(STOREFRONT_UPDATED_KEY) ?? "";
        return `${featured}|${storefront}`;
      } catch {
        return null;
      }
    };

    lastSeenUpdateRef.current = readSignal();

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(STOREFRONT_SYNC_CHANNEL);
      channel.onmessage = (event) => {
        if (event.data?.type === "featured-products-updated" || event.data?.type === "storefront-updated") {
          refreshBurst();
        }
      };
    } catch {
      channel = null;
    }

    const onStorage = (event: StorageEvent) => {
      if (event.key === FEATURED_UPDATED_KEY || event.key === STOREFRONT_UPDATED_KEY) {
        refreshBurst();
      }
    };

    const supabase = getSupabaseBrowserClient();
    const realtimeChannel = supabase
      .channel("storefront-live-refresh")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => refreshBurst())
      .on("postgres_changes", { event: "*", schema: "public", table: "product_images" }, () => refreshBurst())
      .subscribe();

    // Fallback for browser modes where storage/broadcast events are delayed.
    const pollId = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      const current = readSignal();
      if (!current || current === lastSeenUpdateRef.current) return;
      lastSeenUpdateRef.current = current;
      refreshBurst();
    }, 1200);

    window.addEventListener("storage", onStorage);
    return () => {
      window.clearInterval(pollId);
      window.removeEventListener("storage", onStorage);
      void supabase.removeChannel(realtimeChannel);
      if (channel) {
        channel.close();
      }
    };
  }, [router]);

  return null;
}
