import "server-only";

import { requireAdminApi } from "../auth/admin";
import { getSupabaseServiceRoleClient } from "../supabase/service";

export type AdminOrderRow = {
  id: string;
  order_no: string;
  customer_name: string;
  customer_phone: string;
  created_at: string;
  grand_total: number;
  status: string;
  payment_status: string;
  latest_pending_slip_id: string | null;
  can_delete: boolean;
};

export type AdminOrderItemRow = {
  id: string;
  product_id: string;
  sku_snapshot: string;
  name_snapshot: string;
  unit_price_snapshot: number;
  qty: number;
  line_total: number;
};

export type AdminPaymentSlipRow = {
  id: string;
  file_url: string | null;
  file_path: string;
  status: string;
  uploaded_at: string;
  reviewed_at: string | null;
  note: string | null;
};

const HISTORY_ORDER_STATUSES = new Set(["paid", "processing", "shipped", "completed"]);
const HISTORY_PAYMENT_STATUSES = new Set(["paid"]);
const RECEIPT_REFERENCE_RE = /[^A-Z0-9]/gi;
const ADDRESS_NOTE_PREFIX_RE = /^address\s*:/i;

function toMoney(value: unknown, fallback = 0) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized)) {
    return Number(fallback.toFixed(2));
  }
  return Number(normalized.toFixed(2));
}

function extractAddressFromNote(note: unknown) {
  const text = typeof note === "string" ? note : "";
  if (!text.trim()) {
    return "";
  }

  const lines = text.split(/\r?\n/).map((line) => line.trim());
  const addressLine = lines.find((line) => ADDRESS_NOTE_PREFIX_RE.test(line));
  if (!addressLine) {
    return "";
  }

  return addressLine.replace(ADDRESS_NOTE_PREFIX_RE, "").trim();
}

function buildReceiptNo(orderNo: string) {
  const compact = orderNo.trim().toUpperCase().replace(RECEIPT_REFERENCE_RE, "");
  return `RE-${compact || "UNKNOWN"}`;
}

function resolveReceiptIssuedAt(
  slips: Array<{ status: string; reviewed_at: string | null }>,
  fallbackCreatedAt: string,
) {
  const approved = slips.find((slip) => slip.status === "approved" && slip.reviewed_at);
  if (approved?.reviewed_at) {
    return approved.reviewed_at;
  }
  return fallbackCreatedAt;
}

function resolveShippingFee(inputFee: number | undefined, fallbackFee: number) {
  if (inputFee === undefined) {
    return toMoney(fallbackFee);
  }
  const normalized = toMoney(inputFee);
  if (!Number.isFinite(normalized) || normalized < 0 || normalized > 1_000_000) {
    throw new Error("Shipping fee must be between 0 and 1,000,000");
  }
  return normalized;
}

export function shouldKeepOrderForHistory(status: string, paymentStatus: string) {
  return (
    HISTORY_ORDER_STATUSES.has(status.trim().toLowerCase()) ||
    HISTORY_PAYMENT_STATUSES.has(paymentStatus.trim().toLowerCase())
  );
}

