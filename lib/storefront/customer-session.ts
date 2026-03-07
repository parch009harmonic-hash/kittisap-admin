export const CUSTOMER_SESSION_ACTIVITY_KEY = "kittisap:customer:last_active_at";
export const CUSTOMER_SESSION_MAX_IDLE_MS = 24 * 60 * 60 * 1000;
const CUSTOMER_SESSION_WRITE_GAP_MS = 15 * 1000;

function readStoredActivityTime() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(CUSTOMER_SESSION_ACTIVITY_KEY);
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  } catch {
    return null;
  }
}

export function markCustomerSessionActive(now = Date.now()) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(CUSTOMER_SESSION_ACTIVITY_KEY, String(now));
  } catch {
    // ignore storage errors
  }
}

export function clearCustomerSessionActivity() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(CUSTOMER_SESSION_ACTIVITY_KEY);
  } catch {
    // ignore storage errors
  }
}

export function shouldRefreshCustomerSessionActivity(now = Date.now()) {
  const lastActiveAt = readStoredActivityTime();
  if (!lastActiveAt) {
    return true;
  }
  return now - lastActiveAt >= CUSTOMER_SESSION_WRITE_GAP_MS;
}

export function isCustomerSessionExpired(now = Date.now()) {
  const lastActiveAt = readStoredActivityTime();
  if (!lastActiveAt) {
    return false;
  }
  return now - lastActiveAt >= CUSTOMER_SESSION_MAX_IDLE_MS;
}
