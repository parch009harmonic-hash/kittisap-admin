import "server-only";

import { z } from "zod";

import { requireCustomerApi } from "../auth/customer";
import { getPaymentSettings } from "./payment-settings";
import { getSupabaseServerClient } from "../supabase/server";
import { getSupabaseServiceRoleClient } from "../supabase/service";
import { validatePublicCoupon } from "./public-coupons";

const DEFAULT_PROMPTPAY_BASE_URL = "https://promptpay.io";

const PublicOrderCreateSchema = z.object({
  items: z
    .array(
      z.object({
        product_id: z.string().uuid(),
        qty: z.coerce.number().int().min(1).max(999),
      }),
    )
    .min(1)
    .max(100),
  customer: z.object({
    full_name: z.string().trim().min(1).max(120),
    phone: z.string().trim().min(6).max(32),
    email: z.string().trim().email().optional(),
    note: z.string().trim().max(500).optional(),
  }),
  coupon: z.string().trim().max(64).optional(),
  use_points: z.boolean().optional(),
});

export type PublicOrderCreateInput = z.infer<typeof PublicOrderCreateSchema>;

export class PublicOrderError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "PublicOrderError";
    this.status = status;
    this.code = code;
  }
}

type PreparedLineItem = {
  productId: string;
  skuSnapshot: string;
  nameSnapshot: string;
  unitPrice: number;
  qty: number;
  lineTotal: number;
};

function uniq<T>(values: T[]) {
  return [...new Set(values)];
}

