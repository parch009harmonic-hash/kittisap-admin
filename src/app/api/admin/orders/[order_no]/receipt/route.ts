import { NextResponse } from "next/server";

import { getAdminSettingsApi } from "../../../../../../../lib/db/admin-settings";
import { getAdminOrderDetail } from "../../../../../../../lib/db/admin-orders";
import {
  getWebBannerSettings,
  getWebBrandGuaranteeSettings,
  getWebStorefrontSettings,
} from "../../../../../../../lib/db/web-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReceiptRouteProps = {
  params: Promise<{ order_no: string }>;
};

function htmlEscape(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }
  return parsed.toLocaleDateString("en-GB");
}

function asPrintableDateTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }
  return parsed.toLocaleString("en-GB", { hour12: false });
}

function toWordsBelow1000(value: number): string {
  const ones = [
    "zero",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
    "eleven",
    "twelve",
    "thirteen",
    "fourteen",
    "fifteen",
    "sixteen",
    "seventeen",
    "eighteen",
    "nineteen",
  ];
  const tens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

  if (value < 20) {
    return ones[value];
  }
  if (value < 100) {
    const unit = value % 10;
    return `${tens[Math.floor(value / 10)]}${unit > 0 ? `-${ones[unit]}` : ""}`;
  }
  const hundred = Math.floor(value / 100);
  const rest = value % 100;
  return `${ones[hundred]} hundred${rest > 0 ? ` ${toWordsBelow1000(rest)}` : ""}`;
}

function numberToEnglishWords(value: number) {
  const normalized = Math.max(0, Math.floor(value));
  if (normalized === 0) {
    return "zero";
  }

  const chunks = [
    { divider: 1_000_000_000, name: "billion" },
    { divider: 1_000_000, name: "million" },
    { divider: 1_000, name: "thousand" },
  ];

  let remaining = normalized;
  const parts: string[] = [];

  for (const chunk of chunks) {
    const amount = Math.floor(remaining / chunk.divider);
    if (amount > 0) {
      parts.push(`${toWordsBelow1000(amount)} ${chunk.name}`);
      remaining %= chunk.divider;
    }
  }

  if (remaining > 0) {
    parts.push(toWordsBelow1000(remaining));
  }

  return parts.join(", ");
}

function amountToText(amount: number) {
  const safe = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  const baht = Math.floor(safe);
  const satang = Math.round((safe - baht) * 100);

  if (satang === 0) {
    return `(${numberToEnglishWords(baht)} baht)`;
  }
  return `(${numberToEnglishWords(baht)} baht and ${numberToEnglishWords(satang)} satang)`;
}

function methodCheckedBox(isChecked: boolean) {
  return `<span class="checkbox${isChecked ? " checked" : ""}">${isChecked ? "X" : ""}</span>`;
}

