import Link from "next/link";

import { listPublicProducts } from "../../../lib/db/publicProducts";
import type { AppLocale } from "../../../lib/i18n/locale";
import { ProductsCatalogInteractiveGrid } from "./ProductsCatalogInteractiveGrid";
import { StorefrontTopMenu } from "./StorefrontTopMenu";

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
      subtitle: "เลือกสินค้าจากรายการด้านล่าง",
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
      addToCart: "ใส่ตะกร้า",
      goToCart: "ไปตะกร้า",
      orderNow: "สั่งซื้อ",
      noItemsTitle: "ไม่พบสินค้า",
      noItemsDesc: "ลองเปลี่ยนคำค้นหาหรือเงื่อนไขการกรอง",
      prev: "ก่อนหน้า",
      next: "ถัดไป",
      page: "หน้า",
      viewDetails: "ดูรายละเอียดสินค้า",
      close: "ปิด",
      noImage: "ไม่มีรูป",
      overview: "รายละเอียดสินค้า",
    };
  }

  if (locale === "lo") {
    return {
      title: "ສິນຄ້າທັງໝົດ",
      subtitle: "ເລືອກສິນຄ້າຈາກລາຍການຂ້າງລຸ່ມ",
      searchPlaceholder: "ຄົ້ນຫາສິນຄ້າ ຫຼື SKU...",
      status: "ສະຖານະ",
      category: "ໝວດໝູ່",
      sort: "ຈັດຮຽງ",
      sortNewest: "ລ່າສຸດ",
      sortPriceAsc: "ລາຄາຕ່ຳ-ສູງ",
      sortPriceDesc: "ລາຄາສູງ-ຕ່ຳ",
      sortStockDesc: "ສະຕັອກຫຼາຍສຸດ",
      all: "ທັງໝົດ",
      inStock: "ພ້ອມສົ່ງ",
      outOfStock: "ສິນຄ້າໝົດ",
      filter: "ນຳໃຊ້",
      clear: "ລ້າງ",
      stock: "ຄົງເຫຼືອ",
      outOfStockLabel: "ສິນຄ້າໝົດ",
      addToCart: "ໃສ່ກະຕ່າ",
      goToCart: "ໄປກະຕ່າ",
      orderNow: "ສັ່ງຊື້",
      noItemsTitle: "ບໍ່ພົບສິນຄ້າ",
      noItemsDesc: "ລອງປັບຄຳຄົ້ນຫາ ຫຼື ຕົວກອງ",
      prev: "ກ່ອນໜ້າ",
      next: "ຖັດໄປ",
      page: "ໜ້າ",
      viewDetails: "ເບິ່ງລາຍລະອຽດ",
      close: "ປິດ",
      noImage: "ບໍ່ມີຮູບ",
      overview: "ລາຍລະອຽດສິນຄ້າ",
    };
  }

  return {
    title: "All Products",
    subtitle: "Browse products from the list below.",
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
    addToCart: "Add to cart",
    goToCart: "Go to cart",
    orderNow: "Order now",
    noItemsTitle: "No products found",
    noItemsDesc: "Try adjusting your filters.",
    prev: "Prev",
    next: "Next",
    page: "Page",
    viewDetails: "View product details",
    close: "Close",
    noImage: "No image",
    overview: "Product Overview",
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
    <>
      <StorefrontTopMenu locale={locale} useLocalePrefix={useLocalePrefix} />
      <main className="min-h-screen bg-[#f4f6fb] text-slate-900">
        <section className="mx-auto w-full max-w-7xl px-3 py-4 md:px-4 md:py-8">
          <header className="mb-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:mb-4 md:p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">{text.title}</h1>
                <p className="mt-1 text-sm text-slate-600">{text.subtitle}</p>
              </div>

              <form className="w-full xl:w-auto">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    name="q"
                    defaultValue={q}
                    placeholder={text.searchPlaceholder}
                    className="h-10 w-full min-w-[280px] rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-amber-500 xl:w-[360px]"
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
                    className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-amber-500"
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
                    className="app-press h-10 rounded-lg bg-amber-500 px-4 text-sm font-bold text-zinc-900 transition hover:bg-amber-400"
                  >
                    {text.filter}
                  </button>

                  <Link
                    href={buildProductsHref(locale, {}, useLocalePrefix)}
                    className="app-press inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    {text.clear}
                  </Link>
                </div>
              </form>
            </div>
          </header>

          {items.length === 0 ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
              <p className="text-xl font-semibold text-slate-900">{text.noItemsTitle}</p>
              <p className="mt-2 text-sm text-slate-600">{text.noItemsDesc}</p>
            </section>
          ) : (
            <ProductsCatalogInteractiveGrid
              items={items.map((item) => ({
                id: item.id,
                slug: item.slug,
                title:
                  locale === "en"
                    ? item.title_en || item.title_th
                    : locale === "lo"
                      ? item.title_lo || item.title_en || item.title_th
                      : item.title_th,
                description:
                  locale === "en"
                    ? item.description_en || item.description_th || text.noItemsDesc
                    : locale === "lo"
                      ? item.description_lo || item.description_en || item.description_th || text.noItemsDesc
                      : item.description_th || item.description_en || text.noItemsDesc,
                price: item.price,
                stock: item.stock,
                coverUrl: item.cover_url,
              }))}
              locale={locale}
              useLocalePrefix={useLocalePrefix}
              text={{
                stock: text.stock,
                outOfStockLabel: text.outOfStockLabel,
                addToCart: text.addToCart,
                goToCart: text.goToCart,
                orderNow: text.orderNow,
                viewDetails: text.viewDetails,
                close: text.close,
                noImage: text.noImage,
                overview: text.overview,
              }}
            />
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
    </>
  );
}
