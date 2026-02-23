import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { requireCustomerApi } from "../../../../../lib/auth/customer";
import {
  CommerceApiError,
  createCustomerOrder,
} from "../../../../../lib/db/customer-commerce";
import { getSupabaseServerClient } from "../../../../../lib/supabase/server";
import { CustomerOrderCreateInput } from "../../../../../lib/types/commerce";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauthorized(message: string) {
  if (message === "Unauthorized") {
    return NextResponse.json({ ok: false, code: "AUTH_REQUIRED", error: message }, { status: 401 });
  }
  if (message === "Network unstable") {
    return NextResponse.json({ ok: false, code: "NETWORK_UNSTABLE", error: message }, { status: 503 });
  }
  return null;
}

export async function GET() {
  try {
    const actor = await requireCustomerApi();
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase
      .from("orders")
      .select("id,order_no,status,payment_status,payment_method,sub_total,discount_total,shipping_fee,grand_total,created_at")
      .eq("customer_id", actor.user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ ok: false, code: "ORDERS_FETCH_FAILED", error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load orders";
    const authResponse = unauthorized(message);
    if (authResponse) {
      return authResponse;
    }
    if (error instanceof CommerceApiError) {
      return NextResponse.json({ ok: false, code: error.code, error: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, code: "ORDERS_FETCH_FAILED", error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireCustomerApi();
    const payload = (await request.json()) as CustomerOrderCreateInput;
    const data = await createCustomerOrder(actor.user.id, payload);
    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create order";
    const authResponse = unauthorized(message);
    if (authResponse) {
      return authResponse;
    }
    if (error instanceof ZodError) {
      return NextResponse.json(
        { ok: false, code: "INVALID_REQUEST", error: error.issues.map((item) => item.message).join(", ") },
        { status: 400 },
      );
    }
    if (error instanceof CommerceApiError) {
      return NextResponse.json({ ok: false, code: error.code, error: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, code: "ORDER_CREATE_FAILED", error: message }, { status: 500 });
  }
}
