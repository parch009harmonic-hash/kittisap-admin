import "server-only";

import { ZodError, z } from "zod";

import { requireAdmin } from "../auth/admin";
import { getSupabaseServiceRoleClient } from "../supabase/service";
import { Product, ProductImage, ProductStatus } from "../types/product";
import { ImageInputSchema, ListProductsFilterSchema, ProductInputSchema } from "../validators/product";

const ProductImageRowSchema = ImageInputSchema.extend({
  id: z.string().uuid(),
  product_id: z.string().uuid(),
  created_at: z.string().nullable().optional(),
});

const ProductRowSchema = ProductInputSchema.extend({
  id: z.string().uuid(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

const PRODUCT_SELECT_COLUMNS =
  "id,sku,slug,title_th,title_en,title_lo,description_th,description_en,description_lo,price,compare_at_price,stock,status,created_at";

function buildSku() {
  const now = new Date();
  const y = String(now.getFullYear()).slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `KS-${y}${m}${d}-${random}`;
}

async function generateUniqueSku(supabase: Awaited<ReturnType<typeof adminWriteClient>>) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const sku = buildSku();
    const { data, error } = await supabase
      .from("products")
      .select("id")
      .eq("sku", sku)
      .maybeSingle();

    if (!error && !data) {
      return sku;
    }
  }

  return `KS-${Date.now()}`;
}

function errorText(error: unknown, fallback: string) {
  if (error instanceof ZodError) {
    return error.issues.map((issue) => issue.message).join(", ");
  }
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message || fallback);
  }
  return fallback;
}

function isMissingColumnError(error: unknown) {
  const message = errorText(error, "").toLowerCase();
  return message.includes("does not exist") && message.includes("column");
}

function mapImage(row: Record<string, unknown>): ProductImage {
  const parsed = ProductImageRowSchema.parse({
    ...row,
    sort: Number(row.sort ?? 0),
  });

  return {
    id: parsed.id,
    product_id: parsed.product_id,
    url: parsed.url,
    sort: parsed.sort,
    is_primary: parsed.is_primary,
    created_at: parsed.created_at ?? null,
  };
}

function mapProduct(row: Record<string, unknown>, images: ProductImage[] = []): Product {
  const parsed = ProductRowSchema.parse({
    ...row,
    price: Number(row.price ?? 0),
    compare_at_price:
      row.compare_at_price === null || row.compare_at_price === undefined
        ? undefined
        : Number(row.compare_at_price),
    stock: Number(row.stock ?? 0),
  });

  const sorted = [...images].sort((a, b) => a.sort - b.sort);
  const primary = sorted.find((item) => item.is_primary) ?? sorted[0] ?? null;

  return {
    id: parsed.id,
    sku: parsed.sku,
    slug: parsed.slug,
    title_th: parsed.title_th,
    title_en: parsed.title_en,
    title_lo: parsed.title_lo,
    description_th: parsed.description_th,
    description_en: parsed.description_en,
    description_lo: parsed.description_lo,
    price: parsed.price,
    compare_at_price: parsed.compare_at_price,
    stock: parsed.stock,
    status: parsed.status as ProductStatus,
    created_at: parsed.created_at ?? null,
    updated_at: parsed.updated_at ?? null,
    primary_image: primary,
    cover_url: primary?.url ?? null,
    images: sorted,
  };
}

async function adminReadClient() {
  await requireAdmin();
  return getSupabaseServiceRoleClient();
}

async function adminWriteClient() {
  await requireAdmin();
  return getSupabaseServiceRoleClient();
}

