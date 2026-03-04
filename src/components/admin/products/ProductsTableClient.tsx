"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { emitStorefrontUpdateSignal } from "../../../../lib/storefront-sync";
import { AdminLocale } from "../../../../lib/i18n/admin";
import { Product } from "../../../../lib/types/product";
import { ConfirmModal } from "../ConfirmModal";
import { AdminTable } from "../AdminTable";

type ProductsTableClientProps = {
  products: Product[];
  locale: AdminLocale;
};

function statusClass(status: string) {
  if (status === "active") return "bg-emerald-100 text-emerald-700";
  return "bg-slate-100 text-slate-700";
}

function moveIdByOffset(ids: string[], id: string, offset: number) {
  const index = ids.indexOf(id);
  if (index < 0) return ids;
  const nextIndex = index + offset;
  if (nextIndex < 0 || nextIndex >= ids.length) return ids;
  const next = [...ids];
  const [item] = next.splice(index, 1);
  next.splice(nextIndex, 0, item);
  return next;
}

function sameOrder(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export function ProductsTableClient({ products, locale }: ProductsTableClientProps) {
  const router = useRouter();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [mobileLayout, setMobileLayout] = useState(false);
  const [featuredById, setFeaturedById] = useState<Record<string, boolean>>({});
  const [pendingFeaturedById, setPendingFeaturedById] = useState<Record<string, boolean>>({});
  const [orderedProducts, setOrderedProducts] = useState<Product[]>(products);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string>("");
  const [sortModalOpen, setSortModalOpen] = useState(false);
  const [sortDraftIds, setSortDraftIds] = useState<string[]>([]);
  const [sortError, setSortError] = useState<string>("");
  const [savingSort, setSavingSort] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");

    const updateMode = () => {
      const root = document.querySelector(".admin-ui");
      const mobileTheme = root?.classList.contains("os-mobile") ?? false;
      const smallViewport = media.matches;
      setMobileLayout(mobileTheme || smallViewport);
    };

    updateMode();
    media.addEventListener("change", updateMode);
    window.addEventListener("resize", updateMode);

    return () => {
      media.removeEventListener("change", updateMode);
      window.removeEventListener("resize", updateMode);
    };
  }, []);

  useEffect(() => {
    const next: Record<string, boolean> = {};
    for (const product of products) {
      next[product.id] = Boolean(product.is_featured);
    }
    setFeaturedById(next);
  }, [products]);

  useEffect(() => {
    setOrderedProducts(products);
    setSortDraftIds(products.map((item) => item.id));
  }, [products]);

  function handleToggleFeatured(product: Product) {
    if (pendingFeaturedById[product.id]) return;
    const current = featuredById[product.id] ?? Boolean(product.is_featured);
    const next = !current;

    setFeaturedById((prev) => ({ ...prev, [product.id]: next }));
    setPendingFeaturedById((prev) => ({ ...prev, [product.id]: true }));

    void (async () => {
      try {
        const response = await fetch(`/api/admin/products/featured?t=${Date.now()}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
          cache: "no-store",
          body: JSON.stringify({ id: product.id, isFeatured: next }),
        });

        const data = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
        if (!response.ok || !data?.ok) {
          throw new Error(data?.error || "Failed to update featured state");
        }

        emitStorefrontUpdateSignal({ featured: true });

        router.refresh();
      } catch {
        setFeaturedById((prev) => ({ ...prev, [product.id]: current }));
      } finally {
        setPendingFeaturedById((prev) => ({ ...prev, [product.id]: false }));
      }
    })();
  }

  const productById = useMemo(
    () =>
      new Map(
        orderedProducts.map((item) => [item.id, item] as const),
      ),
    [orderedProducts],
  );

  const sortDraftProducts = useMemo(
    () => sortDraftIds.map((id) => productById.get(id)).filter((item): item is Product => Boolean(item)),
    [sortDraftIds, productById],
  );

  async function persistSortOrder(nextIds: string[], options?: { closeModalOnSuccess?: boolean }) {
    const currentIds = orderedProducts.map((item) => item.id);
    if (sameOrder(nextIds, currentIds) || savingSort) {
      if (options?.closeModalOnSuccess) {
        setSortModalOpen(false);
      }
      return;
    }

    const nextOrdered = nextIds
      .map((id) => productById.get(id))
      .filter((item): item is Product => Boolean(item));
    if (nextOrdered.length !== orderedProducts.length) {
      return;
    }

    const fallbackProducts = orderedProducts;
    const fallbackIds = currentIds;
    setOrderedProducts(nextOrdered);
    setSortDraftIds(nextIds);
    setSortError("");
    setSavingSort(true);

    try {
      const response = await fetch(`/api/admin/products/reorder?t=${Date.now()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
        cache: "no-store",
        body: JSON.stringify({ orderedIds: nextIds }),
      });
      const data = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to reorder products");
      }

      emitStorefrontUpdateSignal();
      router.refresh();
      if (options?.closeModalOnSuccess) {
        setSortModalOpen(false);
      }
    } catch (error) {
      setOrderedProducts(fallbackProducts);
      setSortDraftIds(fallbackIds);
      setSortError(error instanceof Error ? error.message : "Failed to reorder products");
    } finally {
      setSavingSort(false);
    }
  }

  function openSortModal() {
    setSortDraftIds(orderedProducts.map((item) => item.id));
    setSortError("");
    setSortModalOpen(true);
  }

  function moveSortDraft(productId: string, offset: number) {
    if (savingSort) return;
    setSortDraftIds((prev) => moveIdByOffset(prev, productId, offset));
  }

  function moveTableRow(productId: string, offset: number) {
    if (savingSort) return;
    const nextIds = moveIdByOffset(orderedProducts.map((item) => item.id), productId, offset);
    void persistSortOrder(nextIds);
  }

  async function handleDelete(productId: string) {
    if (deletingProductId) {
      return;
    }

    setDeleteError("");
    setDeletingProductId(productId);
    try {
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: "DELETE",
        headers: { "Cache-Control": "no-store" },
        cache: "no-store",
      });
      const data = (await response.json().catch(() => null)) as
        | { ok?: boolean; mode?: "deleted" | "archived"; error?: string }
        | null;

      if (!response.ok || !data?.ok || !data.mode) {
        throw new Error(data?.error || "Delete product failed");
      }

      emitStorefrontUpdateSignal({ featured: true });
      router.replace(`/admin/products?notice=${data.mode}&sync=1`);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Delete product failed";
      setDeleteError(message);
    } finally {
      setDeletingProductId(null);
      setConfirmId(null);
    }
  }

  if (orderedProducts.length === 0) {
    return (
      <div className="sst-card-soft rounded-2xl border border-dashed border-slate-200 px-6 py-12 text-center text-slate-600">
        {locale === "th" ? "ยังไม่พบสินค้า" : "No products found."}
      </div>
    );
  }

  const target = orderedProducts.find((item) => item.id === confirmId) || null;
  const sourceItems = orderedProducts.filter((item) => item.status === "active");
  const mobileItems = sourceItems.length > 0 ? sourceItems : orderedProducts;
  const hotItems = mobileItems.slice(0, 6);
  const recommendedItems = mobileItems.slice(6, 12);

  return (
    <>
      {mobileLayout ? (
        <div className="product-mobile-showcase space-y-4">
          <MobileProductSection products={hotItems} locale={locale} />

          {recommendedItems.length > 0 ? <MobileProductSection products={recommendedItems} locale={locale} /> : null}
        </div>
      ) : null}

      {deleteError ? (
        <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{deleteError}</p>
      ) : null}

      {!mobileLayout ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-sm">
          <div className="flex items-center justify-end border-b border-slate-200 bg-slate-50/80 px-3 py-2">
            <button
              type="button"
              onClick={openSortModal}
              className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
            >
              <span className="inline-flex h-4 w-4 items-center justify-center rounded border border-indigo-300 bg-white text-[10px]">↕</span>
              <span className="max-w-[148px] truncate">{locale === "th" ? "จัดเรียงสินค้า" : "Sort Products"}</span>
            </button>
          </div>
          <AdminTable
            columns={
              locale === "th"
                ? ["ภาพ", "ลำดับ", "SKU", "ชื่อสินค้า", "ราคา", "สต็อก", "สถานะ", "สินค้าแนะนำ", "จัดการ"]
                : ["Cover", "Order", "SKU", "Title TH", "Price", "Stock", "Status", "Featured", "Actions"]
            }
          >
            {orderedProducts.map((product, index) => (
              <tr key={product.id} className="border-t border-slate-200 text-slate-600 hover:bg-slate-50/70">
                <td className="px-5 py-3">
                  {product.cover_url ? (
                    <Image
                      src={product.cover_url}
                      alt={product.title_th}
                      width={40}
                      height={40}
                      sizes="40px"
                      className="h-10 w-10 rounded-md object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-md border border-dashed border-slate-200 text-[10px] text-slate-500">
                      N/A
                    </div>
                  )}
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex min-w-[42px] items-center justify-center rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700">
                      #{index + 1}
                    </span>
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => moveTableRow(product.id, -1)}
                        disabled={savingSort || index === 0}
                        className="inline-flex h-5 w-5 items-center justify-center rounded border border-slate-300 bg-white text-[10px] text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label={locale === "th" ? "เลื่อนขึ้น" : "Move up"}
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => moveTableRow(product.id, 1)}
                        disabled={savingSort || index === orderedProducts.length - 1}
                        className="inline-flex h-5 w-5 items-center justify-center rounded border border-slate-300 bg-white text-[10px] text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label={locale === "th" ? "เลื่อนลง" : "Move down"}
                      >
                        ▼
                      </button>
                    </div>
                  </div>
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
                    {locale === "th" ? (product.status === "active" ? "ใช้งาน" : "ปิดใช้งาน") : product.status}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <button
                    type="button"
                    onClick={() => handleToggleFeatured(product)}
                    disabled={Boolean(pendingFeaturedById[product.id])}
                    aria-pressed={featuredById[product.id] ?? Boolean(product.is_featured)}
                    className={`inline-flex min-h-10 min-w-[96px] items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                      featuredById[product.id] ?? Boolean(product.is_featured)
                        ? "border-blue-300 bg-blue-50 text-blue-700"
                        : "border-slate-300 bg-white text-slate-600"
                    } disabled:cursor-not-allowed`}
                  >
                    <span
                      className={`inline-flex h-5 w-5 items-center justify-center rounded border ${
                        featuredById[product.id] ?? Boolean(product.is_featured)
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-slate-300 bg-white text-transparent"
                      }`}
                    >
                      ✓
                    </span>
                    <span>{locale === "th" ? "แนะนำ" : "Featured"}</span>
                  </button>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/products/${product.id}`}
                      className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 hover:bg-slate-50"
                    >
                      {locale === "th" ? "ดู" : "View"}
                    </Link>
                    <Link
                      href={`/admin/products/${product.id}/edit`}
                      className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 hover:bg-slate-50"
                    >
                      {locale === "th" ? "แก้ไข" : "Edit"}
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteError("");
                        setConfirmId(product.id);
                      }}
                      disabled={Boolean(deletingProductId)}
                      className="rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {locale === "th" ? "ลบ" : "Delete"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </AdminTable>
        </div>
      ) : null}

      <ConfirmModal
        open={sortModalOpen}
        title={locale === "th" ? "จัดเรียงลำดับสินค้า" : "Sort Product Order"}
        message={
          locale === "th"
            ? "เลื่อนขึ้น/ลงเพื่อจัดลำดับการแสดงสินค้า แล้วกดบันทึก"
            : "Move products up or down, then save to apply."
        }
        confirmText={locale === "th" ? "บันทึกลำดับ" : "Save order"}
        cancelText={locale === "th" ? "ปิด" : "Close"}
        confirmDisabled={savingSort}
        onCancel={() => {
          if (savingSort) return;
          setSortModalOpen(false);
          setSortDraftIds(orderedProducts.map((item) => item.id));
          setSortError("");
        }}
        onConfirm={() => {
          void persistSortOrder(sortDraftIds, { closeModalOnSuccess: true });
        }}
      >
        <div className="space-y-3">
          <div className="max-h-[48vh] space-y-2 overflow-y-auto pr-1">
            {sortDraftProducts.map((product, index) => (
              <div key={product.id} className="flex items-center gap-2 rounded-xl border border-slate-700/60 bg-slate-900/65 px-3 py-2">
                <span className="inline-flex min-w-[32px] items-center justify-center rounded-md border border-cyan-300/40 bg-cyan-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-cyan-100">
                  {index + 1}
                </span>
                <p className="line-clamp-1 flex-1 text-xs font-medium text-slate-100">{product.title_th}</p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveSortDraft(product.id, -1)}
                    disabled={savingSort || index === 0}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-600 bg-slate-800/70 text-xs text-slate-100 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSortDraft(product.id, 1)}
                    disabled={savingSort || index === sortDraftProducts.length - 1}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-600 bg-slate-800/70 text-xs text-slate-100 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    ▼
                  </button>
                </div>
              </div>
            ))}
          </div>
          {sortError ? (
            <p className="rounded-lg border border-rose-400/40 bg-rose-950/40 px-3 py-2 text-xs text-rose-100">{sortError}</p>
          ) : null}
        </div>
      </ConfirmModal>

      <ConfirmModal
        open={Boolean(confirmId)}
        title={locale === "th" ? "ลบสินค้า" : "Delete Product"}
        message={
          target
            ? locale === "th"
              ? `ลบ "${target.title_th}" แบบถาวรหรือไม่?`
              : `Delete "${target.title_th}" permanently?`
            : locale === "th"
              ? "ลบสินค้านี้แบบถาวรหรือไม่?"
              : "Delete this product permanently?"
        }
        confirmText={locale === "th" ? "ลบ" : "Delete"}
        cancelText={locale === "th" ? "ยกเลิก" : "Cancel"}
        confirmDisabled={Boolean(deletingProductId)}
        onCancel={() => setConfirmId(null)}
        onConfirm={() => {
          if (!confirmId) return;
          void handleDelete(confirmId);
        }}
      />
    </>
  );
}

function MobileProductSection({
  products,
  locale,
}: {
  products: Product[];
  locale: AdminLocale;
}) {
  return (
    <section className="space-y-2">
      <div className="product-mobile-card-row">
        {products.map((product) => (
          <article key={`showcase-${product.id}`} className="product-mobile-showcase-card">
            <Link href={`/admin/products/${product.id}`} className="block">
              {typeof product.compare_at_price === "number" && product.compare_at_price > product.price ? (
                <span className="product-mobile-sale-badge">
                  {Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)}% OFF
                </span>
              ) : null}
              <div className="product-mobile-image-wrap">
                {product.cover_url ? (
                  <Image
                    src={product.cover_url}
                    alt={product.title_th}
                    width={320}
                    height={220}
                    sizes="(max-width: 768px) 50vw, 320px"
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center text-xs text-slate-400">NO IMAGE</div>
                )}
              </div>
              <p className="mt-1 line-clamp-2 text-xs font-semibold text-slate-900">{product.title_th}</p>
            </Link>
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold text-blue-700">THB {product.price.toLocaleString()}</p>
              <Link href={`/admin/products/${product.id}/edit`} className="product-mobile-cart-btn" aria-label={locale === "th" ? "แก้ไขสินค้า" : "Edit product"}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" className="h-3.5 w-3.5" aria-hidden>
                  <path d="M4 6h2l2 10h9l2-7H7.2" />
                  <circle cx="10" cy="19" r="1.2" />
                  <circle cx="17" cy="19" r="1.2" />
                </svg>
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
