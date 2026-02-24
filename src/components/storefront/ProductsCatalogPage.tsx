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

const PAGE_SIZE = 20;

type SortKey = "newest" | "price_asc" | "price_desc" | "stock_desc";

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

function normalizeSort(value: string | undefined): SortKey {
  if (value === "price_asc" || value === "price_desc" || value === "stock_desc" || value === "newest") {
    return value;
  }
  return "newest";
}

function t(locale: AppLocale) {
  if (locale === "th") {
    return {
      title: "สินค้าทั้งหมด",
      subtitle: "เลือกสินค้าจากรายการจริงที่ซิงก์จากระบบแอดมิน",
      searchPlaceholder: "ค้นหาสินค้าหรือ SKU...",
      status: "สถานะ",
      category: "หมวดหมู่",
      sort: "เรียง",
      sortNewest: "ล่าสุด",
      sortPriceAsc: "ราคาต่ำไปสูง",
      sortPriceDesc: "ราคาสูงไปต่ำ",
      sortStockDesc: "สต็อกมากสุด",
      all: "ทั้งหมด",
      inStock: "พร้อมส่ง",
      outOfStock: "สินค้าหมด",
      filter: "ใช้ตัวกรอง",
      clear: "ล้าง",
      stock: "คงเหลือ",
      outOfStockLabel: "Out of stock",
      orderNow: "สั่งซื้อ",
      noItemsTitle: "ไม่พบสินค้า",
      noItemsDesc: "ลองเปลี่ยนคำค้นหาหรือเงื่อนไขการกรอง",
      prev: "ก่อนหน้า",
      next: "ถัดไป",
      page: "หน้า",
    };
  }

  return {
    title: "All Products",
    subtitle: "Browse live products synced from admin catalog.",
    searchPlaceholder: "Search product or SKU...",
    status: "Status",
    category: "Category",
    sort: "Sort",
    sortNewest: "Newest",
    sortPriceAsc: "Price low-high",
    sortPriceDesc: "Price high-low",
    sortStockDesc: "Most stock",
    all: "All",
    inStock: "In stock",
    outOfStock: "Out of stock",
    filter: "Apply",
    clear: "Clear",
    stock: "Stock",
    outOfStockLabel: "Out of stock",
    orderNow: "Order now",
    noItemsTitle: "No products found",
    noItemsDesc: "Try adjusting your filters.",
    prev: "Prev",
    next: "Next",
    page: "Page",
  };
}