function toSafeFilename(value: string) {
  const normalized = value.trim().replace(/[^a-zA-Z0-9_-]+/g, "_");
  return `${normalized || "receipt"}.pdf`;
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
    const [order, adminSettings, storefront, banner, brandGuarantee] = await Promise.all([
      getAdminOrderDetail(orderNo),
      getAdminSettingsApi(),
      getWebStorefrontSettings(),
      getWebBannerSettings(),
      getWebBrandGuaranteeSettings(),
    ]);

    if (!order) {
      return NextResponse.json({ ok: false, code: "ORDER_NOT_FOUND", error: "Order not found" }, { status: 404 });
    }

    const brandLogoUrl =
      storefront.storefrontLogoUrl.trim()
      || brandGuarantee.items.find((item) => item.logoUrl.trim().length > 0)?.logoUrl
      || banner.imageUrl
      || "/icons/source-latest.png";
    const pdfFileName = toSafeFilename(order.receipt_no);

    const companyName = storefront.brandName || adminSettings.storeName || "Store";
    const companyAddress = storefront.contactAddressTh || storefront.contactAddressEn || "-";
    const companyPhone = storefront.contactPhone || adminSettings.supportPhone || "-";
    const companyEmail = adminSettings.email || "-";
    const companyTaxId = "-";

    const customerName = order.customer_name_snapshot || "-";
    const customerAddress = order.shipping_address || "-";
    const customerPhone = order.customer_phone_snapshot || "-";
    const customerEmail = order.customer_email_snapshot || "-";
    const customerTaxId = "-";

    const rowsHtml = order.items
      .map((item, index) => {
        return `
          <tr>
            <td>${index + 1}</td>
            <td>
              <div class="item-title">${htmlEscape(item.name_snapshot)}</div>
              <div class="item-sku">${htmlEscape(item.sku_snapshot)}</div>
            </td>
            <td class="num">${item.qty}</td>
            <td class="num">${formatMoney(item.unit_price_snapshot)}</td>
            <td class="num">${formatMoney(item.line_total)}</td>
          </tr>
        `;
      })
      .join("");

    const method = order.payment_method.trim().toLowerCase();
    const isCash = method === "cash";
    const isTransfer = method.includes("transfer") || method.includes("promptpay") || method.includes("bank");
    const isCheque = method.includes("cheque") || method.includes("check");
    const isCreditCard = method.includes("card");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Receipt ${htmlEscape(order.receipt_no)}</title>
  <style>
    :root {
      --green: #86a84a;
      --line: #d7d7d7;
      --text: #333333;
      --muted: #6b7280;
      --bg: #efefef;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 16px;
      background: #dcdcdc;
      color: var(--text);
      font-family: Arial, Helvetica, sans-serif;
    }
    .toolbar {
      width: 724px;
      margin: 0 auto 10px;
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    .toolbar a, .toolbar button {
      border: 1px solid #d1d5db;
      background: #fff;
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 12px;
      font-weight: 600;
      text-decoration: none;
      color: #111827;
      cursor: pointer;
    }
    .page {
      position: relative;
      width: 724px;
      min-height: 1024px;
      margin: 0 auto;
      background: var(--bg);
      padding: 44px 42px 40px;
      overflow: hidden;
    }
    .corner {
      position: absolute;
      top: 14px;
      right: 22px;
      width: 0;
      height: 0;
      border-left: 56px solid transparent;
      border-bottom: 76px solid var(--green);
    }
    .corner-number {
      position: absolute;
      top: 28px;
      right: 34px;
      color: #fff;
      font-size: 28px;
      font-weight: 300;
      line-height: 1;
    }
    .top {
      display: grid;
      grid-template-columns: 1.1fr 1fr;
      gap: 24px;
      padding-right: 52px;
    }
    .brand {
      display: flex;
      gap: 12px;
      align-items: flex-start;
    }
    .brand-logo {
      width: 58px;
      height: 58px;
      object-fit: contain;
      border-radius: 10px;
      background: #fff;
      border: 1px solid #e5e7eb;
      padding: 6px;
      flex-shrink: 0;
    }
    .small { font-size: 11px; line-height: 1.45; }
    .title {
      margin: 0 0 5px;
      font-size: 12px;
      font-weight: 700;
    }
    .receipt-head {
      text-align: center;
      color: var(--green);
      margin-bottom: 8px;
    }
    .receipt-head .main { font-size: 28px; line-height: 1.05; }
    .receipt-head .sub { font-size: 16px; line-height: 1.1; }
    .meta {
      border-top: 1px solid var(--line);
      padding-top: 8px;
      border-bottom: 1px solid var(--line);
      padding-bottom: 8px;
    }
    .meta-row {
      display: grid;
      grid-template-columns: 110px 1fr;
      gap: 8px;
      margin: 4px 0;
      font-size: 11px;
    }
    .meta-row dt { color: var(--green); }
    .meta-row dd { margin: 0; }
    .client-grid {
      margin-top: 18px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }
    .section-title {
      color: var(--green);
      font-size: 11px;
      margin: 0 0 4px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 18px;
      font-size: 11px;
      table-layout: fixed;
    }
    th, td {
      border-top: 1px solid var(--line);
      border-bottom: 1px solid var(--line);
      padding: 6px 8px;
      vertical-align: top;
    }
    th { font-weight: 500; color: #444; }
    th:nth-child(1), td:nth-child(1) { width: 42px; text-align: center; }
    th:nth-child(3), td:nth-child(3) { width: 90px; }
    th:nth-child(4), td:nth-child(4) { width: 110px; }
    th:nth-child(5), td:nth-child(5) { width: 110px; }
    .num { text-align: right; white-space: nowrap; }
    .item-title { color: #111827; }
    .item-sku { color: var(--muted); margin-top: 2px; }
    .summary {
      width: 255px;
      margin-left: auto;
      margin-top: 14px;
      font-size: 11px;
    }
    .summary-row {
      display: grid;
      grid-template-columns: 1fr 112px;
      gap: 12px;
      margin: 6px 0;
      align-items: baseline;
    }
    .summary-row .label {
      text-align: right;
      color: var(--green);
    }
    .summary-row .value {
      text-align: right;
    }
    .summary-row.total .label,
    .summary-row.total .value {
      font-weight: 700;
      color: #111827;
    }
    .amount-text {
      margin-top: 12px;
      font-size: 11px;
    }
    .payment {
      margin-top: 340px;
      font-size: 11px;
    }
    .pay-line {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .checkbox {
      display: inline-flex;
      width: 16px;
      height: 16px;
      border: 1px solid #b9b9b9;
      border-radius: 3px;
      align-items: center;
      justify-content: center;
      margin-right: 4px;
      font-size: 11px;
      line-height: 1;
    }
    .checkbox.checked {
      border-color: #1f2937;
      color: #111827;
      font-weight: 700;
    }
    .pay-table {
      margin-top: 12px;
      width: 100%;
      border-top: 1px solid var(--line);
      border-bottom: 1px solid var(--line);
      padding: 8px 0;
      display: grid;
      grid-template-columns: 1fr 1fr 1fr 1fr;
      gap: 8px;
      font-size: 11px;
    }
    .pay-table-head { color: var(--muted); margin-bottom: 2px; }
    .signature {
      margin-top: 64px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 48px;
      font-size: 11px;
    }
    .signature-block {
      display: grid;
      grid-template-columns: 1fr 100px;
      gap: 14px;
      align-items: end;
    }
    .line {
      border-top: 1px solid var(--line);
      padding-top: 6px;
      text-align: center;
    }
    @media print {
      body { padding: 0; background: #fff; }
      .toolbar { display: none; }
      .page { margin: 0 auto; }
    }
  </style>
</head>
<body>
  <div class="toolbar" id="receiptToolbar">
    <a href="/admin/orders/${encodeURIComponent(order.order_no)}">Back to Order</a>
    <button type="button" id="downloadPdfBtn">Download PDF</button>
    <button type="button" onclick="window.print()">Print Receipt</button>
  </div>
  <div class="page">
    <div class="corner"></div>
    <div class="corner-number">2</div>

    <div class="top">
      <div class="brand small">
        <img src="${htmlEscape(brandLogoUrl)}" alt="Store logo" class="brand-logo" crossorigin="anonymous" />
        <div>
          <p class="title">${htmlEscape(companyName)}</p>
          <div>${htmlEscape(companyAddress)}</div>
          <div>Tax ID ${htmlEscape(companyTaxId)}</div>
          <div>Phone ${htmlEscape(companyPhone)}</div>
          <div>Email ${htmlEscape(companyEmail)}</div>
        </div>
      </div>

      <div>
        <div class="receipt-head">
          <div class="main">Receipt</div>
          <div class="sub">Copy</div>
        </div>
        <dl class="meta">
          <div class="meta-row"><dt>Document No.</dt><dd>${htmlEscape(order.receipt_no)}</dd></div>
          <div class="meta-row"><dt>Date</dt><dd>${htmlEscape(formatDate(order.receipt_issued_at))}</dd></div>
          <div class="meta-row"><dt>Seller</dt><dd>${htmlEscape(adminSettings.displayName || adminSettings.email || "-")}</dd></div>
          <div class="meta-row"><dt>Reference</dt><dd>${htmlEscape(order.order_no)}</dd></div>
          <div class="meta-row"><dt>Paid At</dt><dd>${htmlEscape(asPrintableDateTime(order.receipt_issued_at))}</dd></div>
        </dl>
      </div>
    </div>

    <div class="client-grid small">
      <div>
        <p class="section-title">Client</p>
        <div>${htmlEscape(customerName)}</div>
        <div>${htmlEscape(customerAddress)}</div>
        <div>Tax ID ${htmlEscape(customerTaxId)}</div>
      </div>
      <div>
        <p class="section-title">Contact</p>
        <div>Phone: ${htmlEscape(customerPhone)}</div>
        <div>Email: ${htmlEscape(customerEmail)}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Description</th>
          <th>Quantity</th>
          <th>Unit Price</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml || `<tr><td colspan="5" style="text-align:center;color:#6b7280;">No items</td></tr>`}
      </tbody>
    </table>

    <div class="summary">
      <div class="summary-row">
        <div class="label">Total</div>
        <div class="value">${formatMoney(order.sub_total)} THB</div>
      </div>
      <div class="summary-row">
        <div class="label">Discount</div>
        <div class="value">${formatMoney(order.discount_total)} THB</div>
      </div>
      <div class="summary-row">
        <div class="label">Shipping</div>
        <div class="value">${formatMoney(order.shipping_fee)} THB</div>
      </div>
      <div class="summary-row total">
        <div class="label">Grand Total</div>
        <div class="value">${formatMoney(order.grand_total)} THB</div>
      </div>
    </div>

    <div class="amount-text">${htmlEscape(amountToText(order.grand_total))}</div>

    <div class="payment">
      <div class="pay-line">
        <span>Payment Received by:</span>
        <span>${methodCheckedBox(isCash)}Cash</span>
        <span>${methodCheckedBox(isCheque)}Cheque</span>
        <span>${methodCheckedBox(isTransfer)}Transfer</span>
        <span>${methodCheckedBox(isCreditCard)}Credit Card</span>
      </div>
      <div class="pay-table">
        <div>
          <div class="pay-table-head">Bank</div>
          <div>${htmlEscape(order.payment_method)}</div>
        </div>
        <div>
          <div class="pay-table-head">Number</div>
          <div>${htmlEscape(order.order_no)}</div>
        </div>
        <div>
          <div class="pay-table-head">Date</div>
          <div>${htmlEscape(formatDate(order.receipt_issued_at))}</div>
        </div>
        <div>
          <div class="pay-table-head">Amount</div>
          <div>${formatMoney(order.grand_total)}</div>
        </div>
      </div>
    </div>

    <div class="signature">
      <div class="signature-block">
        <div class="line">Paid by</div>
        <div class="line">Date</div>
      </div>
      <div class="signature-block">
        <div class="line">Collected by</div>
        <div class="line">Date</div>
      </div>
    </div>
  </div>
  <script>
    (function () {
      var receiptRoot = document.querySelector(".page");
      var toolbar = document.getElementById("receiptToolbar");
      var downloadButton = document.getElementById("downloadPdfBtn");
      var pdfFileName = ${JSON.stringify(pdfFileName)};

      function loadScript(src) {
        return new Promise(function (resolve, reject) {
          var existing = document.querySelector('script[data-src="' + src + '"]');
          if (existing) {
            if (existing.dataset.ready === "1") {
              resolve();
              return;
            }
            existing.addEventListener("load", function () { resolve(); }, { once: true });
            existing.addEventListener("error", function () { reject(new Error("Failed to load " + src)); }, { once: true });
            return;
          }

          var script = document.createElement("script");
          script.src = src;
          script.async = true;
          script.dataset.src = src;
          script.onload = function () {
            script.dataset.ready = "1";
            resolve();
          };
          script.onerror = function () { reject(new Error("Failed to load " + src)); };
          document.head.appendChild(script);
        });
      }

      async function ensurePdfDependencies() {
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js");
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
      }

      async function downloadPdf() {
        if (!receiptRoot || !downloadButton) return;
        if (!window.html2canvas || !window.jspdf || !window.jspdf.jsPDF) {
          await ensurePdfDependencies();
        }

        var prevLabel = downloadButton.textContent;
        downloadButton.disabled = true;
        downloadButton.textContent = "Generating PDF...";
        if (toolbar) toolbar.style.visibility = "hidden";

        try {
          var canvas = await window.html2canvas(receiptRoot, {
            scale: 2,
            useCORS: true,
            backgroundColor: "#efefef",
            imageTimeout: 0,
          });

          var image = canvas.toDataURL("image/png");
          var jsPDF = window.jspdf.jsPDF;
          var pdf = new jsPDF("p", "pt", "a4");
          var pageWidth = pdf.internal.pageSize.getWidth();
          var pageHeight = pdf.internal.pageSize.getHeight();
          var ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
          var renderWidth = canvas.width * ratio;
          var renderHeight = canvas.height * ratio;
          var offsetX = (pageWidth - renderWidth) / 2;
          var offsetY = 18;
          pdf.addImage(image, "PNG", offsetX, offsetY, renderWidth, renderHeight, "", "FAST");
          pdf.save(pdfFileName);
        } finally {
          if (toolbar) toolbar.style.visibility = "visible";
          downloadButton.disabled = false;
          downloadButton.textContent = prevLabel;
        }
      }

      if (downloadButton) {
        downloadButton.addEventListener("click", function () {
          downloadPdf().catch(function () {
            alert("Unable to generate PDF automatically. You can still use Print Receipt.");
          });
        });
      }
    })();
  </script>
</body>
</html>`;

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

