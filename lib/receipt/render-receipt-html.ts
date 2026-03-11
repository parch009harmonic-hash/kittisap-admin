const DEFAULT_RECEIPT_LOGO_URL = "https://zbedxvzrbotwngxaktgj.supabase.co/storage/v1/object/sign/Kittisap%20Admin/products/image.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8wYTM3NDc3Mi1jM2RhLTQ5Y2ItOGMzNy1kODkyYzRlOWIxZWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJLaXR0aXNhcCBBZG1pbi9wcm9kdWN0cy9pbWFnZS5wbmciLCJpYXQiOjE3NzMyNTA4MDksImV4cCI6MTgwNDc4NjgwOX0.hkyOvP4x8Lr5BRpkXBxQWX0i56PNH28cUmoklDIlGc4";

type ReceiptParty = {
  name: string;
  address: string;
  phone: string;
  email: string;
  taxId?: string;
};

type ReceiptItem = {
  name: string;
  sku: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
};

type ReceiptRenderInput = {
  orderNo: string;
  receiptNo: string;
  receiptIssuedAt: string;
  paymentMethod: string;
  subTotal: number;
  discountTotal: number;
  shippingFee: number;
  grandTotal: number;
  items: ReceiptItem[];
  company: ReceiptParty;
  customer: ReceiptParty;
  sellerName: string;
  logoUrl?: string;
  backHref?: string;
  backLabel?: string;
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
  return parsed.toLocaleDateString("th-TH");
}

function asPrintableDateTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }
  return parsed.toLocaleString("th-TH", { hour12: false });
}

const THAI_DIGITS = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
const THAI_POSITIONS = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน"];

function readThaiNumber(value: number): string {
  if (value === 0) {
    return "";
  }
  if (value >= 1_000_000) {
    const million = Math.floor(value / 1_000_000);
    const rest = value % 1_000_000;
    return `${readThaiNumber(million)}ล้าน${readThaiNumber(rest)}`;
  }

  let result = "";
  let remaining = value;

  for (let position = 0; position < THAI_POSITIONS.length; position += 1) {
    const divider = 10 ** position;
    const digit = Math.floor((remaining / divider) % 10);
    if (digit === 0) {
      continue;
    }

    if (position === 0 && digit === 1 && value > 1) {
      result = `เอ็ด${result}`;
      continue;
    }
    if (position === 1 && digit === 1) {
      result = `สิบ${result}`;
      continue;
    }
    if (position === 1 && digit === 2) {
      result = `ยี่สิบ${result}`;
      continue;
    }
    result = `${THAI_DIGITS[digit]}${THAI_POSITIONS[position]}${result}`;
    remaining -= digit * divider;
  }

  return result;
}

function amountToThaiText(amount: number) {
  const safe = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  const baht = Math.floor(safe);
  const satang = Math.round((safe - baht) * 100);
  const bahtText = readThaiNumber(baht) || THAI_DIGITS[0];
  if (satang === 0) {
    return `(${bahtText}บาทถ้วน)`;
  }
  const satangText = readThaiNumber(satang) || THAI_DIGITS[0];
  return `(${bahtText}บาท${satangText}สตางค์)`;
}

function methodCheckedBox(isChecked: boolean) {
  return `<span class="checkbox${isChecked ? " checked" : ""}">${isChecked ? "X" : ""}</span>`;
}

function toSafeFilename(value: string) {
  const normalized = value.trim().replace(/[^a-zA-Z0-9_-]+/g, "_");
  return `${normalized || "receipt"}.pdf`;
}

