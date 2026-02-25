import { z } from "zod";

import {
  ImageInputSchema,
  ProductInputSchema,
  ProductStatusSchema,
} from "../validators/product";

export type ProductInput = z.infer<typeof ProductInputSchema>;
export type ProductStatus = z.infer<typeof ProductStatusSchema>;
export type ProductImageInput = z.infer<typeof ImageInputSchema>;

export type ProductImage = ProductImageInput & {
  id: string;
  product_id: string;
  created_at: string | null;
};

export type Product = ProductInput & {
  id: string;
  created_at: string | null;
  updated_at: string | null;
  is_featured: boolean;
  cover_url?: string | null;
  primary_image: ProductImage | null;
  images?: ProductImage[];
};