export async function listAdminOrders(input?: {
  q?: string;
  status?: string;
  limit?: number;
  deletionFilter?: "all" | "deletable" | "history";
}) {
  await requireAdminApi();

  const limit = Math.max(1, Math.min(200, input?.limit ?? 100));
  const supabase = getSupabaseServiceRoleClient();

  let query = supabase
    .from("orders")
    .select(
      "id,order_no,customer_name_snapshot,customer_phone_snapshot,created_at,grand_total,status,payment_status,customer_profiles(full_name,phone)",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  const q = input?.q?.trim();
  if (q) {
    query = query.or(`order_no.ilike.%${q}%,customer_name_snapshot.ilike.%${q}%,customer_phone_snapshot.ilike.%${q}%`);
  }

  const status = input?.status?.trim();
  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const orderIds = rows.map((row) => String(row.id ?? "")).filter(Boolean);

  const pendingSlipByOrder = new Map<string, string>();
  if (orderIds.length > 0) {
    const { data: slipRows, error: slipError } = await supabase
      .from("payment_slips")
      .select("id,order_id,status,uploaded_at")
      .in("order_id", orderIds)
      .eq("status", "pending_review")
      .order("uploaded_at", { ascending: false });

    if (slipError) {
      throw new Error(slipError.message);
    }

    for (const row of (slipRows ?? []) as Array<Record<string, unknown>>) {
      const orderId = String(row.order_id ?? "");
      if (!orderId || pendingSlipByOrder.has(orderId)) {
        continue;
      }
      pendingSlipByOrder.set(orderId, String(row.id ?? ""));
    }
  }

  const mappedOrders = rows.map((row) => {
    const orderId = String(row.id ?? "");
    const profile = (row.customer_profiles ?? null) as Record<string, unknown> | null;
    const customerName = String(row.customer_name_snapshot ?? profile?.full_name ?? "-");
    const customerPhone = String(row.customer_phone_snapshot ?? profile?.phone ?? "-");
    const status = String(row.status ?? "pending_payment");
    const paymentStatus = String(row.payment_status ?? "unpaid");

    return {
      id: orderId,
      order_no: String(row.order_no ?? ""),
      customer_name: customerName,
      customer_phone: customerPhone,
      created_at: String(row.created_at ?? ""),
      grand_total: Number(row.grand_total ?? 0),
      status,
      payment_status: paymentStatus,
      latest_pending_slip_id: pendingSlipByOrder.get(orderId) ?? null,
      can_delete: !shouldKeepOrderForHistory(status, paymentStatus),
    } satisfies AdminOrderRow;
  });

  const deletionFilter = input?.deletionFilter ?? "all";
  if (deletionFilter === "deletable") {
    return mappedOrders.filter((order) => order.can_delete);
  }
  if (deletionFilter === "history") {
    return mappedOrders.filter((order) => !order.can_delete);
  }

  return mappedOrders;
}

export async function getAdminOrderDetail(orderNo: string) {
  await requireAdminApi();
  const normalized = orderNo.trim();
  if (!normalized) {
    return null;
  }

  const supabase = getSupabaseServiceRoleClient();
  const { data: orderRow, error: orderError } = await supabase
    .from("orders")
    .select(
      "id,order_no,customer_id,customer_name_snapshot,customer_phone_snapshot,customer_email_snapshot,sub_total,discount_total,shipping_fee,grand_total,status,payment_status,payment_method,promptpay_link_snapshot,created_at,note",
    )
    .eq("order_no", normalized)
    .maybeSingle();

  if (orderError) {
    throw new Error(orderError.message);
  }
  if (!orderRow) {
    return null;
  }

  const orderId = String((orderRow as Record<string, unknown>).id ?? "");

  const [itemsResult, slipsResult] = await Promise.all([
    supabase
      .from("order_items")
      .select("id,product_id,sku_snapshot,name_snapshot,unit_price_snapshot,qty,line_total")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true }),
    supabase
      .from("payment_slips")
      .select("id,file_url,file_path,status,uploaded_at,reviewed_at,note")
      .eq("order_id", orderId)
      .order("uploaded_at", { ascending: false }),
  ]);

  if (itemsResult.error) {
    throw new Error(itemsResult.error.message);
  }
  if (slipsResult.error) {
    throw new Error(slipsResult.error.message);
  }

  const items = ((itemsResult.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id ?? ""),
    product_id: String(row.product_id ?? ""),
    sku_snapshot: String(row.sku_snapshot ?? ""),
    name_snapshot: String(row.name_snapshot ?? ""),
    unit_price_snapshot: Number(row.unit_price_snapshot ?? 0),
    qty: Number(row.qty ?? 0),
    line_total: Number(row.line_total ?? 0),
  })) as AdminOrderItemRow[];

  const slips = ((slipsResult.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id ?? ""),
    file_url: row.file_url ? String(row.file_url) : null,
    file_path: String(row.file_path ?? ""),
    status: String(row.status ?? "pending_review"),
    uploaded_at: String(row.uploaded_at ?? ""),
    reviewed_at: row.reviewed_at ? String(row.reviewed_at) : null,
    note: row.note ? String(row.note) : null,
  })) as AdminPaymentSlipRow[];

  const customerId = String((orderRow as Record<string, unknown>).customer_id ?? "");
  let profileAddress = "";
  if (customerId) {
    const { data: profileRow, error: profileError } = await supabase
      .from("customer_profiles")
      .select("address")
      .eq("id", customerId)
      .maybeSingle();

    if (profileError) {
      throw new Error(profileError.message);
    }

    profileAddress = String(((profileRow ?? {}) as Record<string, unknown>).address ?? "").trim();
  }

  const note = String((orderRow as Record<string, unknown>).note ?? "").trim();
  const shippingAddress = extractAddressFromNote(note) || profileAddress;
  const createdAt = String((orderRow as Record<string, unknown>).created_at ?? "");
  const receiptNo = buildReceiptNo(String((orderRow as Record<string, unknown>).order_no ?? ""));
  const receiptIssuedAt = resolveReceiptIssuedAt(slips, createdAt);

  return {
    id: orderId,
    order_no: String((orderRow as Record<string, unknown>).order_no ?? ""),
    customer_id: String((orderRow as Record<string, unknown>).customer_id ?? ""),
    customer_name_snapshot: String((orderRow as Record<string, unknown>).customer_name_snapshot ?? "-"),
    customer_phone_snapshot: String((orderRow as Record<string, unknown>).customer_phone_snapshot ?? "-"),
    customer_email_snapshot: String((orderRow as Record<string, unknown>).customer_email_snapshot ?? ""),
    payment_method: String((orderRow as Record<string, unknown>).payment_method ?? "promptpay_transfer"),
    promptpay_link_snapshot: String((orderRow as Record<string, unknown>).promptpay_link_snapshot ?? ""),
    sub_total: Number((orderRow as Record<string, unknown>).sub_total ?? 0),
    discount_total: Number((orderRow as Record<string, unknown>).discount_total ?? 0),
    shipping_fee: Number((orderRow as Record<string, unknown>).shipping_fee ?? 0),
    grand_total: Number((orderRow as Record<string, unknown>).grand_total ?? 0),
    status: String((orderRow as Record<string, unknown>).status ?? "pending_payment"),
    payment_status: String((orderRow as Record<string, unknown>).payment_status ?? "unpaid"),
    created_at: createdAt,
    note,
    shipping_address: shippingAddress,
    receipt_no: receiptNo,
    receipt_issued_at: receiptIssuedAt,
    items,
    slips,
  };
}

