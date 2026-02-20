import Link from "next/link";
import { notFound } from "next/navigation";

import { getProductById } from "../../../../../lib/db/products";

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

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-r from-sky-50 via-white to-cyan-50 px-5 py-6 shadow-sm md:px-7">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-sky-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 -bottom-28 h-64 w-64 rounded-full bg-cyan-200/35 blur-3xl" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-700">Product Detail</p>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
              {product.title_th}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-medium text-slate-700">
                SKU: {product.sku || "-"}
              </span>
              <span
                className={`rounded-full px-3 py-1 font-semibold ${
                  isActive ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                }`}
              >
                {isActive ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
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

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[360px_1fr]">
        <aside className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          {heroImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={heroImage}
              alt={product.title_th}
              className="h-72 w-full rounded-2xl border border-slate-200 object-cover md:h-[390px]"
            />
          ) : (
            <div className="flex h-72 items-center justify-center rounded-2xl border border-dashed border-slate-300 text-sm text-slate-500 md:h-[390px]">
              No cover image
            </div>
          )}
          {images.length > 1 ? (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {images.slice(0, 6).map((image) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={image.id}
                  src={image.url}
                  alt={product.title_th}
                  className="h-20 w-full rounded-xl border border-slate-200 object-cover"
                />
              ))}
            </div>
          ) : null}
          <p className="mt-3 text-sm text-slate-600">{images.length} image(s)</p>
        </aside>

        <div className="space-y-4">
          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
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

          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
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
    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3">
      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="text-sm leading-relaxed text-slate-700">{value}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</dt>
      <dd className="mt-1.5 text-base text-slate-800">{value}</dd>
    </div>
  );
}
