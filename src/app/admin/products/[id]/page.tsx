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

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-4xl text-ink">{product.title_th}</h1>
          <p className="mt-1 text-sm text-steel">SKU: {product.sku || "-"}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/products"
            className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold text-ink hover:bg-mist"
          >
            Back
          </Link>
          <Link href={`/admin/products/${product.id}/edit`} className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold">
            Edit
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-[300px_1fr]">
        <div className="glass-card rounded-2xl p-4">
          {product.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.cover_url} alt={product.title_th} className="h-64 w-full rounded-lg object-cover md:h-72" />
          ) : (
            <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border text-sm text-steel md:h-72">
              No cover image
            </div>
          )}
          <div className="mt-3 text-sm text-steel">{product.images?.length ?? 0} image(s)</div>
        </div>

        <div className="glass-card rounded-2xl p-4 md:p-5">
          <dl className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
            <Detail label="Slug" value={product.slug} />
            <Detail label="Status" value={product.status} />
            <Detail label="Price" value={`THB ${product.price.toLocaleString()}`} />
            <Detail
              label="Compare Price"
              value={
                product.compare_at_price === undefined
                  ? "-"
                  : `THB ${product.compare_at_price.toLocaleString()}`
              }
            />
            <Detail label="Stock" value={String(product.stock)} />
            <Detail label="Title EN" value={product.title_en || "-"} />
            <Detail label="Title LO" value={product.title_lo || "-"} />
          </dl>

          <div className="mt-5 space-y-3">
            <p className="text-sm font-semibold text-ink">Descriptions</p>
            <p className="rounded-lg border border-border bg-white/80 p-3 text-sm text-steel">
              TH: {product.description_th || "-"}
            </p>
            <p className="rounded-lg border border-border bg-white/80 p-3 text-sm text-steel">
              EN: {product.description_en || "-"}
            </p>
            <p className="rounded-lg border border-border bg-white/80 p-3 text-sm text-steel">
              LO: {product.description_lo || "-"}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-white/80 p-3">
      <dt className="text-xs uppercase tracking-wide text-steel">{label}</dt>
      <dd className="mt-1 text-ink">{value}</dd>
    </div>
  );
}
