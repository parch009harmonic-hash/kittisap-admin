import Image from "next/image";
import Link from "next/link";

import { listPublicProducts } from "../../../lib/db/publicProducts";
import type { AppLocale } from "../../../lib/i18n/locale";
import { OrderNowButton } from "./OrderNowButton";

type ProductsCatalogPageProps = {
  locale: AppLocale;
  searchParams?: Record<string, string | string[] | undefined>;
  useLocalePrefix?: boolean;
};

const PAGE_SIZE = 12;

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function parsePage(value: string | undefined) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }
  return parsed;
}

function normalizeStatus(value: string | undefined) {
  if (value === "in_stock" || value === "out_of_stock" || value === "all") {
    return value;
  }
  return "all";
}

function t(locale: AppLocale) {
  if (locale === "th") {
    return {
      title: "สินค้าของเรา",
      subtitle: "เลือกดูสินค้าที่เปิดขายจริงจากระบบแอดมิน",
      searchPlaceholder: "ค้นหาชื่อสินค้า หรือ SKU...",
      status: "สถานะ",
      category: "หมวดหมู่ (ถ้ามี)",
      all: "ทั้งหมด",
      inStock: "พร้อมส่ง",
      outOfStock: "สินค้าหมด",
      filter: "ค้นหา",
      clear: "ล้างค่า",
      stock: "คงเหลือ",
      outOfStockLabel: "Out of stock",
      orderNow: "สั่งซื้อ",
      noItemsTitle: "ไม่พบสินค้า",
      noItemsDesc: "ลองปรับคำค้นหาหรือเงื่อนไขการกรองอีกครั้ง",
      prev: "ก่อนหน้า",
      next: "ถัดไป",
      page: "หน้า",
      filters: "ตัวกรอง",
    };
  }
  return {
    title: "Our Products",
    subtitle: "Browse live products synced from admin catalog.",
    searchPlaceholder: "Search product name or SKU...",
    status: "Status",
    category: "Category (if available)",
    all: "All",
    inStock: "In stock",
    outOfStock: "Out of stock",
    filter: "Search",
    clear: "Clear",
    stock: "Stock",
    outOfStockLabel: "Out of stock",
    orderNow: "Order now",
    noItemsTitle: "No products found",
    noItemsDesc: "Try adjusting your search or filters.",
    prev: "Prev",
    next: "Next",
    page: "Page",
    filters: "Filters",
  };
}

