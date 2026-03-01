import { NextResponse } from "next/server";

import { requireCustomerApi } from "../../../../../../lib/auth/customer";
import { getSupabaseServerClient } from "../../../../../../lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type OrderDetailRouteProps = {
  params: Promise<{ order_no: string }>;
};

function extractAddressFromNote(note: unknown) {
  const text = typeof note === "string" ? note : "";
  if (!text.trim()) return "";
  const lines = text.split(/\r?\n/).map((line) => line.trim());
  const addressLine = lines.find((line) => /^address\s*:/i.test(line));
  if (!addressLine) return "";
  return addressLine.replace(/^address\s*:/i, "").trim();
}

function unauthorized(message: string) {
  if (message === "Unauthorized") {
    return NextResponse.json({ ok: false, code: "AUTH_REQUIRED", error: message }, { status: 401 });
  }
  if (message === "Network unstable") {
    return NextResponse.json({ ok: false, code: "NETWORK_UNSTABLE", error: message }, { status: 503 });
  }
  return null;
}

export async function GET(_request: Request, { params }: OrderDetailRouteProps) {
  try {
    const actor = await requireCustomerApi();
    const orderNo = (await params).order_no?.trim();
    if (!orderNo) {
      return NextResponse.json({ ok: false, code: "INVALID_ORDER_NO", error: "Order number is required" }, { status: 400 });
    }

    const supabase = await getSupabaseServerClient();
    const { data: orderRow, error: orderError } = await supabase
      .from("orders")
      .select("id,order_no,customer_id,grand_total,status,payment_status,payment_method,promptpay_phone_snapshot,promptpay_link_snapshot,bank_name_snapshot,bank_account_no_snapshot,bank_account_name_snapshot,customer_name_snapshot,customer_phone_snapshot,note")
      .eq("order_no", orderNo)
      .eq("customer_id", actor.user.id)
      .maybeSingle();

    if (orderError) {
      return NextResponse.json({ ok: false, code: "ORDER_FETCH_FAILED", error: orderError.message }, { status: 500 });
    }
    if (!orderRow) {
      return NextResponse.json({ ok: false, code: "ORDER_NOT_FOUND", error: "Order not found" }, { status: 404 });
    }

    const { data: itemRows, error: itemError } = await supabase
      .from("order_items")
      .select("product_id,name_snapshot,unit_price_snapshot,qty,line_total")
      .eq("order_id", String(orderRow.id))
      .order("created_at", { ascending: true });

    if (itemError) {
      return NextResponse.json({ ok: false, code: "ORDER_ITEMS_FETCH_FAILED", error: itemError.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      data: {
        order_no: String(orderRow.order_no ?? ""),
        grand_total: Number(orderRow.grand_total ?? 0),
        status: String(orderRow.status ?? ""),
        payment_status: String(orderRow.payment_status ?? ""),
        payment_method: String(orderRow.payment_method ?? ""),
        promptpay_phone_snapshot: String(orderRow.promptpay_phone_snapshot ?? ""),
        promptpay_link_snapshot: String(orderRow.promptpay_link_snapshot ?? ""),
        bank_name_snapshot: String(orderRow.bank_name_snapshot ?? ""),
        bank_account_no_snapshot: String(orderRow.bank_account_no_snapshot ?? ""),
        bank_account_name_snapshot: String(orderRow.bank_account_name_snapshot ?? ""),
        customer_full_name: String(orderRow.customer_name_snapshot ?? ""),
        customer_phone: String(orderRow.customer_phone_snapshot ?? ""),
        shipping_address: extractAddressFromNote(orderRow.note),
        items: (itemRows ?? []).map((row) => ({
          product_id: String(row.product_id ?? ""),
          title: String(row.name_snapshot ?? ""),
          price: Number(row.unit_price_snapshot ?? 0),
          qty: Number(row.qty ?? 0),
          line_total: Number(row.line_total ?? 0),
        })),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load order detail";
    const authResponse = unauthorized(message);
    if (authResponse) {
      return authResponse;
    }
    return NextResponse.json({ ok: false, code: "ORDER_DETAIL_FETCH_FAILED", error: message }, { status: 500 });
  }
}
