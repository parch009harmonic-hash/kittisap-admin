import { NextResponse } from "next/server";

import { requireCustomerApi } from "../../../../../../../lib/auth/customer";
import { getWebStorefrontSettings } from "../../../../../../../lib/db/web-settings";
import { renderReceiptHtml } from "../../../../../../../lib/receipt/render-receipt-html";
import { getSupabaseServerClient } from "../../../../../../../lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CustomerReceiptRouteProps = {
  params: Promise<{ order_no: string }>;
};

const RECEIPT_REFERENCE_RE = /[^A-Z0-9]/gi;
const ADDRESS_NOTE_PREFIX_RE = /^address\s*:/i;
const READY_ORDER_STATUSES = new Set(["paid", "processing", "shipped", "completed"]);

function mapStatus(message: string) {
  if (message === "Unauthorized") return 401;
  if (message === "Network unstable") return 503;
  if (message.includes("not found")) return 404;
  return 500;
}

function isReceiptReady(status: string, paymentStatus: string) {
  return paymentStatus.trim().toLowerCase() === "paid" || READY_ORDER_STATUSES.has(status.trim().toLowerCase());
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

function accountPathFromLocale(locale: string | null) {
  if (locale === "en") return "/en/account";
  if (locale === "lo") return "/lo/account";
  return "/account";
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

export async function GET(request: Request, { params }: CustomerReceiptRouteProps) {
  try {
    const actor = await requireCustomerApi();
    const orderNo = (await params).order_no?.trim();
    if (!orderNo) {
      return NextResponse.json({ ok: false, code: "INVALID_ORDER_NO", error: "Order number is required" }, { status: 400 });
    }

    const storefront = await getWebStorefrontSettings();
    const supabase = await getSupabaseServerClient();

    const { data: orderRow, error: orderError } = await supabase
      .from("orders")
      .select(
        "id,order_no,customer_id,customer_name_snapshot,customer_phone_snapshot,customer_email_snapshot,sub_total,discount_total,shipping_fee,grand_total,status,payment_status,payment_method,created_at,note",
      )
      .eq("order_no", orderNo)
      .eq("customer_id", actor.user.id)
      .maybeSingle();

    if (orderError) {
      return NextResponse.json({ ok: false, code: "ORDER_FETCH_FAILED", error: orderError.message }, { status: 500 });
    }
    if (!orderRow) {
      return NextResponse.json({ ok: false, code: "ORDER_NOT_FOUND", error: "Order not found" }, { status: 404 });
    }

    const status = String(orderRow.status ?? "");
    const paymentStatus = String(orderRow.payment_status ?? "");
    if (!isReceiptReady(status, paymentStatus)) {
      return NextResponse.json(
        { ok: false, code: "RECEIPT_NOT_READY", error: "Receipt is available after payment approval" },
        { status: 409 },
      );
    }

    const orderId = String(orderRow.id ?? "");

    const [itemsResult, slipsResult, profileResult] = await Promise.all([
      supabase
        .from("order_items")
        .select("name_snapshot,sku_snapshot,unit_price_snapshot,qty,line_total")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true }),
      supabase
        .from("payment_slips")
        .select("status,reviewed_at")
        .eq("order_id", orderId)
        .order("reviewed_at", { ascending: false }),
      supabase
        .from("customer_profiles")
        .select("address")
        .eq("id", actor.user.id)
        .maybeSingle(),
    ]);

    if (itemsResult.error) {
      return NextResponse.json({ ok: false, code: "ORDER_ITEMS_FETCH_FAILED", error: itemsResult.error.message }, { status: 500 });
    }
    if (slipsResult.error) {
      return NextResponse.json({ ok: false, code: "ORDER_SLIPS_FETCH_FAILED", error: slipsResult.error.message }, { status: 500 });
    }
    if (profileResult.error) {
      return NextResponse.json({ ok: false, code: "PROFILE_FETCH_FAILED", error: profileResult.error.message }, { status: 500 });
    }

    const note = String(orderRow.note ?? "").trim();
    const noteAddress = extractAddressFromNote(note);
    const profileAddress = String(profileResult.data?.address ?? "").trim();
    const shippingAddress = noteAddress || profileAddress || "-";
    const receiptNo = buildReceiptNo(String(orderRow.order_no ?? orderNo));
    const receiptIssuedAt = resolveReceiptIssuedAt(
      (slipsResult.data ?? []).map((row) => ({
        status: String(row.status ?? ""),
        reviewed_at: row.reviewed_at ? String(row.reviewed_at) : null,
      })),
      String(orderRow.created_at ?? ""),
    );

    const company = {
      name: storefront.brandName || "Kittisap ATV",
      address: storefront.contactAddressTh || storefront.contactAddressEn || "-",
      phone: storefront.contactPhone || "-",
      email: "-",
      taxId: "-",
    };

    const customer = {
      name: String(orderRow.customer_name_snapshot ?? "-") || "-",
      address: shippingAddress,
      phone: String(orderRow.customer_phone_snapshot ?? "-") || "-",
      email: String(orderRow.customer_email_snapshot ?? actor.user.email ?? "-") || "-",
      taxId: "-",
    };

    const locale = new URL(request.url).searchParams.get("locale");
    const html = renderReceiptHtml({
      orderNo: String(orderRow.order_no ?? orderNo),
      receiptNo,
      receiptIssuedAt,
      paymentMethod: String(orderRow.payment_method ?? "promptpay_transfer"),
      subTotal: Number(orderRow.sub_total ?? 0),
      discountTotal: Number(orderRow.discount_total ?? 0),
      shippingFee: Number(orderRow.shipping_fee ?? 0),
      grandTotal: Number(orderRow.grand_total ?? 0),
      items: (itemsResult.data ?? []).map((item) => ({
        name: String(item.name_snapshot ?? "-"),
        sku: String(item.sku_snapshot ?? ""),
        qty: Number(item.qty ?? 0),
        unitPrice: Number(item.unit_price_snapshot ?? 0),
        lineTotal: Number(item.line_total ?? 0),
      })),
      company,
      customer,
      sellerName: "ระบบแอดมิน",
      backHref: accountPathFromLocale(locale),
      backLabel: "กลับไปบัญชีลูกค้า",
    });

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to build receipt";
    const authResponse = unauthorized(message);
    if (authResponse) {
      return authResponse;
    }
    return NextResponse.json(
      { ok: false, code: "RECEIPT_BUILD_FAILED", error: message },
      { status: mapStatus(message) },
    );
  }
}