function buildProductsHref(
  locale: AppLocale,
  query: { q?: string; status?: string; category?: string; page?: number },
  useLocalePrefix = false,
) {
  const basePath = useLocalePrefix ? `/${locale}/products` : locale === "th" ? "/products" : `/${locale}/products`;
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.status && query.status !== "all") params.set("status", query.status);
  if (query.category) params.set("category", query.category);
  if (query.page && query.page > 1) params.set("page", String(query.page));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export async function ProductsCatalogPage({ locale, searchParams = {}, useLocalePrefix = false }: ProductsCatalogPageProps) {
  const text = t(locale);
  const q = firstParam(searchParams.q)?.trim() ?? "";
  const category = firstParam(searchParams.category)?.trim() ?? "";
  const status = normalizeStatus(firstParam(searchParams.status));
  const page = parsePage(firstParam(searchParams.page));

  const source = await listPublicProducts({
    q: q || undefined,
    category: category || undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  const items = source.items.filter((item) => {
    if (status === "in_stock" && item.stock <= 0) return false;
    if (status === "out_of_stock" && item.stock > 0) return false;
    if (category) {
      const probe = `${item.slug} ${item.title_th} ${item.title_en ?? ""}`.toLowerCase();
      if (!probe.includes(category.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_#5c3f00_0%,_#1a1200_30%,_#090909_68%)] text-amber-50">
      <section className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 md:py-12">
        <header className="rounded-3xl border border-amber-500/35 bg-black/55 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur md:p-6">
          <h1 className="font-heading text-3xl font-semibold text-amber-300 md:text-4xl">{text.title}</h1>
          <p className="mt-2 text-sm text-amber-100/80 md:text-base">{text.subtitle}</p>
        </header>

        <form className="sticky top-16 z-20 mt-4 rounded-2xl border border-amber-500/25 bg-black/80 p-3 backdrop-blur md:hidden">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-amber-300">{text.filters}</p>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder={text.searchPlaceholder}
              className="col-span-2 rounded-xl border border-amber-500/35 bg-black/50 px-3 py-2 text-xs text-amber-50 outline-none placeholder:text-amber-100/50 focus:border-amber-300"
            />
            <select
              name="status"
              defaultValue={status}
              className="rounded-xl border border-amber-500/35 bg-black/50 px-3 py-2 text-xs text-amber-50 outline-none focus:border-amber-300"
            >
              <option value="all">{text.all}</option>
              <option value="in_stock">{text.inStock}</option>
              <option value="out_of_stock">{text.outOfStock}</option>
            </select>
            <input
              type="text"
              name="category"
              defaultValue={category}
              placeholder={text.category}
              className="rounded-xl border border-amber-500/35 bg-black/50 px-3 py-2 text-xs text-amber-50 outline-none placeholder:text-amber-100/50 focus:border-amber-300"
            />
            <button
              type="submit"
              className="rounded-xl border border-amber-300/60 bg-amber-400/20 px-4 py-2 text-xs font-semibold text-amber-100 hover:bg-amber-300/25"
            >
              {text.filter}
            </button>
            <Link
              href={buildProductsHref(locale, {}, useLocalePrefix)}
              className="inline-flex items-center justify-center rounded-xl border border-amber-700/60 bg-black/40 px-4 py-2 text-xs font-semibold text-amber-200 hover:bg-black/60"
            >
              {text.clear}
            </Link>
          </div>
        </form>

        <div className="mt-6 md:grid md:grid-cols-[260px_1fr] md:gap-6">
          <aside className="hidden md:block">
            <form className="sticky top-24 rounded-2xl border border-amber-500/30 bg-black/50 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-amber-300">{text.filters}</p>
              <div className="space-y-3">
                <input
                  type="text"
                  name="q"
                  defaultValue={q}
                  placeholder={text.searchPlaceholder}
                  className="w-full rounded-xl border border-amber-500/40 bg-black/50 px-3 py-2 text-sm text-amber-50 outline-none placeholder:text-amber-100/50 focus:border-amber-300"
                />
                <select
                  name="status"
                  defaultValue={status}
                  className="w-full rounded-xl border border-amber-500/40 bg-black/50 px-3 py-2 text-sm text-amber-50 outline-none focus:border-amber-300"
                >
                  <option value="all">{text.all}</option>
                  <option value="in_stock">{text.inStock}</option>
                  <option value="out_of_stock">{text.outOfStock}</option>
                </select>
                <input
                  type="text"
                  name="category"
                  defaultValue={category}
                  placeholder={text.category}
                  className="w-full rounded-xl border border-amber-500/40 bg-black/50 px-3 py-2 text-sm text-amber-50 outline-none placeholder:text-amber-100/50 focus:border-amber-300"
                />
                <button
                  type="submit"
                  className="w-full rounded-xl border border-amber-300/60 bg-amber-400/20 px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-300/25"
                >
                  {text.filter}
                </button>
                <Link
                  href={buildProductsHref(locale, {}, useLocalePrefix)}
                  className="inline-flex w-full items-center justify-center rounded-xl border border-amber-700/60 bg-black/40 px-4 py-2 text-sm font-semibold text-amber-200 hover:bg-black/60"
                >
                  {text.clear}
                </Link>
              </div>
            </form>
          </aside>

          <div>
            {items.length === 0 ? (
              <section className="rounded-2xl border border-amber-600/30 bg-black/45 p-10 text-center">
                <p className="text-xl font-semibold text-amber-200">{text.noItemsTitle}</p>
                <p className="mt-2 text-sm text-amber-100/70">{text.noItemsDesc}</p>
              </section>
            ) : (
              <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
                {items.map((item) => {
                  const localizedTitle = locale === "en" ? item.title_en || item.title_th : item.title_th;
                  const isOut = item.stock <= 0;
                  return (
                    <article
                      key={item.id}
                      className="group overflow-hidden rounded-xl border border-amber-500/30 bg-black/55 shadow-[0_10px_24px_rgba(0,0,0,0.35)] transition-transform duration-200 active:scale-[0.98] md:rounded-2xl md:hover:-translate-y-1 md:hover:shadow-[0_18px_36px_rgba(0,0,0,0.42)]"
                    >
                      <div className="relative aspect-square bg-gradient-to-br from-zinc-800 to-zinc-900">
                        {item.cover_url ? (
                          <Image src={item.cover_url} alt={localizedTitle} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover" loading="lazy" />
                        ) : (
                          <div className="grid h-full place-items-center text-[11px] text-amber-100/60">No Image</div>
                        )}
                      </div>
                      <div className="space-y-2 p-3 md:space-y-3 md:p-4">
                        <p className="line-clamp-2 min-h-[2.6rem] text-xs font-semibold text-amber-100 md:text-sm">{localizedTitle}</p>
                        <p className="text-base font-bold text-amber-300 md:text-lg">THB {item.price.toLocaleString()}</p>
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`rounded-full px-2 py-1 text-[10px] font-semibold md:px-2.5 md:text-xs ${
                              isOut ? "bg-rose-500/20 text-rose-200" : "bg-emerald-500/20 text-emerald-200"
                            }`}
                          >
                            {isOut ? text.outOfStockLabel : `${text.stock}: ${item.stock}`}
                          </span>
                          <OrderNowButton
                            productId={item.id}
                            locale={locale}
                            label={text.orderNow}
                            disabled={isOut}
                            className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold md:px-3 md:text-xs ${
                              isOut
                                ? "cursor-not-allowed bg-zinc-700 text-zinc-300"
                                : "bg-amber-400/25 text-amber-100 hover:bg-amber-300/30"
                            }`}
                          />
                        </div>
                      </div>
                    </article>
                  );
                })}
              </section>
            )}

            <footer className="mt-6 flex items-center justify-between rounded-xl border border-amber-600/25 bg-black/35 px-4 py-3 text-sm text-amber-100/85">
              <span>
                {text.page} {source.page} / {source.totalPages}
              </span>
              <div className="flex items-center gap-2">
                {source.page > 1 ? (
                  <Link
                    href={buildProductsHref(locale, { q, status, category, page: source.page - 1 }, useLocalePrefix)}
                    className="rounded-lg border border-amber-600/40 bg-black/50 px-3 py-1.5 hover:bg-black/70"
                  >
                    {text.prev}
                  </Link>
                ) : (
                  <span className="rounded-lg border border-amber-900/40 bg-black/30 px-3 py-1.5 text-amber-100/40">{text.prev}</span>
                )}
                {source.page < source.totalPages ? (
                  <Link
                    href={buildProductsHref(locale, { q, status, category, page: source.page + 1 }, useLocalePrefix)}
                    className="rounded-lg border border-amber-600/40 bg-black/50 px-3 py-1.5 hover:bg-black/70"
                  >
                    {text.next}
                  </Link>
                ) : (
                  <span className="rounded-lg border border-amber-900/40 bg-black/30 px-3 py-1.5 text-amber-100/40">{text.next}</span>
                )}
              </div>
            </footer>
          </div>
        </div>
      </section>
    </main>
  );
}



