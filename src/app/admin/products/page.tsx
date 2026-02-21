import Link from "next/link";
import { revalidatePath } from "next/cache";

import { deleteProduct, listProducts } from "../../../../lib/db/products";
import { getAdminLocale } from "../../../../lib/i18n/admin";
import { ProductStatus } from "../../../../lib/types/product";
import { ProductsTableClient } from "../../../components/admin/products/ProductsTableClient";

type ProductsPageProps = {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
};

export default async function AdminProductsPage({ searchParams }: ProductsPageProps) {
  const locale = await getAdminLocale();
  const params = await searchParams;
  const q = params.q?.trim() || undefined;
  const status =
    params.status === "active" || params.status === "inactive"
      ? (params.status as ProductStatus)
      : undefined;
  const page = Math.max(1, Number(params.page ?? "1") || 1);

  const result = await listProducts({ q, status, page, pageSize: 12 });
  const products = result.items;

  async function deleteAction(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "");
    if (!id) {
      throw new Error("Missing product id");
    }
    await deleteProduct(id);
    revalidatePath("/admin/products");
  }

  return (
    <div className="product-page space-y-6">
      <header className="product-page-hero product-page-topbar sst-card-soft flex flex-col gap-4 rounded-3xl p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-heading text-3xl text-slate-900 md:text-4xl">{locale === "th" ? "\u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32" : "Products"}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {locale === "th" ? "\u0e08\u0e31\u0e14\u0e01\u0e32\u0e23\u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32" : "Product catalog management"}
          </p>
          <div className="product-page-summary mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 font-semibold text-blue-700">
              {locale === "th" ? `ทั้งหมด ${result.total} รายการ` : `${result.total} total items`}
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-600">
              {locale === "th" ? `หน้า ${result.page}/${result.totalPages}` : `Page ${result.page}/${result.totalPages}`}
            </span>
          </div>
        </div>
        <Link
          href="/admin/products/new"
          className="product-page-add-btn btn-primary inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold text-white md:h-auto md:px-6 md:py-3 md:text-xs md:uppercase md:tracking-[0.2em]"
        >
          {locale === "th" ? "\u0e40\u0e1e\u0e34\u0e48\u0e21\u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32" : "Add Product"}
        </Link>
      </header>

      <form className="product-page-filter sst-card-soft grid grid-cols-1 gap-3 rounded-2xl p-4 md:grid-cols-[1fr_220px_auto]">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder={locale === "th" ? "\u0e04\u0e49\u0e19\u0e2b\u0e32 SKU \u0e2b\u0e23\u0e37\u0e2d \u0e0a\u0e37\u0e48\u0e2d..." : "Search SKU or title..."}
          className="input-base"
        />
        <select name="status" defaultValue={status ?? ""} className="input-base">
          <option value="">{locale === "th" ? "\u0e17\u0e38\u0e01\u0e2a\u0e16\u0e32\u0e19\u0e30" : "All status"}</option>
          <option value="active">{locale === "th" ? "\u0e43\u0e0a\u0e49\u0e07\u0e32\u0e19" : "active"}</option>
          <option value="inactive">{locale === "th" ? "\u0e1b\u0e34\u0e14\u0e43\u0e0a\u0e49\u0e07\u0e32\u0e19" : "inactive"}</option>
        </select>
        <button
          type="submit"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
        >
          {locale === "th" ? "\u0e01\u0e23\u0e2d\u0e07" : "Filter"}
        </button>
      </form>

      <nav className="flex items-center gap-2 overflow-x-auto pb-1 md:hidden">
        <Link
          href={`/admin/products?q=${encodeURIComponent(q ?? "")}&status=&page=1`}
          className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold ${
            !status
              ? "border-blue-200 bg-blue-50 text-blue-700"
              : "border-slate-200 bg-white text-slate-700"
          }`}
        >
          {locale === "th" ? "ทั้งหมด" : "All"}
        </Link>
        <Link
          href={`/admin/products?q=${encodeURIComponent(q ?? "")}&status=active&page=1`}
          className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold ${
            status === "active"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-slate-200 bg-white text-slate-700"
          }`}
        >
          {locale === "th" ? "ใช้งาน" : "Active"}
        </Link>
        <Link
          href={`/admin/products?q=${encodeURIComponent(q ?? "")}&status=inactive&page=1`}
          className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold ${
            status === "inactive"
              ? "border-slate-300 bg-slate-100 text-slate-700"
              : "border-slate-200 bg-white text-slate-700"
          }`}
        >
          {locale === "th" ? "ปิดใช้งาน" : "Inactive"}
        </Link>
      </nav>

      <ProductsTableClient products={products} onDelete={deleteAction} locale={locale} />

      <div className="product-page-pagination sst-card-soft flex flex-col gap-3 rounded-2xl p-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:p-0 sm:shadow-none sm:border-0">
        <p>
          {locale === "th" ? "\u0e2b\u0e19\u0e49\u0e32" : "Page"} {result.page} / {result.totalPages} ({result.total}{" "}
          {locale === "th" ? "\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23" : "items"})
        </p>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-2 self-end w-full sm:w-auto">
          {result.page > 1 ? (
            <Link
              href={`/admin/products?q=${encodeURIComponent(q ?? "")}&status=${status ?? ""}&page=${result.page - 1}`}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-center text-slate-900 hover:bg-slate-50"
            >
              {locale === "th" ? "\u0e01\u0e48\u0e2d\u0e19\u0e2b\u0e19\u0e49\u0e32" : "Prev"}
            </Link>
          ) : (
            <span className="rounded-xl border border-slate-200 px-4 py-2 text-center text-slate-400">
              {locale === "th" ? "\u0e01\u0e48\u0e2d\u0e19\u0e2b\u0e19\u0e49\u0e32" : "Prev"}
            </span>
          )}
          {result.page < result.totalPages ? (
            <Link
              href={`/admin/products?q=${encodeURIComponent(q ?? "")}&status=${status ?? ""}&page=${result.page + 1}`}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-center text-slate-900 hover:bg-slate-50"
            >
              {locale === "th" ? "\u0e16\u0e31\u0e14\u0e44\u0e1b" : "Next"}
            </Link>
          ) : (
            <span className="rounded-xl border border-slate-200 px-4 py-2 text-center text-slate-400">
              {locale === "th" ? "\u0e16\u0e31\u0e14\u0e44\u0e1b" : "Next"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
