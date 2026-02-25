import { z } from "zod";

export const ProductStatusSchema = z.enum(["active", "inactive"]);

export const ProductInputSchema = z.object({
  sku: z.string().trim().optional(),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Slug must contain lowercase letters, numbers, dashes"),
  title_th: z.string().trim().min(1, "Title TH is required"),
  title_en: z.string().trim().optional(),
  title_lo: z.string().trim().optional(),
  description_th: z.string().trim().optional(),
  description_en: z.string().trim().optional(),
  description_lo: z.string().trim().optional(),
  price: z.coerce.number().min(0, "Price must be >= 0"),
  compare_at_price: z.coerce
    .number()
    .min(0, "Compare price must be >= 0")
    .optional(),
  stock: z.coerce.number().int().min(0, "Stock must be >= 0"),
  status: ProductStatusSchema,
});

export const ImageInputSchema = z.object({
  url: z.string().trim().url("Image URL must be valid"),
  sort: z.coerce.number().int().min(0, "Sort must be >= 0"),
  is_primary: z.boolean(),
});

export const ListProductsFilterSchema = z.object({
  q: z.string().trim().optional(),
  status: ProductStatusSchema.optional(),
  featuredOnly: z.boolean().optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export const ProductImageInputSchema = ImageInputSchema;
