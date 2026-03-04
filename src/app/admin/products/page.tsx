import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";

import { deleteProduct, listProducts } from "../../../../lib/db/products";
import { getAdminLocale } from "../../../../lib/i18n/admin";
import { ProductStatus } from "../../../../lib/types/product";
import { ProductsTableClient } from "../../../components/admin/products/ProductsTableClient";

type ProductsPageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    featured?: string;
    page?: string;
    notice?: string;
    error?: string;
  }>;
};

function isNextRedirectError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }
  if ("digest" in error && String((error as { digest?: unknown }).digest).includes("NEXT_REDIRECT")) {
    return true;
  }
  if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) {
    return true;
  }
  return false;
}

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

  const result = await listProducts({ q, status, featuredOnly, page, pageSize: 12 });
  const products = result.items;

  async function deleteAction(formData: FormData) {
    "use server";

    const id = String(formData.get("id") ?? "");
    if (!id) {
      redirect("/admin/products?error=Missing%20product%20id");
    }

    let nextPath = "/admin/products?notice=deleted";
    try {
      const outcome = await deleteProduct(id);
      revalidatePath("/admin/products");
      if (outcome.mode === "archived") {
        nextPath = "/admin/products?notice=archived";
      }
    } catch (error) {
      if (isNextRedirectError(error)) {
        throw error;
      }
      const message = error instanceof Error ? error.message : "Delete product failed";
      nextPath = `/admin/products?error=${encodeURIComponent(message.slice(0, 180))}`;
    }

    redirect(nextPath);
  }

  return (
    <div className="product-page space-y-6">
      <header className="product-page-hero product-page-topbar sst-card-soft flex flex-col gap-4 rounded-3xl p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-heading text-3xl text-slate-900 md:text-4xl">
            {locale === "th" ? "สินค้า" : "Products"}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {locale === "th" ? "จัดการสินค้า" : "Product catalog management"}
          </p>
          <div className="product-page-summary mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 font-semibold text-blue-700">
              {locale === "th" ? `ทั้งหมด ${result.total} รายการ` : `${result.total} total items`}
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-600">
              {locale === "th"
                ? `หน้า ${result.page}/${result.totalPages}`
                : `Page ${result.page}/${result.totalPages}`}
            </span>
          </div>
        </div>
        <Link
          href="/admin/products/new"
          className="product-page-add-btn btn-primary inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold text-white md:h-auto md:px-6 md:py-3 md:text-xs md:uppercase md:tracking-[0.2em]"
        >
          {locale === "th" ? "เพิ่มสินค้า" : "Add Product"}
        </Link>
      </header>

      {notice === "deleted" ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {locale === "th" ? "ลบสินค้าสำเร็จ" : "Product deleted successfully."}
        </div>
      ) : null}

      {notice === "archived" ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          {locale === "th"
            ? "สินค้านี้ถูกอ้างอิงในคำสั่งซื้อเดิม จึงเปลี่ยนเป็นปิดใช้งานแทนการลบถาวร"
            : "This product is referenced by existing orders, so it was archived (set inactive) instead of being permanently deleted."}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {locale === "th"
            ? `ลบสินค้าไม่สำเร็จ: ${errorMessage}`
            : `Failed to delete product: ${errorMessage}`}
        </div>
      ) : null}

      <form className="product-page-filter sst-card-soft grid grid-cols-1 gap-3 rounded-2xl p-4 md:grid-cols-[1fr_220px_auto]">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder={locale === "th" ? "ค้นหา SKU หรือ ชื่อ..." : "Search SKU or title..."}
          className="input-base"
        />
        <select name="status" defaultValue={status ?? ""} className="input-base">
          <option value="">{locale === "th" ? "ทุกสถานะ" : "All status"}</option>
          <option value="active">{locale === "th" ? "ใช้งาน" : "active"}</option>
          <option value="inactive">{locale === "th" ? "ปิดใช้งาน" : "inactive"}</option>
        </select>
        <label className="md:col-span-2 inline-flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            name="featured"
            value="1"
            defaultChecked={featuredOnly}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span>{locale === "th" ? "ดูเฉพาะสินค้าแนะนำ" : "Show featured products only"}</span>
        </label>
        <button
          type="submit"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
        >
          {locale === "th" ? "กรอง" : "Filter"}
        </button>
      </form>

      <nav className="flex items-center gap-2 overflow-x-auto pb-1 md:hidden">
        <Link
          href={`/admin/products?q=${encodeURIComponent(q ?? "")}&status=&featured=${featuredOnly ? "1" : ""}&page=1`}
          className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold ${
            !status
              ? "border-blue-200 bg-blue-50 text-blue-700"
              : "border-slate-200 bg-white text-slate-700"
          }`}
        >
          {locale === "th" ? "ทั้งหมด" : "All"}
        </Link>
        <Link
          href={`/admin/products?q=${encodeURIComponent(q ?? "")}&status=active&featured=${featuredOnly ? "1" : ""}&page=1`}
          className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold ${
            status === "active"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-slate-200 bg-white text-slate-700"
          }`}
        >
          {locale === "th" ? "ใช้งาน" : "Active"}
        </Link>
        <Link
          href={`/admin/products?q=${encodeURIComponent(q ?? "")}&status=inactive&featured=${featuredOnly ? "1" : ""}&page=1`}
          className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold ${
            status === "inactive"
              ? "border-slate-300 bg-slate-100 text-slate-700"
              : "border-slate-200 bg-white text-slate-700"
          }`}
        >
          {locale === "th" ? "ปิดใช้งาน" : "Inactive"}
        </Link>
        <Link
          href={`/admin/products?q=${encodeURIComponent(q ?? "")}&status=${status ?? ""}&featured=1&page=1`}
          className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold ${
            featuredOnly
              ? "border-amber-200 bg-amber-50 text-amber-700"
              : "border-slate-200 bg-white text-slate-700"
          }`}
        >
          {locale === "th" ? "แนะนำเท่านั้น" : "Featured Only"}
        </Link>
      </nav>

      <ProductsTableClient products={products} onDelete={deleteAction} locale={locale} />

      <div className="product-page-pagination sst-card-soft flex flex-col gap-3 rounded-2xl p-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:border-0 sm:p-0 sm:shadow-none">
        <p>
          {locale === "th" ? "หน้า" : "Page"} {result.page} / {result.totalPages} ({result.total}{" "}
          {locale === "th" ? "รายการ" : "items"})
        </p>
        <div className="grid w-full grid-cols-2 gap-2 self-end sm:w-auto sm:flex sm:gap-2">
          {result.page > 1 ? (
            <Link
              href={`/admin/products?q=${encodeURIComponent(q ?? "")}&status=${status ?? ""}&featured=${featuredOnly ? "1" : ""}&page=${result.page - 1}`}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-center text-slate-900 hover:bg-slate-50"
            >
              {locale === "th" ? "ก่อนหน้า" : "Prev"}
            </Link>
          ) : (
            <span className="rounded-xl border border-slate-200 px-4 py-2 text-center text-slate-400">
              {locale === "th" ? "ก่อนหน้า" : "Prev"}
            </span>
          )}
          {result.page < result.totalPages ? (
            <Link
              href={`/admin/products?q=${encodeURIComponent(q ?? "")}&status=${status ?? ""}&featured=${featuredOnly ? "1" : ""}&page=${result.page + 1}`}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-center text-slate-900 hover:bg-slate-50"
            >
              {locale === "th" ? "ถัดไป" : "Next"}
            </Link>
          ) : (
            <span className="rounded-xl border border-slate-200 px-4 py-2 text-center text-slate-400">
              {locale === "th" ? "ถัดไป" : "Next"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