export async function listProducts(input: {
  q?: string;
  status?: ProductStatus;
  page?: number;
  pageSize?: number;
} = {}) {
  const filters = ListProductsFilterSchema.parse(input);
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await adminReadClient();
  let query = supabase
    .from("products")
    .select(PRODUCT_SELECT_COLUMNS, { count: "planned" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.q) {
    query = query.or(
      `slug.ilike.%${filters.q}%,sku.ilike.%${filters.q}%,title_th.ilike.%${filters.q}%`
    );
  }
  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  let { data, error, count } = await query;
  if (error && isMissingColumnError(error)) {
    let fallbackQuery = supabase
      .from("products")
      .select("*", { count: "planned" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (filters.q) {
      fallbackQuery = fallbackQuery.or(
        `slug.ilike.%${filters.q}%,sku.ilike.%${filters.q}%,title_th.ilike.%${filters.q}%`
      );
    }
    if (filters.status) {
      fallbackQuery = fallbackQuery.eq("status", filters.status);
    }

    const fallback = await fallbackQuery;
    data = fallback.data;
    error = fallback.error;
    count = fallback.count;
  }
  if (error) {
    throw new Error(`Failed to list products: ${errorText(error, "Unknown error")}`);
  }

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const ids = rows.map((row) => String(row.id));

  let primaryByProduct = new Map<string, ProductImage>();
  if (ids.length > 0) {
    const { data: primaryRows, error: primaryError } = await supabase
      .from("product_images")
      .select("id,product_id,url,sort,is_primary,created_at")
      .in("product_id", ids)
      .eq("is_primary", true);

    if (primaryError) {
      throw new Error(
        `Failed to load product cover images: ${errorText(primaryError, "Unknown error")}`
      );
    }

    primaryByProduct = new Map(
      (primaryRows ?? []).map((row) => {
        const mapped = mapImage(row as Record<string, unknown>);
        return [mapped.product_id, mapped];
      })
    );
  }

  const items = rows.map((row) => {
    const id = String(row.id);
    const primary = primaryByProduct.get(id);
    return mapProduct(row, primary ? [primary] : []);
  });

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return { items, total, page, pageSize, totalPages };
}

export async function getProductById(id: string) {
  const supabase = await adminReadClient();
  let { data: productRow, error: productError } = await supabase
    .from("products")
    .select(PRODUCT_SELECT_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (productError && isMissingColumnError(productError)) {
    const fallback = await supabase.from("products").select("*").eq("id", id).maybeSingle();
    productRow = fallback.data;
    productError = fallback.error;
  }

  if (productError) {
    throw new Error(`Failed to get product: ${errorText(productError, "Unknown error")}`);
  }
  if (!productRow) {
    return null;
  }

  const { data: imageRows, error: imageError } = await supabase
    .from("product_images")
    .select("id,product_id,url,sort,is_primary,created_at")
    .eq("product_id", id)
    .order("sort", { ascending: true });

  if (imageError) {
    throw new Error(`Failed to get product images: ${errorText(imageError, "Unknown error")}`);
  }

  const images = (imageRows ?? []).map((row) => mapImage(row as Record<string, unknown>));
  return mapProduct(productRow as Record<string, unknown>, images);
}

export async function createProduct(data: unknown) {
  const supabase = await adminWriteClient();
  const parsed = ProductInputSchema.parse(data);
  const normalizedSku = parsed.sku?.trim();
  const payload = {
    ...parsed,
    sku: normalizedSku || (await generateUniqueSku(supabase)),
  };

  const { data: row, error } = await supabase.from("products").insert(payload).select("id").single();
  if (error || !row?.id) {
    throw new Error(`Failed to create product: ${errorText(error, "Unknown error")}`);
  }
  return String(row.id);
}

export async function updateProduct(id: string, data: unknown) {
  const supabase = await adminWriteClient();
  const parsed = ProductInputSchema.parse(data);
  const normalizedSku = parsed.sku?.trim();
  const payload: Record<string, unknown> = {
    ...parsed,
  };
  if (normalizedSku) {
    payload.sku = normalizedSku;
  } else {
    delete payload.sku;
  }

  const { error } = await supabase.from("products").update(payload).eq("id", id);
  if (error) {
    const message = errorText(error, "Unknown error");
    if (message.includes(`record "new" has no field "updated_at"`)) {
      throw new Error(
        "Database schema is missing products.updated_at. Please run sql/ensure-product-storage-and-columns.sql"
      );
    }
    throw new Error(`Failed to update product: ${errorText(error, "Unknown error")}`);
  }
}

export async function deleteProduct(id: string) {
  const supabase = await adminWriteClient();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) {
    throw new Error(`Failed to delete product: ${errorText(error, "Unknown error")}`);
  }
}

export async function addProductImages(productId: string, urls: string[]) {
  if (urls.length === 0) {
    return [] as ProductImage[];
  }

  const normalizedUrls = urls.map((url) => ImageInputSchema.shape.url.parse(url));
  const supabase = await adminWriteClient();

  const { data: existingRows, error: existingError } = await supabase
    .from("product_images")
    .select("id,product_id,url,sort,is_primary,created_at")
    .eq("product_id", productId)
    .order("sort", { ascending: true });

  if (existingError) {
    throw new Error(`Failed to read existing images: ${errorText(existingError, "Unknown error")}`);
  }

  const existing = (existingRows ?? []).map((row) => mapImage(row as Record<string, unknown>));
  const hasPrimary = existing.some((image) => image.is_primary);
  const startSort = existing.length;

  const payload = normalizedUrls.map((url, index) => ({
    product_id: productId,
    url,
    sort: startSort + index,
    is_primary: !hasPrimary && index === 0,
  }));

  const { data, error } = await supabase
    .from("product_images")
    .insert(payload)
    .select("id,product_id,url,sort,is_primary,created_at");

  if (error) {
    throw new Error(`Failed to add product images: ${errorText(error, "Unknown error")}`);
  }

  return (data ?? []).map((row) => mapImage(row as Record<string, unknown>));
}

export async function setPrimaryImage(productId: string, imageId: string) {
  const supabase = await adminWriteClient();

  const { error: resetError } = await supabase
    .from("product_images")
    .update({ is_primary: false })
    .eq("product_id", productId);
  if (resetError) {
    throw new Error(`Failed to reset primary image: ${errorText(resetError, "Unknown error")}`);
  }

  const { error: setError } = await supabase
    .from("product_images")
    .update({ is_primary: true })
    .eq("id", imageId)
    .eq("product_id", productId);
  if (setError) {
    throw new Error(`Failed to set primary image: ${errorText(setError, "Unknown error")}`);
  }
}

export async function updateImageSort(productId: string, orderedIds: string[]) {
  const supabase = await adminWriteClient();

  for (let index = 0; index < orderedIds.length; index += 1) {
    const id = orderedIds[index];
    const { error } = await supabase
      .from("product_images")
      .update({ sort: index })
      .eq("id", id)
      .eq("product_id", productId);

    if (error) {
      throw new Error(`Failed to update image sort: ${errorText(error, "Unknown error")}`);
    }
  }
}

export async function removeImage(imageId: string) {
  const supabase = await adminWriteClient();

  const { data: target, error: targetError } = await supabase
    .from("product_images")
    .select("id,product_id,is_primary")
    .eq("id", imageId)
    .maybeSingle();

  if (targetError) {
    throw new Error(`Failed to find image: ${errorText(targetError, "Unknown error")}`);
  }
  if (!target) {
    return;
  }

  const productId = String(target.product_id);
  const wasPrimary = target.is_primary === true;

  const { error: deleteError } = await supabase.from("product_images").delete().eq("id", imageId);
  if (deleteError) {
    throw new Error(`Failed to remove image: ${errorText(deleteError, "Unknown error")}`);
  }

  if (!wasPrimary) {
    return;
  }

  const { data: remainingRows, error: remainingError } = await supabase
    .from("product_images")
    .select("id")
    .eq("product_id", productId)
    .order("sort", { ascending: true })
    .limit(1);

  if (remainingError) {
    throw new Error(`Failed to repair primary image: ${errorText(remainingError, "Unknown error")}`);
  }

  const next = remainingRows?.[0];
  if (next?.id) {
    await setPrimaryImage(productId, String(next.id));
  }
}

