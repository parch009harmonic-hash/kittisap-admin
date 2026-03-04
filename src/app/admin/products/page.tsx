import Link from "next/link";

import { listProducts } from "../../../../lib/db/products";
import { getAdminLocale } from "../../../../lib/i18n/admin";
import { ProductStatus } from "../../../../lib/types/product";
import { ProductsPageToast } from "../../../components/admin/products/ProductsPageToast";
import { ProductsTableClient } from "../../../components/admin/products/ProductsTableClient";

type ProductsPageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    featured?: string;
    page?: string;
    notice?: string;
    error?: string;
    sync?: string;
  }>;
};

export default async function AdminProductsPage({ searchParams }: ProductsPageProps) {
  const locale = await getAdminLocale();
  const params = await searchParams;
  const q = params.q?.trim() || undefined;
  const status =
    params.status === "active" || params.status === "inactive"
      ? (params.status as ProductStatus)
      : undefined;
  const featuredOnly = params.featured === "1";
  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const notice = params.notice?.trim() || "";
  const errorMessage = params.error?.trim() || "";
  const shouldSyncStorefront = params.sync === "1";

  let loadErrorMessage = "";
  let result = {
    items: [],
    total: 0,
    page,
    pageSize: 12,
    totalPages: 1,
  } as Awaited<ReturnType<typeof listProducts>>;

  try {
    result = await listProducts({ q, status, featuredOnly, page, pageSize: 12 });
  } catch (error) {
    loadErrorMessage = error instanceof Error ? error.message : "Failed to load products";
  }

  const products = result.items;

  const t = {
    title: locale === "th" ? "สินค้า" : "Products",
    subtitle: locale === "th" ? "จัดการสินค้า" : "Product catalog management",
    totalItems: locale === "th" ? "รายการ" : "items",
    page: locale === "th" ? "หน้า" : "Page",
    addProduct: locale === "th" ? "เพิ่มสินค้า" : "Add Product",
    allStatus: locale === "th" ? "ทุกสถานะ" : "All status",
    active: locale === "th" ? "ใช้งาน" : "Active",
    inactive: locale === "th" ? "ปิดใช้งาน" : "Inactive",
    featuredOnly: locale === "th" ? "ดูเฉพาะสินค้าแนะนำ" : "Show featured products only",
    filter: locale === "th" ? "กรอง" : "Filter",
    all: locale === "th" ? "ทั้งหมด" : "All",
    featuredChip: locale === "th" ? "แนะนำเท่านั้น" : "Featured Only",
    prev: locale === "th" ? "ก่อนหน้า" : "Prev",
    next: locale === "th" ? "ถัดไป" : "Next",
    searchPlaceholder: locale === "th" ? "ค้นหา SKU หรือ ชื่อ..." : "Search SKU or title...",
    successDeleted: locale === "th" ? "ลบสินค้าสำเร็จ" : "Product deleted successfully.",
    archived:
      locale === "th"
        ? "สินค้านี้ถูกอ้างอิงในคำสั่งซื้อเดิม จึงเปลี่ยนเป็นปิดใช้งานแทนการลบถาวร"
        : "This product is referenced by existing orders, so it was archived (set inactive) instead of being permanently deleted.",
    deleteError: locale === "th" ? "ลบสินค้าไม่สำเร็จ" : "Failed to delete product",
  };

  const successMessage =
    notice === "created"
      ? locale === "th"
        ? "เพิ่มสินค้าสำเร็จ"
        : "Product created successfully."
      : notice === "updated"
        ? locale === "th"
          ? "อัปเดตสินค้าสำเร็จ"
          : "Product updated successfully."
        : notice === "deleted"
          ? t.successDeleted
          : notice === "archived"
            ? t.archived
            : undefined;
  const deleteErrorMessage = errorMessage ? `${t.deleteError}: ${errorMessage}` : undefined;
  const pageLoadError = loadErrorMessage ? `Failed to load products: ${loadErrorMessage}` : undefined;
  const toastErrorMessage = deleteErrorMessage ?? pageLoadError;

  return (
    <div className="product-page space-y-6">
      <section className="sticky top-12 z-30 -mx-1 space-y-4 bg-[#edf4fb]/95 px-1 pb-3 pt-1 backdrop-blur supports-[backdrop-filter]:bg-[#edf4fb]/80">
        <header className="product-page-hero product-page-topbar sst-card-soft flex flex-col gap-4 rounded-3xl p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-heading text-3xl text-slate-900 md:text-4xl">{t.title}</h1>
            <p className="mt-1 text-sm text-slate-600">{t.subtitle}</p>
            <div className="product-page-summary mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 font-semibold text-blue-700">
                {result.total} {t.totalItems}
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-600">
                {t.page} {result.page}/{result.totalPages}
              </span>
            </div>
          </div>
          <Link
            href="/admin/products/new"
            className="product-page-add-btn btn-primary inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold text-white md:h-auto md:px-6 md:py-3 md:text-xs md:uppercase md:tracking-[0.2em]"
          >
            {t.addProduct}
          </Link>
        </header>

        <ProductsPageToast
          key={`${notice}:${errorMessage}`}
          successMessage={successMessage}
          errorMessage={toastErrorMessage}
          syncStorefront={shouldSyncStorefront}
        />

        {pageLoadError ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{pageLoadError}</p>
        ) : null}

        <form className="product-page-filter sst-card-soft grid grid-cols-1 gap-3 rounded-2xl p-4 md:grid-cols-[1fr_220px_auto]">
          <input type="search" name="q" defaultValue={q ?? ""} placeholder={t.searchPlaceholder} className="input-base" />
          <select name="status" defaultValue={status ?? ""} className="input-base">
            <option value="">{t.allStatus}</option>
            <option value="active">{t.active}</option>
            <option value="inactive">{t.inactive}</option>
          </select>
          <label className="md:col-span-2 inline-flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              name="featured"
              value="1"
              defaultChecked={featuredOnly}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span>{t.featuredOnly}</span>
          </label>
          <button
            type="submit"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
          >
            {t.filter}
          </button>
        </form>

        <nav className="flex items-center gap-2 overflow-x-auto pb-1 md:hidden">
          <Link
            href={`/admin/products?q=${encodeURIComponent(q ?? "")}&status=&featured=${featuredOnly ? "1" : ""}&page=1`}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold ${
              !status ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            {t.all}
          </Link>
          <Link
            href={`/admin/products?q=${encodeURIComponent(q ?? "")}&status=active&featured=${featuredOnly ? "1" : ""}&page=1`}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold ${
              status === "active"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            {t.active}
          </Link>
          <Link
            href={`/admin/products?q=${encodeURIComponent(q ?? "")}&status=inactive&featured=${featuredOnly ? "1" : ""}&page=1`}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold ${
              status === "inactive"
                ? "border-slate-300 bg-slate-100 text-slate-700"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            {t.inactive}
          </Link>
          <Link
            href={`/admin/products?q=${encodeURIComponent(q ?? "")}&status=${status ?? ""}&featured=1&page=1`}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold ${
              featuredOnly
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            {t.featuredChip}
          </Link>
        </nav>
      </section>

      <ProductsTableClient products={products} locale={locale} />

      <div className="product-page-pagination sst-card-soft flex flex-col gap-3 rounded-2xl p-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:border-0 sm:p-0 sm:shadow-none">
        <p>
          {t.page} {result.page} / {result.totalPages} ({result.total} {t.totalItems})
        </p>
        <div className="grid w-full grid-cols-2 gap-2 self-end sm:w-auto sm:flex sm:gap-2">
          {result.page > 1 ? (
            <Link
              href={`/admin/products?q=${encodeURIComponent(q ?? "")}&status=${status ?? ""}&featured=${featuredOnly ? "1" : ""}&page=${result.page - 1}`}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-center text-slate-900 hover:bg-slate-50"
            >
              {t.prev}
            </Link>
          ) : (
            <span className="rounded-xl border border-slate-200 px-4 py-2 text-center text-slate-400">
              {t.prev}
            </span>
          )}
          {result.page < result.totalPages ? (
            <Link
              href={`/admin/products?q=${encodeURIComponent(q ?? "")}&status=${status ?? ""}&featured=${featuredOnly ? "1" : ""}&page=${result.page + 1}`}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-center text-slate-900 hover:bg-slate-50"
            >
              {t.next}
            </Link>
          ) : (
            <span className="rounded-xl border border-slate-200 px-4 py-2 text-center text-slate-400">
              {t.next}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
