"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const formsRef = useRef<Map<string, HTMLFormElement>>(new Map());
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [mobileLayout, setMobileLayout] = useState(false);
  const [featuredById, setFeaturedById] = useState<Record<string, boolean>>({});
  const [pendingFeaturedById, setPendingFeaturedById] = useState<Record<string, boolean>>({});

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

        if (typeof window !== "undefined") {
          const ts = Date.now().toString();
          window.localStorage.setItem("kittisap_featured_updated_at", ts);
          try {
            const channel = new BroadcastChannel("kittisap-sync");
            channel.postMessage({ type: "featured-products-updated", ts: Number(ts) });
            channel.close();
          } catch {
            // BroadcastChannel is not available in some browsers.
          }
        }

        router.refresh();
      } catch {
        setFeaturedById((prev) => ({ ...prev, [product.id]: current }));
      } finally {
        setPendingFeaturedById((prev) => ({ ...prev, [product.id]: false }));
      }
    })();
  }

  if (products.length === 0) {
    return (
      <div className="sst-card-soft rounded-2xl border border-dashed border-slate-200 px-6 py-12 text-center text-slate-600">
        {locale === "th" ? "ยังไม่พบสินค้า" : "No products found."}
      </div>
    );
  }

  const target = products.find((item) => item.id === confirmId) || null;
  const sourceItems = products.filter((item) => item.status === "active");
  const mobileItems = sourceItems.length > 0 ? sourceItems : products;
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

      {!mobileLayout ? (
        <div>
          <AdminTable
            columns={
              locale === "th"
                ? ["ภาพ", "SKU", "ชื่อสินค้า", "ราคา", "สต็อก", "สถานะ", "สินค้าแนะนำ", "จัดการ"]
                : ["Cover", "SKU", "Title TH", "Price", "Stock", "Status", "Featured", "Actions"]
            }
          >
            {products.map((product) => (
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
                        {locale === "th" ? "ลบ" : "Delete"}
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </AdminTable>
        </div>
      ) : null}

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
