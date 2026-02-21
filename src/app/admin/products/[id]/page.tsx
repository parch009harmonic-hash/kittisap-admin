import Link from "next/link";
import { notFound } from "next/navigation";

import { getProductById } from "../../../../../lib/db/products";
import { ProductImageGallery } from "../../../../components/admin/products/ProductImageGallery";

type ProductDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { id } = await params;
  const product = await getProductById(id);

  if (!product) {
    notFound();
  }

  const images = product.images ?? [];
  const heroImage = product.cover_url || images[0]?.url || null;
  const isActive = product.status === "active";
  const updatedAtLabel = product.updated_at
    ? new Intl.DateTimeFormat("th-TH", { dateStyle: "short", timeStyle: "short" }).format(
        new Date(product.updated_at),
      )
    : "-";

  return (
    <div className="product-detail-page space-y-6">
      <section className="product-detail-hero relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-r from-sky-50 via-white to-cyan-50 px-4 py-4 shadow-sm md:rounded-3xl md:px-6 md:py-5">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-sky-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 -bottom-28 h-64 w-64 rounded-full bg-cyan-200/35 blur-3xl" />
        <div className="product-detail-hero-inner relative flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="product-detail-title-wrap space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-blue-700">Product Detail</p>
            <h1 className="product-detail-title text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
              {product.title_th}
            </h1>
            <p className="text-[13px] text-slate-600">SKU: {product.sku || "-"}</p>
            <div className="product-detail-badges flex flex-wrap items-center gap-1.5 text-xs md:text-sm">
              <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 font-medium text-slate-700">
                Slug: {product.slug}
              </span>
              <span
                className={`rounded-full px-2.5 py-1 font-semibold ${
                  isActive ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                }`}
              >
                {isActive ? "Active" : "Inactive"}
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 font-medium text-slate-700">
                Updated: {updatedAtLabel}
              </span>
            </div>
          </div>
          <div className="product-detail-actions flex gap-2 md:pb-0.5">
            <Link
              href="/admin/products"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              Back
            </Link>
            <Link
              href={`/admin/products/${product.id}/edit`}
              className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold text-white"
            >
              Edit Product
            </Link>
          </div>
        </div>
      </section>

      <section className="product-detail-hero-stats grid grid-cols-1 gap-3 sm:grid-cols-3">
        <QuickStat label="Price" value={formatTHB(product.price)} />
        <QuickStat label="Stock" value={String(product.stock)} />
        <QuickStat label="Updated" value={updatedAtLabel} />
      </section>

      <section className="product-detail-layout grid grid-cols-1 gap-4 xl:grid-cols-[360px_1fr]">
        <aside className="product-detail-media rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <ProductImageGallery title={product.title_th} heroImage={heroImage} images={images} />
        </aside>

        <div className="product-detail-content space-y-4">
          <section className="product-detail-specs rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
            <dl className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
              <Detail label="Slug" value={product.slug} />
              <Detail label="Status" value={product.status} />
              <Detail label="Price" value={formatTHB(product.price)} />
              <Detail
                label="Compare Price"
                value={product.compare_at_price === undefined ? "-" : formatTHB(product.compare_at_price)}
              />
              <Detail label="Stock" value={String(product.stock)} />
              <Detail label="Title EN" value={product.title_en || "-"} />
              <Detail label="Title LO" value={product.title_lo || "-"} />
            </dl>
          </section>

          <section className="product-detail-descriptions rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Descriptions</p>
            <div className="space-y-3">
              <DescriptionBlock label="TH" value={product.description_th || "-"} />
              <DescriptionBlock label="EN" value={product.description_en || "-"} />
              <DescriptionBlock label="LO" value={product.description_lo || "-"} />
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

function formatTHB(value: number) {
  return `THB ${value.toLocaleString()}`;
}

function DescriptionBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="product-detail-desc-block rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3">
      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="text-sm leading-relaxed text-slate-700">{value}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="product-detail-detail-block rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</dt>
      <dd className="mt-1.5 text-base text-slate-800">{value}</dd>
    </div>
  );
}

function QuickStat({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 text-base font-semibold text-blue-800">{value}</p>
    </article>
  );
}





