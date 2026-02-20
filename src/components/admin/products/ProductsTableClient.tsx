"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { AdminLocale } from "../../../../lib/i18n/admin";
import { Product } from "../../../../lib/types/product";
import { ConfirmModal } from "../ConfirmModal";
import { AdminTable } from "../AdminTable";

type ProductsTableClientProps = {
  products: Product[];
  onDelete: (formData: FormData) => Promise<void>;
  locale: AdminLocale;
};

function statusClass(status: string) {
  if (status === "active") return "bg-emerald-100 text-emerald-700";
  return "bg-slate-100 text-slate-700";
}

export function ProductsTableClient({ products, onDelete, locale }: ProductsTableClientProps) {
  const formsRef = useRef<Map<string, HTMLFormElement>>(new Map());
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [mobileLayout, setMobileLayout] = useState(false);

  useEffect(() => {
    const updateMode = () => {
      const root = document.querySelector(".admin-ui");
      const mobileTheme = root?.classList.contains("os-mobile") ?? false;
      const smallViewport = window.matchMedia("(max-width: 767px)").matches;
      setMobileLayout(mobileTheme || smallViewport);
    };

    updateMode();
    window.addEventListener("resize", updateMode);
    return () => window.removeEventListener("resize", updateMode);
  }, []);

  if (products.length === 0) {
    return (
      <div className="sst-card-soft rounded-2xl border border-dashed border-slate-200 px-6 py-12 text-center text-slate-600">
        {locale === "th" ? "\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32" : "No products found."}
      </div>
    );
  }

  const target = products.find((item) => item.id === confirmId) || null;
  return (
    <>
      {mobileLayout ? <div className="space-y-3">
        {products.map((product) => (
          <article key={`m-${product.id}`} className="sst-card-soft rounded-2xl p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                    product.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {locale === "th" ? (product.status === "active" ? "ใช้งาน" : "ปิดใช้งาน") : product.status}
                </span>
                <Link href={`/admin/products/${product.id}`} className="mt-1 block line-clamp-2 text-base font-semibold text-slate-900">
                  {product.title_th}
                </Link>
              </div>
              <p className="shrink-0 text-lg font-semibold text-blue-700">THB {product.price.toLocaleString()}</p>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-slate-50 px-2.5 py-2">
                <p className="text-[11px] text-slate-500">{locale === "th" ? "SKU" : "SKU"}</p>
                <p className="mt-0.5 truncate text-sm font-semibold text-slate-800">{product.sku || "-"}</p>
              </div>
              <div className="rounded-xl bg-slate-50 px-2.5 py-2">
                <p className="text-[11px] text-slate-500">{locale === "th" ? "สต็อก" : "Stock"}</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-800">{product.stock}</p>
              </div>
              <div className="rounded-xl bg-slate-50 px-2.5 py-2">
                <p className="text-[11px] text-slate-500">{locale === "th" ? "slug" : "Slug"}</p>
                <p className="mt-0.5 truncate text-sm font-semibold text-slate-800">{product.slug}</p>
              </div>
              <div className="rounded-xl bg-slate-50 px-2.5 py-2">
                <p className="text-[11px] text-slate-500">{locale === "th" ? "อัปเดต" : "Updated"}</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-800">
                  {product.updated_at
                    ? new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(new Date(product.updated_at))
                    : "-"}
                </p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <Link
                href={`/admin/products/${product.id}`}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-center text-xs font-semibold text-slate-900 hover:bg-slate-50"
              >
                {locale === "th" ? "\u0e14\u0e39" : "View"}
              </Link>
              <Link
                href={`/admin/products/${product.id}/edit`}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-center text-xs font-semibold text-slate-900 hover:bg-slate-50"
              >
                {locale === "th" ? "\u0e41\u0e01\u0e49\u0e44\u0e02" : "Edit"}
              </Link>
              <form
                action={onDelete}
                ref={(node) => {
                  if (node) formsRef.current.set(product.id, node);
                  else formsRef.current.delete(product.id);
                }}
              >
                <input type="hidden" name="id" value={product.id} />
                <button
                  type="button"
                  onClick={() => setConfirmId(product.id)}
                  className="w-full rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                >
                  {locale === "th" ? "\u0e25\u0e1a" : "Delete"}
                </button>
              </form>
            </div>
          </article>
        ))}
      </div> : null}

      {!mobileLayout ? <div>
        <AdminTable
          columns={
            locale === "th"
              ? ["\u0e20\u0e32\u0e1e", "SKU", "\u0e0a\u0e37\u0e48\u0e2d\u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32", "\u0e23\u0e32\u0e04\u0e32", "\u0e2a\u0e15\u0e47\u0e2d\u0e01", "\u0e2a\u0e16\u0e32\u0e19\u0e30", "\u0e08\u0e31\u0e14\u0e01\u0e32\u0e23"]
              : ["Cover", "SKU", "Title TH", "Price", "Stock", "Status", "Actions"]
          }
        >
          {products.map((product) => (
            <tr key={product.id} className="border-t border-slate-200 text-slate-600 hover:bg-slate-50/70">
              <td className="px-5 py-3">
                {product.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.cover_url} alt={product.title_th} className="h-10 w-10 rounded-md object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-md border border-dashed border-slate-200 text-[10px] text-slate-500">
                    N/A
                  </div>
                )}
              </td>
              <td className="px-5 py-3">{product.sku || "-"}</td>
              <td className="px-5 py-3 font-semibold text-slate-900">
                <Link href={`/admin/products/${product.id}`} className="hover:text-blue-700 hover:underline">
                  {product.title_th}
                </Link>
              </td>
              <td className="px-5 py-3">THB {product.price.toLocaleString()}</td>
              <td className="px-5 py-3">{product.stock}</td>
              <td className="px-5 py-3">
                <span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${statusClass(product.status)}`}>
                  {locale === "th" ? (product.status === "active" ? "\u0e43\u0e0a\u0e49\u0e07\u0e32\u0e19" : "\u0e1b\u0e34\u0e14\u0e43\u0e0a\u0e49\u0e07\u0e32\u0e19") : product.status}
                </span>
              </td>
              <td className="px-5 py-3">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/products/${product.id}`}
                    className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 hover:bg-slate-50"
                  >
                    {locale === "th" ? "\u0e14\u0e39" : "View"}
                  </Link>
                  <Link
                    href={`/admin/products/${product.id}/edit`}
                    className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 hover:bg-slate-50"
                  >
                    {locale === "th" ? "\u0e41\u0e01\u0e49\u0e44\u0e02" : "Edit"}
                  </Link>
                  <form
                    action={onDelete}
                    ref={(node) => {
                      if (node) formsRef.current.set(product.id, node);
                      else formsRef.current.delete(product.id);
                    }}
                  >
                    <input type="hidden" name="id" value={product.id} />
                    <button
                      type="button"
                      onClick={() => setConfirmId(product.id)}
                      className="rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs text-rose-700 hover:bg-rose-100"
                    >
                      {locale === "th" ? "\u0e25\u0e1a" : "Delete"}
                    </button>
                  </form>
                </div>
              </td>
            </tr>
          ))}
        </AdminTable>
      </div> : null}

      <ConfirmModal
        open={Boolean(confirmId)}
        title={locale === "th" ? "\u0e25\u0e1a\u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32" : "Delete Product"}
        message={
          target
            ? locale === "th"
              ? `\u0e25\u0e1a \"${target.title_th}\" \u0e41\u0e1a\u0e1a\u0e16\u0e32\u0e27\u0e23\u0e2b\u0e23\u0e37\u0e2d\u0e44\u0e21\u0e48?`
              : `Delete "${target.title_th}" permanently?`
            : locale === "th"
              ? "\u0e25\u0e1a\u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32\u0e19\u0e35\u0e49\u0e41\u0e1a\u0e1a\u0e16\u0e32\u0e27\u0e23\u0e2b\u0e23\u0e37\u0e2d\u0e44\u0e21\u0e48?"
              : "Delete this product permanently?"
        }
        confirmText={locale === "th" ? "\u0e25\u0e1a" : "Delete"}
        cancelText={locale === "th" ? "\u0e22\u0e01\u0e40\u0e25\u0e34\u0e01" : "Cancel"}
        onCancel={() => setConfirmId(null)}
        onConfirm={() => {
          if (!confirmId) return;
          formsRef.current.get(confirmId)?.requestSubmit();
          setConfirmId(null);
        }}
      />
    </>
  );
}
