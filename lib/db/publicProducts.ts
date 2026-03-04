import "server-only";

import { z } from "zod";

import { getSupabaseServiceRoleClient } from "../supabase/service";

const PublicProductRowSchema = z.object({
  id: z.string().uuid(),
  sku: z.string(),
  slug: z.string(),
  category: z.string().nullable().optional(),
  category_name: z.string().nullable().optional(),
  title_th: z.string(),
  title_en: z.string().nullable().optional(),
  title_lo: z.string().nullable().optional(),
  description_th: z.string().nullable().optional(),
  description_en: z.string().nullable().optional(),
  description_lo: z.string().nullable().optional(),
  price: z.coerce.number(),
  stock: z.coerce.number().int(),
  status: z.enum(["active", "inactive"]),
  is_featured: z.boolean().optional(),
  sort_order: z.coerce.number().int().nullable().optional(),
  created_at: z.string().nullable().optional(),
});

const ProductImageRowSchema = z.object({
  id: z.string().uuid(),
  product_id: z.string().uuid(),
  url: z.string().url(),
  sort: z.coerce.number().int(),
  is_primary: z.boolean(),
});

export type PublicProduct = z.infer<typeof PublicProductRowSchema> & {
  cover_url: string | null;
  images: Array<{
    id: string;
    url: string;
  }>;
};

export type PublicProductDetail = z.infer<typeof PublicProductRowSchema> & {
  images: Array<z.infer<typeof ProductImageRowSchema>>;
  cover_url: string | null;
};

export type PublicPricingProduct = z.infer<typeof PublicProductRowSchema>;

export class PublicProductsError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "PublicProductsError";
    this.code = code;
  }
}

function asErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: string }).message ?? fallback);
  }
  return fallback;
}

function isMissingSortOrderColumn(error: unknown) {
  const message = asErrorMessage(error, "").toLowerCase();
  return message.includes("sort_order") && message.includes("column");
}

