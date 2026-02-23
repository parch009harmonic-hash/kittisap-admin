import { z } from "zod";

import { supabase } from "../supabase/client";

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

function isMissingCategoryColumnError(error: unknown) {
  const message = asErrorMessage(error, "").toLowerCase();
  return message.includes("category") && message.includes("column");
}

export async function listPublicProducts(input?: {
  q?: string;
  category?: string;
  page?: number;
  pageSize?: number;
}): Promise<{
  items: PublicProduct[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const q = input?.q?.trim();
  const page = Math.max(1, input?.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, input?.pageSize ?? 20));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // category is reserved for upcoming category schema.
  void input?.category;

  let query = supabase
    .from("products")
    .select(
      "id,sku,slug,category,category_name,title_th,title_en,title_lo,description_th,description_en,description_lo,price,stock,status,created_at",
      { count: "planned" },
    )
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .range(from, to);

  if (q) {
    query = query.or(`slug.ilike.%${q}%,sku.ilike.%${q}%,title_th.ilike.%${q}%,title_en.ilike.%${q}%`);
  }

  const queryResult = await query;
  let data: unknown[] | null = queryResult.data as unknown[] | null;
  let error = queryResult.error;
  let count = queryResult.count;
  if (error) {
    if (isMissingCategoryColumnError(error)) {
      let fallback = supabase
        .from("products")
        .select(
          "id,sku,slug,title_th,title_en,title_lo,description_th,description_en,description_lo,price,stock,status,created_at",
          { count: "planned" },
        )
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .range(from, to);

      if (q) {
        fallback = fallback.or(`slug.ilike.%${q}%,sku.ilike.%${q}%,title_th.ilike.%${q}%,title_en.ilike.%${q}%`);
      }

      const fallbackResult = await fallback;
      data = fallbackResult.data as unknown[] | null;
      error = fallbackResult.error;
      count = fallbackResult.count;
    }
  }

  if (error) {
    throw new PublicProductsError("PRODUCTS_FETCH_FAILED", asErrorMessage(error, "Failed to fetch products"));
  }

  const rows = (data ?? []).map((row) => PublicProductRowSchema.parse(row));
  const productIds = rows.map((row) => row.id);

  let coverByProductId = new Map<string, string>();
  if (productIds.length > 0) {
    const { data: imageRows, error: imageError } = await supabase
      .from("product_images")
      .select("id,product_id,url,sort,is_primary")
      .in("product_id", productIds)
      .eq("is_primary", true);

    if (imageError) {
      throw new PublicProductsError("PRODUCT_IMAGES_FETCH_FAILED", asErrorMessage(imageError, "Failed to fetch images"));
    }

    coverByProductId = new Map(
      (imageRows ?? []).map((row) => {
        const parsed = ProductImageRowSchema.parse(row);
        return [parsed.product_id, parsed.url];
      }),
    );
  }

  const items = rows.map((row) => ({
    ...row,
    cover_url: coverByProductId.get(row.id) ?? null,
  }));

  const total = count ?? 0;
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getPublicProductBySlug(slug: string): Promise<PublicProductDetail | null> {
  const normalizedSlug = slug.trim().toLowerCase();
  if (!normalizedSlug) {
    return null;
  }

  const { data: productRow, error: productError } = await supabase
    .from("products")
    .select(
      "id,sku,slug,category,category_name,title_th,title_en,title_lo,description_th,description_en,description_lo,price,stock,status,created_at",
    )
    .eq("slug", normalizedSlug)
    .eq("status", "active")
    .maybeSingle();

  if (productError) {
    if (isMissingCategoryColumnError(productError)) {
      const fallback = await supabase
        .from("products")
        .select(
          "id,sku,slug,title_th,title_en,title_lo,description_th,description_en,description_lo,price,stock,status,created_at",
        )
        .eq("slug", normalizedSlug)
        .eq("status", "active")
        .maybeSingle();

      if (fallback.error) {
        throw new PublicProductsError("PRODUCT_FETCH_FAILED", asErrorMessage(fallback.error, "Failed to fetch product"));
      }
      if (!fallback.data) {
        return null;
      }

      const product = PublicProductRowSchema.parse(fallback.data);
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
  const withCategoryColumns = await supabase
    .from("products")
    .select("id,sku,slug,category,category_name,title_th,title_en,title_lo,price,stock,status,created_at")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  let data: unknown[] | null = withCategoryColumns.data as unknown[] | null;
  let error = withCategoryColumns.error;

  if (error && isMissingCategoryColumnError(error)) {
    const fallback = await supabase
      .from("products")
      .select("id,sku,slug,title_th,title_en,title_lo,price,stock,status,created_at")
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