function buildOrderNo() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${y}${m}${d}${h}${mi}-${rand}`;
}

function formatPromptpayAmount(amount: number) {
  const fixed = amount.toFixed(2);
  if (fixed.endsWith(".00")) {
    return String(Math.round(amount));
  }
  return fixed.replace(/0+$/, "").replace(/\.$/, "");
}

type DbClient = Awaited<ReturnType<typeof getSupabaseServerClient>>;

function isMissingRpcFunctionError(error: unknown, fnName: string) {
  const message = String((error as { message?: string } | null)?.message ?? error ?? "").toLowerCase();
  return message.includes("could not find the function") && message.includes(`public.${fnName}`.toLowerCase());
}

async function reserveStock(supabase: DbClient, productId: string, qty: number) {
  const { data, error } = await supabase.rpc("reserve_product_stock", {
    p_product_id: productId,
    p_qty: qty,
  });

  if (error) {
    if (isMissingRpcFunctionError(error, "reserve_product_stock")) {
      // Fallback when DB function is not deployed / schema cache is stale.
      // Stock was already validated earlier in request flow.
      return;
    }
    throw new PublicOrderError(500, "STOCK_RESERVE_FAILED", error.message);
  }

  if (!data) {
    throw new PublicOrderError(409, "INSUFFICIENT_STOCK", `Insufficient stock: ${productId}`);
  }
}

async function releaseStock(supabase: DbClient, productId: string, qty: number) {
  const { error } = await supabase.rpc("release_product_stock", {
    p_product_id: productId,
    p_qty: qty,
  });
  if (error && !isMissingRpcFunctionError(error, "release_product_stock")) {
    throw new PublicOrderError(500, "STOCK_RELEASE_FAILED", error.message);
  }
}

async function ensureCustomerProfile(supabase: DbClient, customerId: string, fullName: string, phone: string) {
  const { error } = await supabase
    .from("customer_profiles")
    .upsert({ id: customerId, full_name: fullName, phone }, { onConflict: "id" });

  if (error) {
    throw new PublicOrderError(500, "CUSTOMER_PROFILE_FAILED", error.message);
  }
}

async function generateUniqueOrderNo(supabase: DbClient) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const no = buildOrderNo();
    const { data, error } = await supabase.from("orders").select("id").eq("order_no", no).maybeSingle();
    if (!error && !data) {
      return no;
    }
  }
  return `${buildOrderNo()}-${Math.floor(Math.random() * 99)}`;
}

async function getPromptpayConfig() {
  try {
    const paymentSettings = await getPaymentSettings();
    return {
      phone: String(paymentSettings.promptpayPhone ?? "").trim(),
      baseUrl: String(paymentSettings.promptpayBaseUrl ?? DEFAULT_PROMPTPAY_BASE_URL).trim() || DEFAULT_PROMPTPAY_BASE_URL,
    };
  } catch {
    return {
      phone: "",
      baseUrl: DEFAULT_PROMPTPAY_BASE_URL,
    };
  }
}

export async function createPublicOrder(input: unknown) {
  const actor = await requireCustomerApi();
  const payload = PublicOrderCreateSchema.parse(input);
  const customerId = actor.user.id;
  const supabase = await getSupabaseServerClient();
  const serviceSupabase = getSupabaseServiceRoleClient();

  await ensureCustomerProfile(supabase, customerId, payload.customer.full_name, payload.customer.phone);

  const productIds = uniq(payload.items.map((item) => item.product_id));

  const { data: productRows, error: productsError } = await serviceSupabase
    .from("products")
    .select("id,sku,title_th,price,stock,status")
    .in("id", productIds);

  if (productsError) {
    throw new PublicOrderError(500, "PRODUCTS_FETCH_FAILED", productsError.message);
  }

  const products = new Map((productRows ?? []).map((row) => [String(row.id), row as Record<string, unknown>]));

  for (const productId of productIds) {
    if (!products.has(productId)) {
      throw new PublicOrderError(404, "PRODUCT_NOT_FOUND", `Product not found: ${productId}`);
    }
  }

  const lines: PreparedLineItem[] = payload.items.map((item) => {
    const row = products.get(item.product_id)!;
    const status = String(row.status ?? "inactive");
    const unitPrice = Number(row.price ?? 0);
    const stock = Number(row.stock ?? 0);

    if (status !== "active") {
      throw new PublicOrderError(400, "PRODUCT_INACTIVE", `Product inactive: ${item.product_id}`);
    }
    if (item.qty > stock) {
      throw new PublicOrderError(409, "INSUFFICIENT_STOCK", `Insufficient stock: ${item.product_id}`);
    }

    const lineTotal = Number((unitPrice * item.qty).toFixed(2));
    return {
      productId: item.product_id,
      skuSnapshot: String(row.sku ?? ""),
      nameSnapshot: String(row.title_th ?? ""),
      unitPrice,
      qty: item.qty,
      lineTotal,
    };
  });

  const subTotal = Number(lines.reduce((sum, line) => sum + line.lineTotal, 0).toFixed(2));

  let couponDiscount = 0;
  let couponCode = "";
  if (payload.coupon) {
    const result = await validatePublicCoupon({ code: payload.coupon, subtotal: subTotal });
    if (!result.valid) {
      throw new PublicOrderError(400, "COUPON_INVALID", result.message);
    }
    couponDiscount = result.discountAmount;
    couponCode = result.code;
  }

  const pointsDiscount = payload.use_points ? 0 : 0;
  const discountTotal = Number((couponDiscount + pointsDiscount).toFixed(2));
  const shippingFee = 0;
  const finalAmount = Number(Math.max(0, subTotal - discountTotal + shippingFee).toFixed(2));

  const promptpayConfig = await getPromptpayConfig();
  const promptpayPhone = promptpayConfig.phone;
  if (!promptpayPhone) {
    throw new PublicOrderError(500, "PAYMENT_CONFIG_MISSING", "PromptPay phone is not configured");
  }

  const base = `${promptpayConfig.baseUrl.replace(/\/+$/, "")}/`;
  const promptpayUrl = `${base}${encodeURIComponent(promptpayPhone)}/${encodeURIComponent(formatPromptpayAmount(finalAmount))}`;

  const reserved: Array<{ productId: string; qty: number }> = [];

  try {
    for (const line of lines) {
      await reserveStock(supabase, line.productId, line.qty);
      reserved.push({ productId: line.productId, qty: line.qty });
    }

    const orderNo = await generateUniqueOrderNo(supabase);
    const { data: orderRow, error: orderError } = await supabase
      .from("orders")
      .insert({
        order_no: orderNo,
        customer_id: customerId,
        status: "pending_payment",
        payment_status: "unpaid",
        payment_method: "promptpay_transfer",
        sub_total: subTotal,
        discount_total: discountTotal,
        shipping_fee: shippingFee,
        grand_total: finalAmount,
        coupon_code_snapshot: couponCode || null,
        promptpay_phone_snapshot: promptpayPhone,
        promptpay_link_snapshot: promptpayUrl,
        customer_name_snapshot: payload.customer.full_name,
        customer_phone_snapshot: payload.customer.phone,
        customer_email_snapshot: payload.customer.email ?? actor.user.email ?? null,
        note: payload.customer.note ?? null,
      })
      .select("id,order_no")
      .single();

    if (orderError || !orderRow) {
      throw new PublicOrderError(500, "ORDER_CREATE_FAILED", orderError?.message ?? "Unknown error");
    }

    const itemRows = lines.map((line) => ({
      order_id: String(orderRow.id),
      product_id: line.productId,
      sku_snapshot: line.skuSnapshot,
      name_snapshot: line.nameSnapshot,
      unit_price_snapshot: line.unitPrice,
      qty: line.qty,
      line_total: line.lineTotal,
    }));

    const { error: itemError } = await supabase.from("order_items").insert(itemRows);
    if (itemError) {
      throw new PublicOrderError(500, "ORDER_ITEMS_CREATE_FAILED", itemError.message);
    }

    return {
      order_no: String(orderRow.order_no),
      promptpay_url: promptpayUrl,
      final_amount: finalAmount,
    };
  } catch (error) {
    for (const line of reserved) {
      await releaseStock(supabase, line.productId, line.qty);
    }

    if (error instanceof PublicOrderError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : "Failed to create order";
    throw new PublicOrderError(500, "ORDER_CREATE_FAILED", message);
  }
}

export async function uploadPublicOrderSlip(orderNo: string, file: File) {
  const actor = await requireCustomerApi();
  const supabase = await getSupabaseServerClient();
  const normalizedOrderNo = orderNo.trim();

  if (!normalizedOrderNo) {
    throw new PublicOrderError(400, "INVALID_ORDER_NO", "Order number is required");
  }

  if (file.size <= 0 || file.size > 10 * 1024 * 1024) {
    throw new PublicOrderError(400, "INVALID_FILE", "Slip file size must be between 1 byte and 10MB");
  }

  const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  if (!allowed.includes(file.type)) {
    throw new PublicOrderError(400, "INVALID_FILE_TYPE", "Only JPG, PNG, WEBP, or PDF are allowed");
  }

  const { data: orderRow, error: orderError } = await supabase
    .from("orders")
    .select("id,order_no,customer_id")
    .eq("order_no", normalizedOrderNo)
    .eq("customer_id", actor.user.id)
    .maybeSingle();

  if (orderError) {
    throw new PublicOrderError(500, "ORDER_FETCH_FAILED", orderError.message);
  }
  if (!orderRow) {
    throw new PublicOrderError(404, "ORDER_NOT_FOUND", "Order not found");
  }

  const bucket = "payment-slips";

  const ext = file.name.includes(".") ? file.name.split(".").pop() ?? "bin" : "bin";
  const safeExt = ext.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const filePath = `${normalizedOrderNo}/${crypto.randomUUID()}.${safeExt}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    throw new PublicOrderError(500, "SLIP_UPLOAD_FAILED", uploadError.message);
  }

  const signed = await supabase.storage.from(bucket).createSignedUrl(filePath, 60 * 60 * 24 * 7);
  if (signed.error) {
    throw new PublicOrderError(500, "SLIP_URL_FAILED", signed.error.message);
  }

  const { error: slipError } = await supabase.from("payment_slips").insert({
    order_id: String(orderRow.id),
    order_no: String(orderRow.order_no),
    customer_id: actor.user.id,
    file_path: filePath,
    file_url: signed.data.signedUrl,
    status: "pending_review",
  });

  if (slipError) {
    throw new PublicOrderError(500, "SLIP_RECORD_FAILED", slipError.message);
  }

  const { error: orderUpdateError } = await supabase
    .from("orders")
    .update({ status: "pending_review", payment_status: "pending_verify" })
    .eq("id", String(orderRow.id));

  if (orderUpdateError) {
    throw new PublicOrderError(500, "ORDER_UPDATE_FAILED", orderUpdateError.message);
  }

  return {
    order_no: String(orderRow.order_no),
    status: "pending_review",
  };
}

