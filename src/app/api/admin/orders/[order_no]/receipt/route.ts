import { NextResponse } from "next/server";

import { getAdminSettingsApi } from "../../../../../../../lib/db/admin-settings";
import { getAdminOrderDetail } from "../../../../../../../lib/db/admin-orders";
import { getWebStorefrontSettings } from "../../../../../../../lib/db/web-settings";
import { renderReceiptHtml } from "../../../../../../../lib/receipt/render-receipt-html";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReceiptRouteProps = {
  params: Promise<{ order_no: string }>;
};

const READY_ORDER_STATUSES = new Set(["paid", "processing", "shipped", "completed"]);
const RECEIPT_CONTACT_EMAIL = "kittisapsumaruvai@gmail.com";

function isReceiptReady(status: string, paymentStatus: string) {
  return paymentStatus.trim().toLowerCase() === "paid" || READY_ORDER_STATUSES.has(status.trim().toLowerCase());
}

function mapStatus(message: string) {
  if (message === "Unauthorized") return 401;
  if (message === "Network unstable") return 503;
  if (message.includes("not found")) return 404;
  return 500;
}

export async function GET(_request: Request, { params }: ReceiptRouteProps) {
  try {
    const orderNo = (await params).order_no;
    const [order, adminSettings, storefront] = await Promise.all([
      getAdminOrderDetail(orderNo),
      getAdminSettingsApi(),
      getWebStorefrontSettings(),
    ]);

    if (!order) {
      return NextResponse.json({ ok: false, code: "ORDER_NOT_FOUND", error: "Order not found" }, { status: 404 });
    }

    if (!isReceiptReady(order.status, order.payment_status)) {
      return NextResponse.json(
        { ok: false, code: "RECEIPT_NOT_READY", error: "Receipt is available after payment approval" },
        { status: 409 },
      );
    }

    const company = {
      name: storefront.brandName || adminSettings.storeName || "Kittisap ATV",
      address: storefront.contactAddressTh || storefront.contactAddressEn || "-",
      phone: storefront.contactPhone || adminSettings.supportPhone || "-",
      email: RECEIPT_CONTACT_EMAIL,
      taxId: "-",
    };

    const customer = {
      name: order.customer_name_snapshot || "-",
      address: order.shipping_address || "-",
      phone: order.customer_phone_snapshot || "-",
      email: order.customer_email_snapshot || "-",
      taxId: "-",
    };

    const html = renderReceiptHtml({
      orderNo: order.order_no,
      receiptNo: order.receipt_no,
      receiptIssuedAt: order.receipt_issued_at,
      paymentMethod: order.payment_method,
      subTotal: order.sub_total,
      discountTotal: order.discount_total,
      shippingFee: order.shipping_fee,
      grandTotal: order.grand_total,
      items: order.items.map((item) => ({
        name: item.name_snapshot,
        sku: item.sku_snapshot,
        qty: item.qty,
        unitPrice: item.unit_price_snapshot,
        lineTotal: item.line_total,
      })),
      company,
      customer,
      sellerName: adminSettings.displayName || adminSettings.email || "แอดมิน",
      backHref: `/admin/orders/${encodeURIComponent(order.order_no)}`,
      backLabel: "กลับหน้าคำสั่งซื้อ",
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
    return NextResponse.json(
      { ok: false, code: "RECEIPT_BUILD_FAILED", error: message },
      { status: mapStatus(message) },
    );
  }
}

