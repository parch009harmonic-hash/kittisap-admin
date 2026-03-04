export const STOREFRONT_SYNC_CHANNEL = "kittisap-sync";
export const FEATURED_UPDATED_KEY = "kittisap_featured_updated_at";
export const STOREFRONT_UPDATED_KEY = "kittisap_storefront_updated_at";

export function emitStorefrontUpdateSignal(options?: { featured?: boolean }) {
  if (typeof window === "undefined") {
    return;
  }

  const ts = Date.now().toString();

  try {
    window.localStorage.setItem(STOREFRONT_UPDATED_KEY, ts);
    if (options?.featured) {
      window.localStorage.setItem(FEATURED_UPDATED_KEY, ts);
    }
  } catch {
    // Ignore storage failures in private/browser-restricted modes.
  }

  try {
    const channel = new BroadcastChannel(STOREFRONT_SYNC_CHANNEL);
    channel.postMessage({ type: "storefront-updated", ts: Number(ts) });
    if (options?.featured) {
      channel.postMessage({ type: "featured-products-updated", ts: Number(ts) });
    }
    channel.close();
  } catch {
    // BroadcastChannel may be unavailable in some environments.
  }
}
