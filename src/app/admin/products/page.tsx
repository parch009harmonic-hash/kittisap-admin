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
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <span className="text-xs uppercase tracking-[0.3em] text-blue-600">
            {locale === "th" ? "\u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32" : "Products"}
          </span>
          <h1 className="font-heading text-4xl text-slate-900">{locale === "th" ? "\u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32" : "Products"}</h1>
          <p className="mt-2 text-sm text-slate-600">
            {locale === "th" ? "\u0e08\u0e31\u0e14\u0e01\u0e32\u0e23\u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32" : "Product catalog management"}
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="btn-primary inline-flex items-center gap-2 rounded-full px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white"
        >
          {locale === "th" ? "\u0e40\u0e1e\u0e34\u0e48\u0e21\u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32" : "Add Product"}
        </Link>
      </header>

      <form className="sst-card-soft grid grid-cols-1 gap-3 rounded-2xl p-4 md:grid-cols-[1fr_220px_auto]">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder={locale === "th" ? "\u0e04\u0e49\u0e19\u0e2b\u0e32 SKU, slug, \u0e0a\u0e37\u0e48\u0e2d\u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32..." : "Search SKU, slug, title..."}
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

      <ProductsTableClient products={products} onDelete={deleteAction} locale={locale} />

      <div className="flex items-center justify-between text-sm text-slate-600">
        <p>
          {locale === "th" ? "\u0e2b\u0e19\u0e49\u0e32" : "Page"} {result.page} / {result.totalPages} ({result.total}{" "}
          {locale === "th" ? "\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23" : "items"})
        </p>
        <div className="flex gap-2">
          {result.page > 1 ? (
            <Link
              href={`/admin/products?q=${encodeURIComponent(q ?? "")}&status=${status ?? ""}&page=${result.page - 1}`}
              className="rounded-md border border-slate-200 bg-white px-3 py-1 text-slate-900 hover:bg-slate-50"
            >
              {locale === "th" ? "\u0e01\u0e48\u0e2d\u0e19\u0e2b\u0e19\u0e49\u0e32" : "Prev"}
            </Link>
          ) : (
            <span className="rounded-md border border-slate-200 px-3 py-1 text-slate-400">
              {locale === "th" ? "\u0e01\u0e48\u0e2d\u0e19\u0e2b\u0e19\u0e49\u0e32" : "Prev"}
            </span>
          )}
          {result.page < result.totalPages ? (
            <Link
              href={`/admin/products?q=${encodeURIComponent(q ?? "")}&status=${status ?? ""}&page=${result.page + 1}`}
              className="rounded-md border border-slate-200 bg-white px-3 py-1 text-slate-900 hover:bg-slate-50"
            >
              {locale === "th" ? "\u0e16\u0e31\u0e14\u0e44\u0e1b" : "Next"}
            </Link>
          ) : (
            <span className="rounded-md border border-slate-200 px-3 py-1 text-slate-400">
              {locale === "th" ? "\u0e16\u0e31\u0e14\u0e44\u0e1b" : "Next"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
