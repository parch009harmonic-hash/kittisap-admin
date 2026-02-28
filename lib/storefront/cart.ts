export const PUBLIC_CART_KEY = "kittisap_public_cart_v1";
export const PUBLIC_CART_UPDATED_EVENT = "kittisap_public_cart_updated";

export type PublicCartItem = {
  productId: string;
  slug: string;
  title: string;
  price: number;
  stock: number;
  coverUrl: string | null;
  qty: number;
};

export type AddPublicCartItemInput = Omit<PublicCartItem, "qty"> & {
  qty?: number;
};

function clampQty(qty: number, stock: number) {
  const safeStock = Number.isFinite(stock) ? Math.max(0, Math.floor(stock)) : 0;
  const maxQty = safeStock > 0 ? safeStock : 1;
  return Math.max(1, Math.min(maxQty, Math.floor(qty)));
}

function isPublicCartItem(value: unknown): value is PublicCartItem {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.productId === "string" &&
    typeof row.slug === "string" &&
    typeof row.title === "string" &&
    typeof row.price === "number" &&
    Number.isFinite(row.price) &&
    typeof row.stock === "number" &&
    Number.isFinite(row.stock) &&
    (typeof row.coverUrl === "string" || row.coverUrl === null) &&
    typeof row.qty === "number" &&
    Number.isFinite(row.qty)
  );
}

export function getPublicCart(): PublicCartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PUBLIC_CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isPublicCartItem)
      .map((item) => ({ ...item, qty: clampQty(item.qty, item.stock) }));
  } catch {
    return [];
  }
}

export function savePublicCart(items: PublicCartItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PUBLIC_CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(PUBLIC_CART_UPDATED_EVENT, { detail: { count: items.length } }));
}

export function addPublicCartItem(input: AddPublicCartItemInput) {
  const cart = getPublicCart();
  const nextQty = clampQty(input.qty ?? 1, input.stock);
  const existing = cart.find((item) => item.productId === input.productId);
  if (existing) {
    existing.qty = clampQty(existing.qty + nextQty, input.stock);
    existing.stock = input.stock;
    existing.price = input.price;
    existing.title = input.title;
    existing.slug = input.slug;
    existing.coverUrl = input.coverUrl;
  } else {
    cart.push({
      productId: input.productId,
      slug: input.slug,
      title: input.title,
      price: input.price,
      stock: input.stock,
      coverUrl: input.coverUrl,
      qty: nextQty,
    });
  }
  savePublicCart(cart);
  return cart;
}

export function updatePublicCartItemQty(productId: string, qty: number) {
  const cart = getPublicCart();
  const index = cart.findIndex((item) => item.productId === productId);
  if (index < 0) return cart;
  cart[index].qty = clampQty(qty, cart[index].stock);
  savePublicCart(cart);
  return cart;
}

export function removePublicCartItem(productId: string) {
  const next = getPublicCart().filter((item) => item.productId !== productId);
  savePublicCart(next);
  return next;
}

export function clearPublicCart() {
  savePublicCart([]);
}

export function sumPublicCart(items: PublicCartItem[]) {
  return items.reduce((sum, item) => sum + item.price * item.qty, 0);
}
