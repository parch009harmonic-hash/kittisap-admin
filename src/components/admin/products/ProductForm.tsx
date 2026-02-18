"use client";

import { useRouter } from "next/navigation";
import { FormEvent, ReactNode, useMemo, useState, useTransition } from "react";

import { Product, ProductImage, ProductInput } from "../../../../lib/types/product";
import { ProductInputSchema } from "../../../../lib/validators/product";
import { Toast } from "../Toast";
import { ProductImagesGrid } from "./ProductImagesGrid";
import { ProductImagesUploader } from "./ProductImagesUploader";

type ProductFormProps = {
  mode: "create" | "edit";
  productId?: string;
  initialProduct?: Partial<Product>;
  initialImages?: ProductImage[];
  submitAction: (formData: FormData) => Promise<void>;
  persistUploadedImages?: (urls: string[]) => Promise<ProductImage[]>;
  persistSetPrimary?: (imageId: string) => Promise<void>;
  persistRemoveImage?: (imageId: string) => Promise<void>;
  persistReorderImages?: (orderedIds: string[]) => Promise<void>;
};

type UiImage = {
  id: string;
  product_id?: string;
  url: string;
  sort: number;
  is_primary: boolean;
  created_at?: string | null;
};

function getDefaultForm(product?: Partial<Product>) {
  return {
    sku: product?.sku ?? "",
    slug: product?.slug ?? "",
    title_th: product?.title_th ?? "",
    title_en: product?.title_en ?? "",
    title_lo: product?.title_lo ?? "",
    description_th: product?.description_th ?? "",
    description_en: product?.description_en ?? "",
    description_lo: product?.description_lo ?? "",
    price: String(product?.price ?? 0),
    compare_at_price: String(product?.compare_at_price ?? 0),
    stock: String(product?.stock ?? 0),
    status: product?.status ?? ("active" as const),
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function ProductForm({
  mode,
  productId,
  initialProduct,
  initialImages = [],
  submitAction,
  persistUploadedImages,
  persistSetPrimary,
  persistRemoveImage,
  persistReorderImages,
}: ProductFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [form, setForm] = useState(getDefaultForm(initialProduct));
  const [slugTouched, setSlugTouched] = useState(Boolean(initialProduct?.slug));
  const [images, setImages] = useState<UiImage[]>(
    initialImages
      .map((image, index) => ({
        ...image,
        sort: image.sort ?? index,
      }))
      .sort((a, b) => a.sort - b.sort)
  );

  const previewCover = useMemo(() => {
    const primary = images.find((image) => image.is_primary);
    return primary?.url ?? images[0]?.url ?? null;
  }, [images]);

  function setField(name: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function normalizePrimary(nextImages: UiImage[]) {
    if (nextImages.length === 0) return [];
    if (nextImages.some((image) => image.is_primary)) return nextImages;
    return nextImages.map((image, index) => ({ ...image, is_primary: index === 0 }));
  }

  async function handleUploaded(newItems: Array<{ url: string }>) {
    setError(null);
    setToast(null);

    if (mode === "edit" && productId && persistUploadedImages) {
      const snapshot = [...images];
      const tmpItems: UiImage[] = newItems.map((item, index) => ({
        id: `tmp-${crypto.randomUUID()}`,
        url: item.url,
        sort: images.length + index,
        is_primary: false,
      }));
      setImages((prev) => normalizePrimary([...prev, ...tmpItems]));

      try {
        const inserted = await persistUploadedImages(newItems.map((item) => item.url));
        setImages((prev) => {
          const cleaned = prev.filter((item) => !tmpItems.some((tmp) => tmp.id === item.id));
          return normalizePrimary([...cleaned, ...inserted]);
        });
        setToast({ type: "success", message: "Images uploaded" });
      } catch (persistError) {
        setImages(snapshot);
        setError(persistError instanceof Error ? persistError.message : "Failed to add images");
        setToast({ type: "error", message: "Failed to add images" });
      }
      return;
    }

    setImages((prev) => {
      const startSort = prev.length;
      const mapped = newItems.map((item, index) => ({
        id: `tmp-${crypto.randomUUID()}`,
        url: item.url,
        sort: startSort + index,
        is_primary: false,
      }));
      setToast({ type: "success", message: "Images added (pending save)" });
      return normalizePrimary([...prev, ...mapped]);
    });
  }

  async function setAsCover(imageId: string) {
    setError(null);
    setToast(null);
    const snapshot = [...images];
    setImages(
      images.map((image) => ({
        ...image,
        is_primary: image.id === imageId,
      }))
    );

    if (mode === "edit" && !imageId.startsWith("tmp-") && persistSetPrimary) {
      try {
        await persistSetPrimary(imageId);
        setToast({ type: "success", message: "Cover image updated" });
      } catch (persistError) {
        setImages(snapshot);
        setError(persistError instanceof Error ? persistError.message : "Failed to update cover image");
        setToast({ type: "error", message: "Failed to update cover image" });
      }
      return;
    }

    setToast({ type: "success", message: "Cover updated (pending save)" });
  }

  async function removeCurrentImage(imageId: string) {
    setError(null);
    setToast(null);
    const snapshot = [...images];
    const filtered = normalizePrimary(
      images.filter((image) => image.id !== imageId).map((image, index) => ({ ...image, sort: index }))
    );
    setImages(filtered);

    if (mode === "edit" && !imageId.startsWith("tmp-") && persistRemoveImage) {
      try {
        await persistRemoveImage(imageId);
        setToast({ type: "success", message: "Image removed" });
      } catch (persistError) {
        setImages(snapshot);
        setError(persistError instanceof Error ? persistError.message : "Failed to remove image");
        setToast({ type: "error", message: "Failed to remove image" });
      }
      return;
    }

    setToast({ type: "success", message: "Image removed (pending save)" });
  }

  async function reorderImages(next: Array<{ id: string; url: string; sort: number; is_primary: boolean }>) {
    setError(null);
    setToast(null);
    const snapshot = [...images];
    const nextImages = normalizePrimary(
      next.map((image) => ({
        ...image,
        product_id: images.find((item) => item.id === image.id)?.product_id,
        created_at: images.find((item) => item.id === image.id)?.created_at ?? null,
      }))
    );
    setImages(nextImages);

    if (mode === "edit" && persistReorderImages) {
      const orderedIds = nextImages.map((image) => image.id).filter((id) => !id.startsWith("tmp-"));
      try {
        await persistReorderImages(orderedIds);
        setToast({ type: "success", message: "Image order updated" });
      } catch (persistError) {
        setImages(snapshot);
        setError(persistError instanceof Error ? persistError.message : "Failed to reorder images");
        setToast({ type: "error", message: "Failed to reorder images" });
      }
      return;
    }
    setToast({ type: "success", message: "Image order updated (pending save)" });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setToast(null);

    const parsed = ProductInputSchema.safeParse({
      ...form,
      price: form.price,
      compare_at_price: form.compare_at_price,
      stock: form.stock,
    });

    if (!parsed.success) {
      setError(parsed.error.issues.map((issue) => issue.message).join(", "));
      setToast({ type: "error", message: "Validation failed" });
      return;
    }

    const normalizedImages = normalizePrimary(images.map((image, index) => ({ ...image, sort: index })));
    const formData = new FormData();
    const payload = parsed.data;

    (Object.keys(payload) as Array<keyof ProductInput>).forEach((key) => {
      const value = payload[key];
      formData.set(key, value === undefined ? "" : String(value));
    });

    formData.set(
      "images_json",
      JSON.stringify(
        normalizedImages.map((image, index) => ({
          id: image.id.startsWith("tmp-") ? undefined : image.id,
          url: image.url,
          sort: index,
          is_primary: image.is_primary,
        }))
      )
    );
    if (productId) formData.set("product_id", productId);

    startTransition(async () => {
      try {
        await submitAction(formData);
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : "Save failed");
        setToast({ type: "error", message: "Save failed" });
      }
    });
  }

  return (
    <>
      <form onSubmit={onSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="SKU"><input value={form.sku} onChange={(event) => setField("sku", event.target.value)} className={inputClass} /></Field>
          <Field label="Slug">
            <input
              value={form.slug}
              onChange={(event) => {
                setSlugTouched(true);
                setField("slug", event.target.value);
              }}
              className={inputClass}
              required
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="Title TH / ชื่อไทย">
            <input
              value={form.title_th}
              onChange={(event) => {
                const value = event.target.value;
                setField("title_th", value);
                if (!slugTouched) setField("slug", slugify(value));
              }}
              className={inputClass}
              required
            />
          </Field>
          <Field label="Title EN / English"><input value={form.title_en} onChange={(event) => setField("title_en", event.target.value)} className={inputClass} /></Field>
          <Field label="Title LO / Lao"><input value={form.title_lo} onChange={(event) => setField("title_lo", event.target.value)} className={inputClass} /></Field>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="Description TH"><textarea value={form.description_th} onChange={(event) => setField("description_th", event.target.value)} className={`${inputClass} min-h-24`} /></Field>
          <Field label="Description EN"><textarea value={form.description_en} onChange={(event) => setField("description_en", event.target.value)} className={`${inputClass} min-h-24`} /></Field>
          <Field label="Description LO"><textarea value={form.description_lo} onChange={(event) => setField("description_lo", event.target.value)} className={`${inputClass} min-h-24`} /></Field>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Field label="Price"><input type="number" min="0" step="0.01" value={form.price} onChange={(event) => setField("price", event.target.value)} className={inputClass} required /></Field>
          <Field label="Compare Price"><input type="number" min="0" step="0.01" value={form.compare_at_price} onChange={(event) => setField("compare_at_price", event.target.value)} className={inputClass} /></Field>
          <Field label="Stock"><input type="number" min="0" step="1" value={form.stock} onChange={(event) => setField("stock", event.target.value)} className={inputClass} required /></Field>
          <Field label="Status">
            <select value={form.status} onChange={(event) => setField("status", event.target.value)} className={inputClass}>
              <option value="active">active</option>
              <option value="inactive">inactive</option>
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_220px]">
          <div>
            <Field label="Product Images / รูปสินค้า">
              <ProductImagesUploader productId={productId} onUploaded={handleUploaded} />
            </Field>
          </div>
          <div className="sst-card-soft rounded-2xl p-3">
            <p className="mb-2 text-xs text-slate-600">Cover preview</p>
            {previewCover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewCover} alt="Cover preview" className="h-36 w-full rounded-md object-cover" />
            ) : (
              <div className="flex h-36 items-center justify-center rounded-md border border-dashed border-slate-200 text-xs text-slate-500">
                No image selected
              </div>
            )}
          </div>
        </div>

        {images.length > 0 && (
          <ProductImagesGrid images={images} onReorder={reorderImages} onSetPrimary={setAsCover} onRemove={removeCurrentImage} />
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push("/admin/products")}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
          >
            {pending ? "Saving..." : mode === "create" ? "Create Product" : "Save Changes"}
          </button>
        </div>
      </form>
      <Toast open={Boolean(toast)} type={toast?.type ?? "success"} message={toast?.message ?? ""} onClose={() => setToast(null)} />
    </>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
      {children}
    </label>
  );
}

const inputClass = "input-base";
