import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  addProductImages,
  createProduct,
  setPrimaryImage,
  updateImageSort,
} from "../../../../../lib/db/products";
import { ProductInputSchema } from "../../../../../lib/validators/product";
import { ProductForm } from "../../../../components/admin/products/ProductForm";

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

export default function NewProductPage() {
  async function createAction(formData: FormData) {
    "use server";

    const payload = toProductPayload(formData);
    const productId = await createProduct(payload);
    const images = parseImages(formData);

    if (images.length > 0) {
      const inserted = await addProductImages(productId, images.map((image) => image.url));

      const orderedIds = inserted.sort((a, b) => a.sort - b.sort).map((image) => image.id);
      if (orderedIds.length > 0) {
        await updateImageSort(productId, orderedIds);
      }

      const wantedPrimary = images.find((image) => image.is_primary);
      if (wantedPrimary) {
        const primaryIndex = images.findIndex((image) => image.is_primary);
        const primary = inserted[primaryIndex];
        if (primary?.id) {
          await setPrimaryImage(productId, primary.id);
        }
      }
    }

    revalidatePath("/admin/products");
    redirect("/admin/products");
  }

  return (
    <div className="space-y-6">
      <header>
        <span className="text-xs uppercase tracking-[0.3em] text-blue-600">Products</span>
        <h1 className="font-heading text-4xl text-slate-900">Add Product</h1>
        <p className="mt-1 text-sm text-slate-600">เพิ่มสินค้าใหม่ / Create a new product</p>
      </header>

      <div className="sst-card-soft rounded-2xl p-5 md:p-6">
        <ProductForm mode="create" submitAction={createAction} />
      </div>
    </div>
  );
}
