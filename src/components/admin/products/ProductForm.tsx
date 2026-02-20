"use client";

import { useRouter } from "next/navigation";
import { FormEvent, ReactNode, useEffect, useMemo, useState, useTransition } from "react";

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

function generateClientSku() {
  const now = new Date();
  const y = String(now.getFullYear()).slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `KS-${y}${m}${d}-${random}`;
}

function getDefaultForm(product?: Partial<Product>) {
  return {
    sku: product?.sku ?? generateClientSku(),
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

function fallbackSlugFromSku(sku: string) {
  return sku.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
}

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit, timeoutMs = 12000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
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
  const [translating, setTranslating] = useState(false);
  const [autoTranslating, setAutoTranslating] = useState(false);
  const [lastAutoSource, setLastAutoSource] = useState("");
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

  async function copyText(value: string, label: string) {
    if (!value.trim()) {
      setToast({ type: "error", message: `ไม่มี ${label} ให้คัดลอก` });
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      setToast({ type: "success", message: `คัดลอก ${label} แล้ว` });
    } catch {
      setToast({ type: "error", message: `คัดลอก ${label} ไม่สำเร็จ` });
    }
  }

  function buildAutoSlug() {
    const fromTitle = slugify(form.title_th);
    if (fromTitle) {
      return fromTitle;
    }
    return fallbackSlugFromSku(form.sku) || "product";
  }

  async function requestTranslation(titleTh: string, descriptionTh: string) {
    const response = await fetchWithTimeout("/api/admin/translate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title_th: titleTh,
        description_th: descriptionTh,
      }),
    });

    const result = (await response.json()) as {
      error?: string;
      title_en?: string;
      title_lo?: string;
      description_en?: string;
      description_lo?: string;
    };

    if (!response.ok) {
      throw new Error(result.error || "Auto translation failed");
    }

    return result;
  }

  async function autoTranslateFromThai() {
    const titleTh = form.title_th.trim();
    const descriptionTh = form.description_th.trim();

    if (!titleTh && !descriptionTh) {
      setError("กรอกชื่อหรือรายละเอียดภาษาไทยก่อน แล้วค่อยแปลอัตโนมัติ");
      return;
    }

    setError(null);
    setToast(null);
    setTranslating(true);
    try {
      const result = await requestTranslation(titleTh, descriptionTh);

      setForm((prev) => ({
        ...prev,
        title_en: String(result.title_en ?? prev.title_en),
        title_lo: String(result.title_lo ?? prev.title_lo),
        description_en: String(result.description_en ?? prev.description_en),
        description_lo: String(result.description_lo ?? prev.description_lo),
      }));
      setToast({ type: "success", message: "แปลอัตโนมัติแล้ว / Auto translated" });
    } catch (translateError) {
      setError(translateError instanceof Error ? translateError.message : "Auto translation failed");
      setToast({ type: "error", message: "แปลอัตโนมัติไม่สำเร็จ" });
    } finally {
      setTranslating(false);
    }
  }

  useEffect(() => {
    const titleTh = form.title_th.trim();
    const descriptionTh = form.description_th.trim();
    if (!titleTh && !descriptionTh) {
      return;
    }

    const source = `${titleTh}\n${descriptionTh}`;
    if (source === lastAutoSource) {
      return;
    }

    let canceled = false;
    const timer = setTimeout(async () => {
      setAutoTranslating(true);
      try {
        const result = await requestTranslation(titleTh, descriptionTh);
        if (canceled) {
          return;
        }
        setForm((prev) => ({
          ...prev,
          title_en: String(result.title_en ?? prev.title_en),
          title_lo: String(result.title_lo ?? prev.title_lo),
          description_en: String(result.description_en ?? prev.description_en),
          description_lo: String(result.description_lo ?? prev.description_lo),
        }));
        setLastAutoSource(source);
      } catch {
        // Ignore background translation errors to avoid noisy UX while typing.
      } finally {
        if (!canceled) {
          setAutoTranslating(false);
        }
      }
    }, 700);

    return () => {
      canceled = true;
      clearTimeout(timer);
    };
  }, [form.title_th, form.description_th, lastAutoSource]);

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
        if (
          submitError &&
          typeof submitError === "object" &&
          "digest" in submitError &&
          String((submitError as { digest?: unknown }).digest).includes("NEXT_REDIRECT")
        ) {
          throw submitError;
        }

        if (submitError instanceof Error && submitError.message.includes("NEXT_REDIRECT")) {
          throw submitError;
        }

        const message = submitError instanceof Error ? submitError.message : "Save failed";
        setError(message);
        setToast({ type: "error", message });
      }
    });
  }

  return (
    <>
      <form onSubmit={onSubmit} className="product-form space-y-6">
        <section className="product-form-hero relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-5 shadow-sm md:p-6">
          <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-blue-200/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 left-10 h-52 w-52 rounded-full bg-cyan-200/30 blur-3xl" />
          <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-600">
                Product Form
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                {mode === "create" ? "สร้างสินค้าใหม่" : "แก้ไขสินค้า"}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                รองรับภาษาไทย อังกฤษ และลาว พร้อมอัปโหลดรูปหลายภาพในฟอร์มเดียว
              </p>
            </div>
            <div className="product-form-lang-chips grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-xl border border-white/80 bg-white/80 px-3 py-2 text-slate-700 shadow-sm">
                <p className="font-semibold text-slate-900">TH</p>
                <p>Thai</p>
              </div>
              <div className="rounded-xl border border-white/80 bg-white/80 px-3 py-2 text-slate-700 shadow-sm">
                <p className="font-semibold text-slate-900">EN</p>
                <p>English</p>
              </div>
              <div className="rounded-xl border border-white/80 bg-white/80 px-3 py-2 text-slate-700 shadow-sm">
                <p className="font-semibold text-slate-900">LO</p>
                <p>Lao</p>
              </div>
            </div>
          </div>
        </section>

        <section className="product-form-section space-y-4 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm md:p-6">
          <div className="product-form-section-head mb-1 flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-slate-900">ข้อมูลหลักสินค้า</h3>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                Basic Info
              </span>
              <button
                type="button"
                onClick={autoTranslateFromThai}
                disabled={translating}
                className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-60"
              >
                {translating ? "กำลังแปล..." : "แปลอัตโนมัติจากไทย"}
              </button>
            </div>
          </div>
          {autoTranslating ? (
            <p className="-mt-2 text-xs text-blue-600">กำลังแปลอัตโนมัติ...</p>
          ) : null}

          <div className="product-form-grid-2 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="SKU" hint="รหัสสินค้า (ไม่บังคับ)">
              <div className="product-form-inline-actions flex gap-2">
                <input
                  value={form.sku}
                  onChange={(event) => setField("sku", event.target.value)}
                  className={`${inputClass} product-form-input-grow`}
                />
                <button
                  type="button"
                  onClick={() => copyText(form.sku, "SKU")}
                  className="product-form-copy-btn shrink-0 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  คัดลอก
                </button>
                <button
                  type="button"
                  onClick={() => setField("sku", generateClientSku())}
                  className="product-form-utility-btn shrink-0 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  สุ่มใหม่
                </button>
              </div>
            </Field>
            <Field label="Slug" hint="URL ของสินค้า เช่น green-tea-50g">
              <div className="product-form-inline-actions flex gap-2">
                <input
                  value={form.slug}
                  onChange={(event) => {
                    setSlugTouched(true);
                    setField("slug", event.target.value);
                  }}
                  className={`${inputClass} product-form-input-grow`}
                  required
                />
                <button
                  type="button"
                  onClick={() => {
                    setSlugTouched(true);
                    setField("slug", buildAutoSlug());
                  }}
                  className="product-form-utility-btn shrink-0 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  อัตโนมัติ
                </button>
                <button
                  type="button"
                  onClick={() => copyText(form.slug, "Slug")}
                  className="product-form-copy-btn shrink-0 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  คัดลอก
                </button>
              </div>
            </Field>
          </div>

          <div className="product-form-grid-3 grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="Title TH / ชื่อไทย">
              <input
                value={form.title_th}
                onChange={(event) => {
                  const value = event.target.value;
                  setField("title_th", value);
                  if (!slugTouched) setField("slug", slugify(value));
                }}
                className={inputClass}
                placeholder="ชื่อสินค้าภาษาไทย"
                required
              />
            </Field>
            <Field label="Title EN / English">
              <div className="flex gap-2">
                <input
                  value={form.title_en}
                  onChange={(event) => setField("title_en", event.target.value)}
                  className={`${inputClass} product-form-input-grow`}
                  placeholder="English title"
                />
                <button
                  type="button"
                  onClick={() => copyText(form.title_en, "Title EN")}
                  className="product-form-copy-btn shrink-0 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  คัดลอก
                </button>
              </div>
            </Field>
            <Field label="Title LO / Lao">
              <div className="flex gap-2">
                <input
                  value={form.title_lo}
                  onChange={(event) => setField("title_lo", event.target.value)}
                  className={`${inputClass} product-form-input-grow`}
                  placeholder="Lao title"
                />
                <button
                  type="button"
                  onClick={() => copyText(form.title_lo, "Title LO")}
                  className="product-form-copy-btn shrink-0 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  คัดลอก
                </button>
              </div>
            </Field>
          </div>

          <div className="product-form-grid-3 grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="Description TH" hint="รายละเอียดสินค้า (ภาษาไทย)">
              <textarea
                value={form.description_th}
                onChange={(event) => setField("description_th", event.target.value)}
                className={textareaClass}
                placeholder="รายละเอียดสินค้า ภาษาไทย"
              />
            </Field>
            <Field label="Description EN" hint="English description">
              <div className="space-y-2">
                <textarea
                  value={form.description_en}
                  onChange={(event) => setField("description_en", event.target.value)}
                  className={textareaClass}
                  placeholder="Product description in English"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => copyText(form.description_en, "Description EN")}
                    className="product-form-copy-btn rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    คัดลอก
                  </button>
                </div>
              </div>
            </Field>
            <Field label="Description LO" hint="Lao description">
              <div className="space-y-2">
                <textarea
                  value={form.description_lo}
                  onChange={(event) => setField("description_lo", event.target.value)}
                  className={textareaClass}
                  placeholder="Product description in Lao"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => copyText(form.description_lo, "Description LO")}
                    className="product-form-copy-btn rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    คัดลอก
                  </button>
                </div>
              </div>
            </Field>
          </div>
        </section>

        <section className="product-form-section space-y-4 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm md:p-6">
          <div className="mb-1 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">ราคาและสต็อก</h3>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              Pricing
            </span>
          </div>

          <div className="product-form-grid-4 grid grid-cols-1 gap-4 md:grid-cols-4">
            <Field label="Price / ราคา">
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(event) => setField("price", event.target.value)}
                className={inputClass}
                required
              />
            </Field>
            <Field label="Compare Price / ราคาก่อนลด">
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={form.compare_at_price}
                onChange={(event) => setField("compare_at_price", event.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Stock / คงเหลือ">
              <input
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                value={form.stock}
                onChange={(event) => setField("stock", event.target.value)}
                className={inputClass}
                required
              />
            </Field>
            <Field label="Status / สถานะ">
              <select
                value={form.status}
                onChange={(event) => setField("status", event.target.value)}
                className={inputClass}
              >
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </select>
            </Field>
          </div>
        </section>

        <section className="product-form-section space-y-4 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm md:p-6">
          <div className="mb-1 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">รูปภาพสินค้า</h3>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              Images
            </span>
          </div>
          <div className="product-form-images-layout grid grid-cols-1 gap-4 md:grid-cols-[1fr_260px]">
            <div>
              <Field label="Product Images / รูปสินค้า" hint="อัปโหลดได้หลายรูป สูงสุด 5MB ต่อไฟล์">
                <ProductImagesUploader productId={productId} onUploaded={handleUploaded} />
              </Field>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                Cover Preview
              </p>
              {previewCover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewCover}
                  alt="Cover preview"
                  className="h-44 w-full rounded-xl object-cover shadow-sm"
                />
              ) : (
                <div className="flex h-44 items-center justify-center rounded-xl border border-dashed border-slate-300 text-xs text-slate-500">
                  No image selected
                </div>
              )}
            </div>
          </div>

          {images.length > 0 && (
            <ProductImagesGrid
              images={images}
              onReorder={reorderImages}
              onSetPrimary={setAsCover}
              onRemove={removeCurrentImage}
            />
          )}
        </section>

        <div className="product-form-actions sticky bottom-3 z-10 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur md:static md:border-0 md:bg-transparent md:p-0 md:shadow-none">
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => router.push("/admin/products")}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
            >
              ยกเลิก / Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="btn-primary inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {pending
                ? "กำลังบันทึก..."
                : mode === "create"
                  ? "สร้างสินค้า / Create Product"
                  : "บันทึกการแก้ไข / Save Changes"}
            </button>
          </div>
        </div>
      </form>
      {error ? <p className="sr-only">{error}</p> : null}
      <Toast open={Boolean(toast)} type={toast?.type ?? "success"} message={toast?.message ?? ""} onClose={() => setToast(null)} />
    </>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold leading-relaxed text-slate-700">{label}</span>
      {hint ? <p className="-mt-1 mb-2 text-xs text-slate-500">{hint}</p> : null}
      {children}
    </label>
  );
}

const inputClass = "input-base";
const textareaClass = `${inputClass} min-h-28`;