export async function reviewAdminOrderSlip(input: {
  orderNo: string;
  slipId: string;
  action: "approve" | "reject";
  shippingFee?: number;
  note?: string;
}) {
  const actor = await requireAdminApi();
  const supabase = getSupabaseServiceRoleClient();

  const orderNo = input.orderNo.trim();
  const slipId = input.slipId.trim();
  if (!orderNo || !slipId) {
    throw new Error("Order or slip id is required");
  }

  const { data: orderRow, error: orderError } = await supabase
    .from("orders")
    .select("id,sub_total,discount_total,shipping_fee")
    .eq("order_no", orderNo)
    .maybeSingle();

  if (orderError) {
    throw new Error(orderError.message);
  }
  if (!orderRow) {
    throw new Error("Order not found");
  }

  const orderId = String((orderRow as Record<string, unknown>).id ?? "");

  const nextSlipStatus = input.action === "approve" ? "approved" : "rejected";
  const nextOrderStatus = input.action === "approve" ? "paid" : "pending_payment";
  const nextPaymentStatus = input.action === "approve" ? "paid" : "failed";
  const currentShippingFee = toMoney((orderRow as Record<string, unknown>).shipping_fee ?? 0);
  const nextShippingFee =
    input.action === "approve"
      ? resolveShippingFee(input.shippingFee, currentShippingFee)
      : currentShippingFee;
  const subTotal = toMoney((orderRow as Record<string, unknown>).sub_total ?? 0);
  const discountTotal = toMoney((orderRow as Record<string, unknown>).discount_total ?? 0);
  const nextGrandTotal = toMoney(Math.max(0, subTotal - discountTotal + nextShippingFee));

  const { error: slipError } = await supabase
    .from("payment_slips")
    .update({
      status: nextSlipStatus,
      reviewed_at: new Date().toISOString(),
      reviewed_by: actor.id,
      note: input.note?.trim() || null,
    })
    .eq("id", slipId)
    .eq("order_id", orderId);

  if (slipError) {
    throw new Error(slipError.message);
  }

  const orderPatch: Record<string, unknown> = {
    status: nextOrderStatus,
    payment_status: nextPaymentStatus,
  };
  if (input.action === "approve") {
    orderPatch.shipping_fee = nextShippingFee;
    orderPatch.grand_total = nextGrandTotal;
  }

  const { error: orderUpdateError } = await supabase
    .from("orders")
    .update(orderPatch)
    .eq("id", orderId);

  if (orderUpdateError) {
    throw new Error(orderUpdateError.message);
  }

  return {
    order_no: orderNo,
    status: nextOrderStatus,
    payment_status: nextPaymentStatus,
    slip_status: nextSlipStatus,
    shipping_fee: nextShippingFee,
    grand_total: nextGrandTotal,
    receipt_no: input.action === "approve" ? buildReceiptNo(orderNo) : null,
  };
}

export async function deleteAdminOrder(orderNo: string) {
  await requireAdminApi();
  const normalized = orderNo.trim();
  if (!normalized) {
    throw new Error("Order number is required");
  }

  const supabase = getSupabaseServiceRoleClient();
  const { data: orderRow, error: orderError } = await supabase
    .from("orders")
    .select("id,order_no,status,payment_status")
    .eq("order_no", normalized)
    .maybeSingle();

  if (orderError) {
    throw new Error(orderError.message);
  }
  if (!orderRow) {
    throw new Error("Order not found");
  }

  const status = String((orderRow as Record<string, unknown>).status ?? "pending_payment");
  const paymentStatus = String((orderRow as Record<string, unknown>).payment_status ?? "unpaid");
  if (shouldKeepOrderForHistory(status, paymentStatus)) {
    throw new Error("Order already purchased and must be kept for history");
  }

  const { error: deleteError } = await supabase.from("orders").delete().eq("id", String(orderRow.id));
  if (deleteError) {
    throw new Error(deleteError.message);
  }

  return {
    order_no: String((orderRow as Record<string, unknown>).order_no ?? normalized),
    deleted: true as const,
  };
}