export async function listPublicProducts(input?: {
  q?: string;
  category?: string;
  featuredOnly?: boolean;
  includeTotal?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<{
  items: PublicProduct[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const supabase = getSupabaseServiceRoleClient();
  const q = input?.q?.trim();
  const page = Math.max(1, input?.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, input?.pageSize ?? 20));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // category is reserved for upcoming category schema.
  void input?.category;
  const featuredOnly = Boolean(input?.featuredOnly);
  const includeTotal = input?.includeTotal ?? true;

  let query = supabase
    .from("products")
    .select(
      "id,sku,slug,title_th,title_en,title_lo,description_th,description_en,description_lo,price,stock,status,is_featured,sort_order,created_at",
      includeTotal ? { count: "planned" } : undefined,
    )
    .eq("status", "active")
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (q) {
    query = query.or(`slug.ilike.%${q}%,sku.ilike.%${q}%,title_th.ilike.%${q}%,title_en.ilike.%${q}%`);
  }
  if (featuredOnly) {
    query = query.eq("is_featured", true);
  }

  const queryResult = await query;
  let data = queryResult.data as unknown[] | null;
  let error = queryResult.error;
  let count = includeTotal ? queryResult.count : null;

  if (error && isMissingSortOrderColumn(error)) {
    let fallbackQuery = supabase
      .from("products")
      .select(
        "id,sku,slug,title_th,title_en,title_lo,description_th,description_en,description_lo,price,stock,status,is_featured,created_at",
        includeTotal ? { count: "planned" } : undefined,
      )
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (q) {
      fallbackQuery = fallbackQuery.or(`slug.ilike.%${q}%,sku.ilike.%${q}%,title_th.ilike.%${q}%,title_en.ilike.%${q}%`);
    }
    if (featuredOnly) {
      fallbackQuery = fallbackQuery.eq("is_featured", true);
    }

    const fallback = await fallbackQuery;
    data = fallback.data as unknown[] | null;
    error = fallback.error;
    count = includeTotal ? fallback.count : null;
  }

  if (error) {
    throw new PublicProductsError("PRODUCTS_FETCH_FAILED", asErrorMessage(error, "Failed to fetch products"));
  }

  const rows = (data ?? []).map((row) => PublicProductRowSchema.parse(row));
  const productIds = rows.map((row) => row.id);

  const imagesByProductId = new Map<string, Array<z.infer<typeof ProductImageRowSchema>>>();
  if (productIds.length > 0) {
    const { data: imageRows, error: imageError } = await supabase
      .from("product_images")
      .select("id,product_id,url,sort,is_primary")
      .in("product_id", productIds)
      .order("product_id", { ascending: true })
      .order("sort", { ascending: true });

    if (imageError) {
      throw new PublicProductsError("PRODUCT_IMAGES_FETCH_FAILED", asErrorMessage(imageError, "Failed to fetch images"));
    }

    for (const row of imageRows ?? []) {
      const parsed = ProductImageRowSchema.parse(row);
      const current = imagesByProductId.get(parsed.product_id) ?? [];
      current.push(parsed);
      imagesByProductId.set(parsed.product_id, current);
    }
  }

  const items = rows.map((row) => ({
    ...row,
    cover_url:
      (imagesByProductId.get(row.id) ?? []).find((image) => image.is_primary)?.url ??
      imagesByProductId.get(row.id)?.[0]?.url ??
      null,
    images: (imagesByProductId.get(row.id) ?? []).map((image) => ({
      id: image.id,
      url: image.url,
    })),
  }));

  const total = count ?? items.length;
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getPublicProductBySlug(slug: string): Promise<PublicProductDetail | null> {
  const supabase = getSupabaseServiceRoleClient();
  const normalizedSlug = slug.trim().toLowerCase();
  if (!normalizedSlug) {
    return null;
  }

  const { data: productRow, error: productError } = await supabase
    .from("products")
    .select(
      "id,sku,slug,title_th,title_en,title_lo,description_th,description_en,description_lo,price,stock,status,is_featured,sort_order,created_at",
    )
    .eq("slug", normalizedSlug)
    .eq("status", "active")
    .maybeSingle();

  if (productError) {
    throw new PublicProductsError("PRODUCT_FETCH_FAILED", asErrorMessage(productError, "Failed to fetch product"));
  }
  if (!productRow) {
    return null;
  }

  const product = PublicProductRowSchema.parse(productRow);
  const { data: imageRows, error: imageError } = await supabase
    .from("product_images")
    .select("id,product_id,url,sort,is_primary")
    .eq("product_id", product.id)
    .order("sort", { ascending: true });

  if (imageError) {
    throw new PublicProductsError("PRODUCT_IMAGES_FETCH_FAILED", asErrorMessage(imageError, "Failed to fetch product images"));
  }

  const images = (imageRows ?? []).map((row) => ProductImageRowSchema.parse(row));
  const primary = images.find((image) => image.is_primary) ?? images[0] ?? null;

  return {
    ...product,
    images,
    cover_url: primary?.url ?? null,
  };
}

export async function listPublicPricingProducts(): Promise<PublicPricingProduct[]> {
  const supabase = getSupabaseServiceRoleClient();
  const result = await supabase
    .from("products")
    .select("id,sku,slug,title_th,title_en,title_lo,price,stock,status,is_featured,sort_order,created_at")
    .eq("status", "active")
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  let data: unknown[] | null = result.data as unknown[] | null;
  let error = result.error;
  if (error && isMissingSortOrderColumn(error)) {
    const fallback = await supabase
      .from("products")
      .select("id,sku,slug,title_th,title_en,title_lo,price,stock,status,is_featured,created_at")
      .eq("status", "active")
      .order("created_at", { ascending: false });
    data = fallback.data as unknown[] | null;
    error = fallback.error;
  }

  if (error) {
    throw new PublicProductsError("PRODUCTS_FETCH_FAILED", asErrorMessage(error, "Failed to fetch pricing products"));
  }

  return (data ?? []).map((row) => PublicProductRowSchema.parse(row));
}