export async function cancelPublicOrder(orderNo: string) {
  const actor = await requireCustomerApi();
  const supabase = await getSupabaseServerClient();
  const normalizedOrderNo = orderNo.trim();

  if (!normalizedOrderNo) {
    throw new PublicOrderError(400, "INVALID_ORDER_NO", "Order number is required");
  }

  const { data: orderRow, error: orderError } = await supabase
    .from("orders")
    .select("id,order_no,status,customer_id")
    .eq("order_no", normalizedOrderNo)
    .eq("customer_id", actor.user.id)
    .maybeSingle();

  if (orderError) {
    throw new PublicOrderError(500, "ORDER_FETCH_FAILED", orderError.message);
  }
  if (!orderRow) {
    throw new PublicOrderError(404, "ORDER_NOT_FOUND", "Order not found");
  }

  const status = String(orderRow.status ?? "");
  if (status === "cancelled") {
    return {
      order_no: String(orderRow.order_no),
      status: "cancelled",
    };
  }

  if (status !== "pending_payment") {
    throw new PublicOrderError(409, "ORDER_NOT_CANCELLABLE", "Only pending payment orders can be cancelled");
  }

  const { data: itemRows, error: itemsError } = await supabase
    .from("order_items")
    .select("product_id,qty")
    .eq("order_id", String(orderRow.id));

  if (itemsError) {
    throw new PublicOrderError(500, "ORDER_ITEMS_FETCH_FAILED", itemsError.message);
  }

  for (const row of (itemRows ?? []) as Array<Record<string, unknown>>) {
    const productId = String(row.product_id ?? "");
    const qty = Number(row.qty ?? 0);
    if (!productId || qty <= 0) continue;
    await releaseStock(supabase, productId, qty);
  }

  const { error: updateError } = await supabase
    .from("orders")
    .update({ status: "cancelled", payment_status: "expired" })
    .eq("id", String(orderRow.id));

  if (updateError) {
    throw new PublicOrderError(500, "ORDER_CANCEL_FAILED", updateError.message);
  }

  return {
    order_no: String(orderRow.order_no),
    status: "cancelled",
  };
}