export function renderReceiptHtml(input: ReceiptRenderInput) {
  const rowsHtml = input.items
    .map((item, index) => {
      return `
          <tr>
            <td>${index + 1}</td>
            <td>
              <div class="item-title">${htmlEscape(item.name)}</div>
              <div class="item-sku">${htmlEscape(item.sku)}</div>
            </td>
            <td class="num">${item.qty}</td>
            <td class="num">${formatMoney(item.unitPrice)}</td>
            <td class="num">${formatMoney(item.lineTotal)}</td>
          </tr>
        `;
    })
    .join("");

  const method = input.paymentMethod.trim().toLowerCase();
  const isCash = method === "cash";
  const isTransfer = method.includes("transfer") || method.includes("promptpay") || method.includes("bank");
  const isCheque = method.includes("cheque") || method.includes("check");
  const isCreditCard = method.includes("card");
  const pdfFileName = toSafeFilename(input.receiptNo);
  const logoUrl = input.logoUrl?.trim() || DEFAULT_RECEIPT_LOGO_URL;

  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ใบเสร็จรับเงิน ${htmlEscape(input.receiptNo)}</title>
  <style>
    :root {
      --green: #86a84a;
      --line: #d7d7d7;
      --text: #222;
      --muted: #6b7280;
      --bg: #efefef;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 16px;
      background: #dcdcdc;
      color: var(--text);
      font-family: "Tahoma", "Noto Sans Thai", Arial, Helvetica, sans-serif;
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
      margin-top: 4px;
    }
    .receipt-head .main {
      font-size: 28px;
      line-height: 1.05;
      font-weight: 500;
    }
    .meta {
      border-top: 1px solid var(--line);
      padding-top: 8px;
      border-bottom: 1px solid var(--line);
      padding-bottom: 8px;
    }
    .meta-row {
      display: grid;
      grid-template-columns: 122px 1fr;
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
    ${input.backHref ? `<a href="${htmlEscape(input.backHref)}">${htmlEscape(input.backLabel || "ย้อนกลับ")}</a>` : ""}
    <button type="button" id="downloadPdfBtn">ดาวน์โหลด PDF</button>
    <button type="button" onclick="window.print()">พิมพ์ใบเสร็จ</button>
  </div>
  <div class="page">
    <div class="corner"></div>

    <div class="top">
      <div class="brand small">
        <img src="${htmlEscape(logoUrl)}" alt="โลโก้ร้านค้า" class="brand-logo" crossorigin="anonymous" />
        <div>
          <p class="title">${htmlEscape(input.company.name)}</p>
          <div>${htmlEscape(input.company.address)}</div>
          <div>เลขผู้เสียภาษี ${htmlEscape(input.company.taxId || "-")}</div>
          <div>โทร ${htmlEscape(input.company.phone)}</div>
          <div>อีเมล ${htmlEscape(input.company.email)}</div>
        </div>
      </div>

      <div>
        <div class="receipt-head">
          <div class="main">ใบเสร็จรับเงิน</div>
        </div>
        <dl class="meta">
          <div class="meta-row"><dt>เลขที่เอกสาร</dt><dd>${htmlEscape(input.receiptNo)}</dd></div>
          <div class="meta-row"><dt>วันที่ออกเอกสาร</dt><dd>${htmlEscape(formatDate(input.receiptIssuedAt))}</dd></div>
          <div class="meta-row"><dt>พนักงานขาย</dt><dd>${htmlEscape(input.sellerName)}</dd></div>
          <div class="meta-row"><dt>อ้างอิงคำสั่งซื้อ</dt><dd>${htmlEscape(input.orderNo)}</dd></div>
          <div class="meta-row"><dt>วันเวลาชำระเงิน</dt><dd>${htmlEscape(asPrintableDateTime(input.receiptIssuedAt))}</dd></div>
        </dl>
      </div>
    </div>

    <div class="client-grid small">
      <div>
        <p class="section-title">ลูกค้า</p>
        <div>${htmlEscape(input.customer.name)}</div>
        <div>${htmlEscape(input.customer.address)}</div>
        <div>เลขผู้เสียภาษี ${htmlEscape(input.customer.taxId || "-")}</div>
      </div>
      <div>
        <p class="section-title">ช่องทางติดต่อ</p>
        <div>โทร: ${htmlEscape(input.customer.phone)}</div>
        <div>อีเมล: ${htmlEscape(input.customer.email)}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>รายการ</th>
          <th>จำนวน</th>
          <th>ราคาต่อหน่วย</th>
          <th>รวม</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml || `<tr><td colspan="5" style="text-align:center;color:#6b7280;">ไม่มีรายการสินค้า</td></tr>`}
      </tbody>
    </table>

    <div class="summary">
      <div class="summary-row">
        <div class="label">รวมสินค้า</div>
        <div class="value">${formatMoney(input.subTotal)} บาท</div>
      </div>
      <div class="summary-row">
        <div class="label">ส่วนลด</div>
        <div class="value">${formatMoney(input.discountTotal)} บาท</div>
      </div>
      <div class="summary-row">
        <div class="label">ค่าขนส่ง</div>
        <div class="value">${formatMoney(input.shippingFee)} บาท</div>
      </div>
      <div class="summary-row total">
        <div class="label">ยอดสุทธิ</div>
        <div class="value">${formatMoney(input.grandTotal)} บาท</div>
      </div>
    </div>

    <div class="amount-text">${htmlEscape(amountToThaiText(input.grandTotal))}</div>

    <div class="payment">
      <div class="pay-line">
        <span>รับชำระโดย:</span>
        <span>${methodCheckedBox(isCash)}เงินสด</span>
        <span>${methodCheckedBox(isCheque)}เช็ค</span>
        <span>${methodCheckedBox(isTransfer)}โอนเงิน</span>
        <span>${methodCheckedBox(isCreditCard)}บัตรเครดิต</span>
      </div>
      <div class="pay-table">
        <div>
          <div class="pay-table-head">ธนาคาร/ช่องทาง</div>
          <div>${htmlEscape(input.paymentMethod)}</div>
        </div>
        <div>
          <div class="pay-table-head">เลขอ้างอิง</div>
          <div>${htmlEscape(input.orderNo)}</div>
        </div>
        <div>
          <div class="pay-table-head">วันที่</div>
          <div>${htmlEscape(formatDate(input.receiptIssuedAt))}</div>
        </div>
        <div>
          <div class="pay-table-head">จำนวนเงิน</div>
          <div>${formatMoney(input.grandTotal)}</div>
        </div>
      </div>
    </div>

    <div class="signature">
      <div class="signature-block">
        <div class="line">ผู้ชำระเงิน</div>
        <div class="line">วันที่</div>
      </div>
      <div class="signature-block">
        <div class="line">ผู้รับเงิน</div>
        <div class="line">วันที่</div>
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
        downloadButton.textContent = "กำลังสร้าง PDF...";
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
            alert("ไม่สามารถสร้าง PDF อัตโนมัติได้ กรุณาใช้ปุ่มพิมพ์ใบเสร็จ");
          });
        });
      }
    })();
  </script>
</body>
</html>`;
}
