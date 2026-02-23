import "server-only";

import { z } from "zod";

import { getPaymentSettings } from "./payment-settings";
import { getSupabaseServiceRoleClient } from "../supabase/service";
import { CustomerOrderCreateInput } from "../types/commerce";

const PublicProductSchema = z.object({
  id: z.string().uuid(),
  sku: z.string(),
  slug: z.string(),
  title_th: z.string(),
  title_en: z.string().nullable().optional(),
  title_lo: z.string().nullable().optional(),
  description_th: z.string().nullable().optional(),
  description_en: z.string().nullable().optional(),
  description_lo: z.string().nullable().optional(),
  price: z.coerce.number().min(0),
  stock: z.coerce.number().int().min(0),
  status: z.enum(["active", "inactive"]),
  created_at: z.string().nullable().optional(),
});

const CustomerOrderInputSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        qty: z.coerce.number().int().min(1).max(999),
      }),
    )
    .min(1)
    .max(100),
  couponCode: z.string().trim().max(64).optional(),
  note: z.string().trim().max(500).optional(),
});

export class CommerceApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "CommerceApiError";
    this.status = status;
    this.code = code;
  }
}

function uniq<T>(values: T[]) {
  return [...new Set(values)];
}

function buildOrderNo() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${y}${m}${d}-${rand}`;
}

function formatPromptpayAmount(amount: number) {
  const fixed = amount.toFixed(2);
  if (fixed.endsWith(".00")) {
    return String(Math.round(amount));
  }
  return fixed.replace(/0+$/, "").replace(/\.$/, "");
}

async function ensureCustomerProfile(customerId: string) {
  const supabase = getSupabaseServiceRoleClient();
  const { error } = await supabase
    .from("customer_profiles")
    .upsert({ id: customerId }, { onConflict: "id" });

  if (error) {
    throw new CommerceApiError(500, "CUSTOMER_PROFILE_FAILED", error.message);
  }
}

export async function listPublicProducts(input?: { q?: string; page?: number; pageSize?: number }) {
  const page = Math.max(1, input?.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, input?.pageSize ?? 20));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = getSupabaseServiceRoleClient();
  let query = supabase
    .from("products")
    .select(
      "id,sku,slug,title_th,title_en,title_lo,description_th,description_en,description_lo,price,stock,status,created_at",
      { count: "planned" },
    )
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .range(from, to);

  const q = input?.q?.trim();
  if (q) {
    query = query.or(`slug.ilike.%${q}%,sku.ilike.%${q}%,title_th.ilike.%${q}%,title_en.ilike.%${q}%`);
  }

  const { data, error, count } = await query;
  if (error) {
    throw new CommerceApiError(500, "PRODUCTS_FETCH_FAILED", error.message);
  }

  const items = (data ?? []).map((row) => PublicProductSchema.parse(row));
  return {
    items,
    total: count ?? 0,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil((count ?? 0) / pageSize)),
  };
}

export async function getPublicProductBySlug(slug: string) {
  const normalized = slug.trim().toLowerCase();
  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("products")
    .select("id,sku,slug,title_th,title_en,title_lo,description_th,description_en,description_lo,price,stock,status,created_at")
    .eq("slug", normalized)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    throw new CommerceApiError(500, "PRODUCT_FETCH_FAILED", error.message);
  }
  if (!data) {
    return null;
  }
  return PublicProductSchema.parse(data);
}

export async function listCustomerOrders(customerId: string) {
  const supabase = getSupabaseServiceRoleClient();
  const { data: orderRows, error } = await supabase
    .from("orders")
    .select("id,order_no,status,payment_status,payment_method,sub_total,discount_total,shipping_fee,grand_total,created_at")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw new CommerceApiError(500, "ORDERS_FETCH_FAILED", error.message);
  }

  return orderRows ?? [];
}

export async function createCustomerOrder(customerId: string, input: CustomerOrderCreateInput) {
  const parsed = CustomerOrderInputSchema.parse(input);
  await ensureCustomerProfile(customerId);

  const productIds = uniq(parsed.items.map((item) => item.productId));
  const supabase = getSupabaseServiceRoleClient();
  const { data: productRows, error: productsError } = await supabase
    .from("products")
    .select("id,sku,title_th,price,stock,status")
    .in("id", productIds);

  if (productsError) {
    throw new CommerceApiError(500, "PRODUCTS_FETCH_FAILED", productsError.message);
  }

  const products = new Map(
    (productRows ?? []).map((row) => [String(row.id), row as Record<string, unknown>]),
  );

  for (const id of productIds) {
    if (!products.has(id)) {
      throw new CommerceApiError(404, "PRODUCT_NOT_FOUND", `Product not found: ${id}`);
    }
  }

  const orderItems = parsed.items.map((item) => {
    const row = products.get(item.productId)!;
    const status = String(row.status ?? "inactive");
    const stock = Number(row.stock ?? 0);
    const unitPrice = Number(row.price ?? 0);
    if (status !== "active") {
      throw new CommerceApiError(400, "PRODUCT_INACTIVE", `Product inactive: ${item.productId}`);
    }
    if (item.qty > stock) {
      throw new CommerceApiError(409, "INSUFFICIENT_STOCK", `Insufficient stock: ${item.productId}`);
    }
    return {
      productId: item.productId,
      skuSnapshot: String(row.sku ?? ""),
      nameSnapshot: String(row.title_th ?? ""),
      unitPrice,
      qty: item.qty,
      lineTotal: Number((unitPrice * item.qty).toFixed(2)),
    };
  });

  const subTotal = Number(orderItems.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2));
  const discountTotal = 0;
  const shippingFee = 0;
  const grandTotal = Number((subTotal - discountTotal + shippingFee).toFixed(2));

  const paymentSettings = await getPaymentSettings();
  const promptpayPhone = paymentSettings.promptpayPhone.trim();
  if (!promptpayPhone) {
    throw new CommerceApiError(500, "PAYMENT_CONFIG_MISSING", "PromptPay phone is not configured.");
  }

  const base = paymentSettings.promptpayBaseUrl.replace(/\/+$/, "");
  const amount = formatPromptpayAmount(grandTotal);
  const promptpayLink = `${base}/${encodeURIComponent(promptpayPhone)}/${encodeURIComponent(amount)}`;

  const orderNo = buildOrderNo();
  const orderPayload = {
    order_no: orderNo,
    customer_id: customerId,
    status: "pending_payment",
    payment_status: "unpaid",
    payment_method: "promptpay_transfer",
    sub_total: subTotal,
    discount_total: discountTotal,
    shipping_fee: shippingFee,
    grand_total: grandTotal,
    coupon_code_snapshot: parsed.couponCode ?? null,
    promptpay_phone_snapshot: promptpayPhone,
    promptpay_link_snapshot: promptpayLink,
    note: parsed.note ?? null,
  };

  const { data: orderRow, error: orderError } = await supabase
    .from("orders")
    .insert(orderPayload)
    .select("id,order_no,grand_total,promptpay_link_snapshot,promptpay_phone_snapshot")
    .single();

  if (orderError || !orderRow) {
    throw new CommerceApiError(500, "ORDER_CREATE_FAILED", orderError?.message ?? "Unknown error");
  }

  const orderId = String(orderRow.id);
  const itemPayload = orderItems.map((item) => ({
    order_id: orderId,
    product_id: item.productId,
    sku_snapshot: item.skuSnapshot,
    name_snapshot: item.nameSnapshot,
    unit_price_snapshot: item.unitPrice,
    qty: item.qty,
    line_total: item.lineTotal,
  }));

  const { error: itemError } = await supabase.from("order_items").insert(itemPayload);
  if (itemError) {
    await supabase.from("orders").delete().eq("id", orderId);
    throw new CommerceApiError(500, "ORDER_ITEMS_CREATE_FAILED", itemError.message);
  }

  return {
    orderId,
    orderNo: String(orderRow.order_no),
    payment: {
      method: "promptpay_transfer" as const,
      phone: String(orderRow.promptpay_phone_snapshot),
      amount: Number(orderRow.grand_total),
      link: String(orderRow.promptpay_link_snapshot),
    },
  };
}
