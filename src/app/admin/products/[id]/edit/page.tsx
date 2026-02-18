import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";

import {
  addProductImages,
  getProductById,
  removeImage,
  setPrimaryImage,
  updateImageSort,
  updateProduct,
} from "../../../../../../lib/db/products";
import { ProductInputSchema } from "../../../../../../lib/validators/product";
import { ProductForm } from "../../../../../components/admin/products/ProductForm";

type EditProductPageProps = {
  params: Promise<{ id: string }>;
};

function toProductPayload(formData: FormData) {
  return ProductInputSchema.parse({
    sku: String(formData.get("sku") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    title_th: String(formData.get("title_th") ?? ""),
    title_en: String(formData.get("title_en") ?? ""),
    title_lo: String(formData.get("title_lo") ?? ""),
    description_th: String(formData.get("description_th") ?? ""),
    description_en: String(formData.get("description_en") ?? ""),
    description_lo: String(formData.get("description_lo") ?? ""),
    price: String(formData.get("price") ?? "0"),
    compare_at_price: String(formData.get("compare_at_price") ?? "0"),
    stock: String(formData.get("stock") ?? "0"),
    status: String(formData.get("status") ?? "active"),
  });
}

function parseImages(formData: FormData) {
  const raw = String(formData.get("images_json") ?? "[]");
  const parsed = JSON.parse(raw) as Array<{
    id?: string;
    url: string;
    sort: number;
    is_primary: boolean;
  }>;

  return parsed.map((image, index) => ({
    ...image,
    sort: Number.isFinite(image.sort) ? image.sort : index,
    is_primary: Boolean(image.is_primary),
  }));
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { id } = await params;
  const product = await getProductById(id);

  if (!product) {
    notFound();
  }

  async function updateAction(formData: FormData) {
    "use server";

    const payload = toProductPayload(formData);
    await updateProduct(id, payload);

    const incoming = parseImages(formData);
    const latest = await getProductById(id);
    const currentImages = latest?.images ?? [];

    const incomingExistingIds = new Set(
      incoming.map((image) => image.id).filter(Boolean) as string[]
    );

    const removedIds = currentImages
      .filter((image) => !incomingExistingIds.has(image.id))
      .map((image) => image.id);
    for (const imageId of removedIds) {
      await removeImage(imageId);
    }

    const newImages = incoming.filter((image) => !image.id);
    let insertedMap = new Map<string, string>();
    if (newImages.length > 0) {
      const inserted = await addProductImages(id, newImages.map((image) => image.url));
      insertedMap = new Map(inserted.map((image) => [image.url, image.id]));
    }

    const finalIds = incoming
      .map((image) => image.id || insertedMap.get(image.url))
      .filter(Boolean) as string[];
    if (finalIds.length > 0) {
      await updateImageSort(id, finalIds);
    }

    const desiredPrimary = incoming.find((image) => image.is_primary);
    const primaryId = desiredPrimary
      ? desiredPrimary.id || insertedMap.get(desiredPrimary.url)
      : finalIds[0];
    if (primaryId) {
      await setPrimaryImage(id, primaryId);
    }

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${id}/edit`);
    redirect("/admin/products");
  }

  async function persistUploadedImagesAction(urls: string[]) {
    "use server";
    const inserted = await addProductImages(id, urls);
    revalidatePath(`/admin/products/${id}/edit`);
    return inserted;
  }

  async function persistSetPrimaryAction(imageId: string) {
    "use server";
    await setPrimaryImage(id, imageId);
    revalidatePath(`/admin/products/${id}/edit`);
  }

  async function persistRemoveImageAction(imageId: string) {
    "use server";
    await removeImage(imageId);
    revalidatePath(`/admin/products/${id}/edit`);
  }

  async function persistReorderAction(orderedIds: string[]) {
    "use server";
    await updateImageSort(id, orderedIds);
    revalidatePath(`/admin/products/${id}/edit`);
  }

  return (
    <div className="space-y-6">
      <header>
        <span className="text-xs uppercase tracking-[0.3em] text-blue-600">Products</span>
        <h1 className="font-heading text-4xl text-slate-900">Edit Product</h1>
        <p className="mt-1 text-sm text-slate-600">แก้ไขข้อมูลสินค้า / Update product details</p>
      </header>

      <div className="sst-card-soft rounded-2xl p-5 md:p-6">
        <ProductForm
          mode="edit"
          productId={id}
          initialProduct={product}
          initialImages={product.images ?? []}
          submitAction={updateAction}
          persistUploadedImages={persistUploadedImagesAction}
          persistSetPrimary={persistSetPrimaryAction}
          persistRemoveImage={persistRemoveImageAction}
          persistReorderImages={persistReorderAction}
        />
      </div>
    </div>
  );
}
