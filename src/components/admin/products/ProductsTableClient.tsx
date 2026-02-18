"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import { Product } from "../../../../lib/types/product";
import { ConfirmModal } from "../ConfirmModal";
import { AdminTable } from "../AdminTable";

type ProductsTableClientProps = {
  products: Product[];
  onDelete: (formData: FormData) => Promise<void>;
};

function statusClass(status: string) {
  if (status === "active") return "bg-emerald-100 text-emerald-700";
  return "bg-slate-100 text-slate-700";
}

export function ProductsTableClient({ products, onDelete }: ProductsTableClientProps) {
  const formsRef = useRef<Map<string, HTMLFormElement>>(new Map());
  const [confirmId, setConfirmId] = useState<string | null>(null);

  if (products.length === 0) {
    return (
      <div className="sst-card-soft rounded-2xl border border-dashed border-slate-200 px-6 py-12 text-center text-slate-600">
        ยังไม่มีสินค้า / No products found.
      </div>
    );
  }

  const target = products.find((item) => item.id === confirmId) || null;

  return (
    <>
      <AdminTable columns={["Cover", "SKU", "Title TH", "Price", "Stock", "Status", "Actions"]}>
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
                {product.status}
              </span>
            </td>
            <td className="px-5 py-3">
              <div className="flex items-center gap-2">
                <Link
                  href={`/admin/products/${product.id}`}
                  className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 hover:bg-slate-50"
                >
                  View
                </Link>
                <Link
                  href={`/admin/products/${product.id}/edit`}
                  className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 hover:bg-slate-50"
                >
                  Edit
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
                    Delete
                  </button>
                </form>
              </div>
            </td>
          </tr>
        ))}
      </AdminTable>

      <ConfirmModal
        open={Boolean(confirmId)}
        title="Delete Product"
        message={target ? `Delete "${target.title_th}" permanently?` : "Delete this product permanently?"}
        confirmText="Delete"
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