function buildProductsHref(
  locale: AppLocale,
  query: { q?: string; status?: string; category?: string; sort?: SortKey; page?: number },
  useLocalePrefix = false,
) {
  const basePath = useLocalePrefix ? `/${locale}/products` : locale === "th" ? "/products" : `/${locale}/products`;
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.status && query.status !== "all") params.set("status", query.status);
  if (query.category && query.category !== "all") params.set("category", query.category);
  if (query.sort && query.sort !== "newest") params.set("sort", query.sort);
  if (query.page && query.page > 1) params.set("page", String(query.page));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export async function ProductsCatalogPage({ locale, searchParams = {}, useLocalePrefix = false }: ProductsCatalogPageProps) {
  const text = t(locale);
  const q = firstParam(searchParams.q)?.trim() ?? "";
  const categoryParam = firstParam(searchParams.category)?.trim() ?? "";
  const category = categoryParam === "all" ? "" : categoryParam;
  const status = normalizeStatus(firstParam(searchParams.status));
  const sort = normalizeSort(firstParam(searchParams.sort));
  const page = parsePage(firstParam(searchParams.page));

  const source = await listPublicProducts({
    q: q || undefined,
    category: category || undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  const filtered = source.items.filter((item) => {
    if (status === "in_stock" && item.stock <= 0) return false;
    if (status === "out_of_stock" && item.stock > 0) return false;
    if (category) {
      const probe = `${item.slug} ${item.title_th} ${item.title_en ?? ""} ${item.category_name ?? ""}`.toLowerCase();
      if (!probe.includes(category.toLowerCase())) return false;
    }
    return true;
  });

  const items = [...filtered].sort((a, b) => {
    if (sort === "price_asc") return a.price - b.price;
    if (sort === "price_desc") return b.price - a.price;
    if (sort === "stock_desc") return b.stock - a.stock;
    return 0;
  });
  const categoryOptions = Array.from(
    new Set(source.items.map((item) => item.category_name?.trim()).filter((value): value is string => Boolean(value))),
  ).sort((a, b) => a.localeCompare(b));

  return (
    <main className="min-h-screen bg-[#f4f6fb] text-slate-900">
      <section className="mx-auto w-full max-w-7xl px-3 py-4 md:px-4 md:py-8">
        <header className="mb-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:mb-4 md:p-5">
          <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">{text.title}</h1>
          <p className="mt-1 text-sm text-slate-600">{text.subtitle}</p>
        </header>

        <form className="sticky top-[62px] z-20 mb-3 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur md:top-[74px] md:mb-4 md:p-4">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-6 md:gap-3">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder={text.searchPlaceholder}
              className="col-span-2 h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-amber-500"
            />

            <select
              name="sort"
              defaultValue={sort}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-amber-500"
            >
              <option value="newest">{text.sort}: {text.sortNewest}</option>
              <option value="price_asc">{text.sortPriceAsc}</option>
              <option value="price_desc">{text.sortPriceDesc}</option>
              <option value="stock_desc">{text.sortStockDesc}</option>
            </select>

            <select
              name="status"
              defaultValue={status}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-amber-500"
            >
              <option value="all">{text.status}: {text.all}</option>
              <option value="in_stock">{text.inStock}</option>
              <option value="out_of_stock">{text.outOfStock}</option>
            </select>

            <select
              name="category"
              defaultValue={category || "all"}
              className="col-span-2 h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-amber-500 md:col-span-1"
            >
              <option value="all">{text.category}: {text.all}</option>
              {categoryOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="app-press h-10 rounded-lg bg-amber-500 px-4 text-sm font-bold text-zinc-900 transition hover:bg-amber-400 md:col-span-1"
            >
              {text.filter}
            </button>

            <Link
              href={buildProductsHref(locale, {}, useLocalePrefix)}
              className="app-press inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 md:col-span-1"
            >
              {text.clear}
            </Link>
          </div>
        </form>

        {items.length === 0 ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <p className="text-xl font-semibold text-slate-900">{text.noItemsTitle}</p>
            <p className="mt-2 text-sm text-slate-600">{text.noItemsDesc}</p>
          </section>
        ) : (
          <section className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-4">
            {items.map((item) => {
              const localizedTitle = locale === "en" ? item.title_en || item.title_th : item.title_th;
              const isOut = item.stock <= 0;

              return (
                <article
                  key={item.id}
                  className="tap-ripple app-press overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition active:scale-[0.985] md:hover:-translate-y-1 md:hover:shadow-md"
                >
                  <div className="relative aspect-square bg-slate-100">
                    {item.cover_url ? (
                      <Image
                        src={item.cover_url}
                        alt={localizedTitle}
                        fill
                        sizes="(max-width: 768px) 50vw, 25vw"
                        className="object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="grid h-full place-items-center text-[11px] text-slate-500">No Image</div>
                    )}
                  </div>

                  <div className="space-y-2 p-2.5 md:p-3">
                    <p className="line-clamp-2 min-h-[2.5rem] text-xs font-semibold text-slate-800 md:text-sm">{localizedTitle}</p>
                    <p className="text-sm font-extrabold text-amber-600 md:text-base">THB {item.price.toLocaleString()}</p>

                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-semibold leading-none ${
                          isOut ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {isOut ? text.outOfStockLabel : `${text.stock} ${item.stock}`}
                      </span>

                      <OrderNowButton
                        productId={item.id}
                        locale={locale}
                        label={text.orderNow}
                        disabled={isOut}
                        className={`rounded-md px-2 py-1 text-[10px] font-bold md:text-xs ${
                          isOut
                            ? "cursor-not-allowed bg-slate-300 text-slate-500"
                            : "bg-amber-500 text-zinc-900 hover:bg-amber-400"
                        }`}
                      />
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        <footer className="mt-5 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm">
          <span>
            {text.page} {source.page} / {source.totalPages}
          </span>
          <div className="flex items-center gap-2">
            {source.page > 1 ? (
              <Link
                href={buildProductsHref(locale, { q, status, category, sort, page: source.page - 1 }, useLocalePrefix)}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
              >
                {text.prev}
              </Link>
            ) : (
              <span className="rounded-md border border-slate-200 bg-slate-100 px-3 py-1.5 text-slate-400">{text.prev}</span>
            )}

            {source.page < source.totalPages ? (
              <Link
                href={buildProductsHref(locale, { q, status, category, sort, page: source.page + 1 }, useLocalePrefix)}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
              >
                {text.next}
              </Link>
            ) : (
              <span className="rounded-md border border-slate-200 bg-slate-100 px-3 py-1.5 text-slate-400">{text.next}</span>
            )}
          </div>
        </footer>
      </section>
    </main>
  );
}
