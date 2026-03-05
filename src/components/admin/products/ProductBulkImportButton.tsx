"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { AdminLocale } from "../../../../lib/i18n/admin";
import { ProductInput } from "../../../../lib/types/product";
import { ProductInputSchema } from "../../../../lib/validators/product";
import { emitStorefrontUpdateSignal } from "../../../../lib/storefront-sync";
import { Toast } from "../Toast";

type ProductBulkImportButtonProps = {
  locale: AdminLocale;
};

const IMPORT_FIELDS = [
  "sku",
  "slug",
  "title_th",
  "title_en",
  "title_lo",
  "description_th",
  "description_en",
  "description_lo",
  "price",
  "compare_at_price",
  "stock",
  "status",
] as const;

type ImportField = (typeof IMPORT_FIELDS)[number];
const REQUIRED_IMPORT_FIELDS: ImportField[] = ["title_th", "price", "stock"];

type PreviewMappedColumn = {
  field: ImportField;
  label: string;
  header: string | null;
  confidence: number;
};

type PreviewDraft = {
  rowNumber: number;
  source: Record<string, string>;
  input: ProductInput;
  ready: boolean;
  issues: string[];
};

type PreviewData = {
  fileName: string;
  sourceType: "csv" | "image" | "pdf";
  headers: string[];
  totalRows: number;
  readyRows: number;
  invalidRows: number;
  truncated: boolean;
  notes: string[];
  mappedColumns: PreviewMappedColumn[];
  drafts: PreviewDraft[];
  readyItems: Array<{ rowNumber: number; data: ProductInput }>;
};

type CommitData = {
  createdCount: number;
  failedCount: number;
  failed: Array<{ rowNumber: number; error: string }>;
};

type ToastState = {
  type: "success" | "error";
  message: string;
};

type MappingState = Record<ImportField, string>;

type EvaluatedPreview = {
  drafts: PreviewDraft[];
  readyRows: number;
  invalidRows: number;
  readyItems: Array<{ rowNumber: number; data: ProductInput }>;
};

function emptyMappingState(): MappingState {
  return {
    sku: "",
    slug: "",
    title_th: "",
    title_en: "",
    title_lo: "",
    description_th: "",
    description_en: "",
    description_lo: "",
    price: "",
    compare_at_price: "",
    stock: "",
    status: "",
  };
}

function normalizeStatus(raw: string): "active" | "inactive" {
  const value = raw.trim().toLowerCase();
  if (!value) return "active";
  const inactive = new Set([
    "inactive",
    "disabled",
    "disable",
    "off",
    "false",
    "0",
    "no",
    "n",
    "not active",
    "notactive",
    "archived",
  ]);
  return inactive.has(value) ? "inactive" : "active";
}

function parseNumberValue(raw: string) {
  const normalized = raw.replace(/[,\s]/g, "").replace(/thb|฿|บาท/gi, "").trim();
  if (!normalized) return Number.NaN;
  return Number(normalized);
}

function parseIntegerValue(raw: string) {
  const normalized = raw.replace(/[,\s]/g, "").trim();
  if (!normalized) return Number.NaN;
  return Number.parseInt(normalized, 10);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildFallbackSlug(rowNumber: number) {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `import-${y}${m}${d}-${rowNumber}`;
}

function buildDraftFromMapping(
  rowNumber: number,
  source: Record<string, string>,
  mapping: MappingState,
): PreviewDraft {
  const read = (field: ImportField) => {
    const header = mapping[field];
    if (!header) return "";
    return String(source[header] ?? "").trim();
  };

  const issues: string[] = [];
  const titleTh = read("title_th");
  const priceRaw = read("price");
  const stockRaw = read("stock");
  const compareAtRaw = read("compare_at_price");
  const price = parseNumberValue(priceRaw);
  const stock = parseIntegerValue(stockRaw);
  const compareAt = parseNumberValue(compareAtRaw);

  if (!titleTh) issues.push("Missing title_th");
  if (!Number.isFinite(price)) issues.push("Invalid price");
  if (!Number.isFinite(stock)) issues.push("Invalid stock");
  if (compareAtRaw && !Number.isFinite(compareAt)) issues.push("Invalid compare_at_price");

  const slugBase = slugify(read("slug")) || slugify(titleTh) || slugify(read("sku"));
  const candidate = {
    sku: read("sku"),
    slug: slugBase || buildFallbackSlug(rowNumber),
    title_th: titleTh,
    title_en: read("title_en"),
    title_lo: read("title_lo"),
    description_th: read("description_th"),
    description_en: read("description_en"),
    description_lo: read("description_lo"),
    price: Number.isFinite(price) ? Number(price.toFixed(2)) : 0,
    stock: Number.isFinite(stock) ? stock : 0,
    status: normalizeStatus(read("status")),
    ...(compareAtRaw ? { compare_at_price: Number.isFinite(compareAt) ? Number(compareAt.toFixed(2)) : 0 } : {}),
  };

  const parsed = ProductInputSchema.safeParse(candidate);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      issues.push(issue.message);
    }
  }

  return {
    rowNumber,
    source,
    input: parsed.success ? parsed.data : (candidate as ProductInput),
    ready: issues.length === 0,
    issues,
  };
}

function evaluatePreview(preview: PreviewData, mapping: MappingState): EvaluatedPreview {
  const drafts = preview.drafts.map((draft) => buildDraftFromMapping(draft.rowNumber, draft.source, mapping));
  const readyItems = drafts
    .filter((item) => item.ready)
    .map((item) => ({ rowNumber: item.rowNumber, data: item.input }));

  return {
    drafts,
    readyRows: readyItems.length,
    invalidRows: drafts.length - readyItems.length,
    readyItems,
  };
}

function buildInitialMapping(preview: PreviewData): MappingState {
  const next = emptyMappingState();
  for (const item of preview.mappedColumns) {
    next[item.field] = item.header ?? "";
  }
  return next;
}

function fieldLabel(field: ImportField, locale: AdminLocale) {
  const th: Record<ImportField, string> = {
    sku: "SKU",
    slug: "Slug",
    title_th: "ชื่อสินค้า (TH)",
    title_en: "ชื่อสินค้า (EN)",
    title_lo: "ชื่อสินค้า (LO)",
    description_th: "รายละเอียด (TH)",
    description_en: "รายละเอียด (EN)",
    description_lo: "รายละเอียด (LO)",
    price: "ราคา",
    compare_at_price: "ราคาก่อนลด",
    stock: "สต็อก",
    status: "สถานะ",
  };
  const en: Record<ImportField, string> = {
    sku: "SKU",
    slug: "Slug",
    title_th: "Title (TH)",
    title_en: "Title (EN)",
    title_lo: "Title (LO)",
    description_th: "Description (TH)",
    description_en: "Description (EN)",
    description_lo: "Description (LO)",
    price: "Price",
    compare_at_price: "Compare Price",
    stock: "Stock",
    status: "Status",
  };
  return locale === "th" ? th[field] : en[field];
}

function truncateText(value: string, limit = 42) {
  const normalized = value.replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim();
  if (!normalized) return "-";
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit - 1)}…`;
}

function isLikelyUnreadableHeader(value: string) {
  const text = value.trim();
  if (!text) return true;
  const readableCount = (text.match(/[A-Za-z0-9\u0E00-\u0E7F]/g) || []).length;
  const noisyCount = (text.match(/[^A-Za-z0-9\u0E00-\u0E7F\s_.\-()/]/g) || []).length;
  return readableCount === 0 || noisyCount > Math.max(3, readableCount);
}

export function ProductBulkImportButton({ locale }: ProductBulkImportButtonProps) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [mapping, setMapping] = useState<MappingState>(emptyMappingState());
  const [scanLoading, setScanLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [scanError, setScanError] = useState("");
  const [commitResult, setCommitResult] = useState<CommitData | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const t = useMemo(
    () =>
      locale === "th"
        ? {
            trigger: "เพิ่มสินค้าหลายรายการ",
            title: "เพิ่มสินค้าหลายรายการ",
            subtitle: "อัปโหลด CSV / รูปภาพ / PDF แล้วตรวจตัวอย่างก่อนบันทึกจริง",
            chooseFile: "เลือกไฟล์",
            acceptedHint: "รองรับ .csv, .pdf, .png, .jpg, .jpeg, .webp (สูงสุด 12MB)",
            scan: "สแกนตัวอย่าง",
            scanning: "กำลังสแกน...",
            save: "บันทึกรายการที่พร้อม",
            saving: "กำลังบันทึก...",
            close: "ปิด",
            clear: "ล้างข้อมูล",
            noFile: "กรุณาเลือกไฟล์ก่อน",
            preview: "ผลสแกนตัวอย่าง",
            mapTitle: "จับคู่หัวคอลัมน์กับฟิลด์สินค้า",
            mapSubtitle: "เลือกคอลัมน์ต้นทางให้ตรงกับข้อมูลสินค้า",
            sampleTitle: "ตัวอย่างรายการ",
            sourceRow: "แถว",
            productName: "ชื่อสินค้า",
            price: "ราคา",
            stock: "สต็อก",
            status: "สถานะ",
            ready: "พร้อม",
            notReady: "ยังไม่พร้อม",
            readyRows: "พร้อม",
            invalidRows: "ผิดพลาด",
            totalRows: "ทั้งหมด",
            truncated: "แสดงสูงสุด 300 แถว",
            emptyPreview: "ยังไม่มีตัวอย่าง กรุณาสแกนไฟล์ก่อน",
            failedRows: "แถวที่บันทึกไม่สำเร็จ",
            issues: "ปัญหา",
            createdSuccess: "นำเข้าสำเร็จ",
            nothingToSave: "ไม่มีรายการที่พร้อมบันทึก",
            pickHeader: "คอลัมน์ต้นทาง",
            confidence: "ความมั่นใจ",
            none: "ไม่เลือก",
            missingHeader: "ไม่พบหัวคอลัมน์สำหรับจับคู่",
            autoMap: "จับคู่ให้อัตโนมัติ",
            clearMap: "ล้างการจับคู่",
            required: "จำเป็น",
            example: "ตัวอย่าง",
            noExample: "ไม่มีตัวอย่าง",
            column: "คอลัมน์",
            requiredHint: "ต้องเลือกอย่างน้อย: ชื่อสินค้า(TH), ราคา, สต็อก",
            missingRequired: "ยังไม่ครบฟิลด์จำเป็น",
            unreadableHeaders: "พบหัวคอลัมน์ที่อ่านยาก",
            unreadableHint: "แนะนำเลือกจากตัวอย่างข้อมูลของแต่ละคอลัมน์",
            fieldMapped: "จับคู่แล้ว",
            sourceType: "ประเภทไฟล์",
          }
        : {
            trigger: "Bulk Import",
            title: "Bulk Product Import",
            subtitle: "Upload CSV / image / PDF, review preview, and save.",
            chooseFile: "Choose file",
            acceptedHint: "Supports .csv, .pdf, .png, .jpg, .jpeg, .webp (max 12MB)",
            scan: "Scan Preview",
            scanning: "Scanning...",
            save: "Save Ready Items",
            saving: "Saving...",
            close: "Close",
            clear: "Clear",
            noFile: "Please choose a file first.",
            preview: "Scan Preview",
            mapTitle: "Header Mapping (Editable)",
            sampleTitle: "Sample Rows",
            sourceRow: "Row",
            productName: "Product",
            price: "Price",
            stock: "Stock",
            status: "Status",
            ready: "Ready",
            notReady: "Not Ready",
            readyRows: "Ready",
            invalidRows: "Invalid",
            totalRows: "Total",
            truncated: "Showing up to 300 rows",
            emptyPreview: "No preview yet. Scan a file first.",
            failedRows: "Failed Rows",
            issues: "Issues",
            createdSuccess: "Bulk import completed",
            nothingToSave: "No ready rows to save",
            pickHeader: "Header",
            confidence: "Confidence",
            none: "None",
            missingHeader: "No headers found for mapping",
            mapSubtitle: "Match source columns to product fields.",
            autoMap: "Auto map",
            clearMap: "Clear mapping",
            required: "Required",
            example: "Example",
            noExample: "No sample",
            column: "Column",
            requiredHint: "Required fields: Title (TH), Price, Stock",
            missingRequired: "Missing required field mapping",
            unreadableHeaders: "Unreadable column headers found",
            unreadableHint: "Use sample values to identify the right column.",
            fieldMapped: "Mapped",
            sourceType: "Source type",
          },
    [locale],
  );

  const confidenceByField = useMemo(() => {
    const map = new Map<ImportField, number>();
    if (!preview) return map;
    for (const item of preview.mappedColumns) {
      map.set(item.field, item.confidence);
    }
    return map;
  }, [preview]);

  const evaluatedPreview = useMemo(() => {
    if (!preview) return null;
    return evaluatePreview(preview, mapping);
  }, [preview, mapping]);

  const headerOptions = useMemo(() => {
    if (!preview) return [];
    return preview.headers.map((header, index) => {
      const sampleValue = preview.drafts
        .map((draft) => String(draft.source[header] ?? "").trim())
        .find((value) => value.length > 0);
      const fallbackLabel = `${t.column} ${index + 1}`;
      return {
        value: header,
        displayLabel: isLikelyUnreadableHeader(header) ? fallbackLabel : truncateText(header, 40),
        sampleLabel: sampleValue ? truncateText(sampleValue, 28) : t.noExample,
        unreadable: isLikelyUnreadableHeader(header),
      };
    });
  }, [preview, t.column, t.noExample]);

  const missingRequiredFields = useMemo(
    () => REQUIRED_IMPORT_FIELDS.filter((field) => !mapping[field]),
    [mapping],
  );
  const unreadableHeaderCount = useMemo(() => headerOptions.filter((item) => item.unreadable).length, [headerOptions]);

  useEffect(() => {
    if (!preview) {
      setMapping(emptyMappingState());
      return;
    }
    setMapping(buildInitialMapping(preview));
  }, [preview]);

  function resetState() {
    setFile(null);
    setPreview(null);
    setCommitResult(null);
    setScanError("");
    setMapping(emptyMappingState());
  }

  function closeModal() {
    setOpen(false);
    resetState();
  }

  async function handleScanPreview() {
    if (!file) {
      setScanError(t.noFile);
      return;
    }

    setScanError("");
    setCommitResult(null);
    setPreview(null);
    setScanLoading(true);

    try {
      const formData = new FormData();
      formData.set("mode", "preview");
      formData.set("file", file);

      const response = await fetch(`/api/admin/products/import?t=${Date.now()}`, {
        method: "POST",
        body: formData,
        cache: "no-store",
      });

      const result = (await response.json().catch(() => null)) as
        | { ok?: boolean; data?: PreviewData; error?: string }
        | null;

      if (!response.ok || !result?.ok || !result.data) {
        throw new Error(result?.error || "Failed to scan file");
      }

      setPreview(result.data);
      if (result.data.readyRows === 0) {
        setScanError(t.nothingToSave);
      }
    } catch (error) {
      setScanError(error instanceof Error ? error.message : "Failed to scan file");
    } finally {
      setScanLoading(false);
    }
  }

  async function handleCommit() {
    if (!evaluatedPreview || evaluatedPreview.readyItems.length === 0) {
      setScanError(t.nothingToSave);
      return;
    }

    setScanError("");
    setSaveLoading(true);
    setCommitResult(null);

    try {
      const response = await fetch(`/api/admin/products/import?t=${Date.now()}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
        cache: "no-store",
        body: JSON.stringify({
          mode: "commit",
          items: evaluatedPreview.readyItems,
        }),
      });

      const result = (await response.json().catch(() => null)) as
        | { ok?: boolean; data?: CommitData; error?: string }
        | null;

      if (!result?.data) {
        throw new Error(result?.error || "Bulk import failed");
      }

      setCommitResult(result.data);

      if (result.data.createdCount > 0) {
        emitStorefrontUpdateSignal({ featured: true });
        router.refresh();
      }

      if (result.data.failedCount === 0) {
        setToast({
          type: "success",
          message:
            locale === "th"
              ? `${t.createdSuccess} ${result.data.createdCount} รายการ`
              : `${t.createdSuccess}: ${result.data.createdCount} items`,
        });
        closeModal();
        router.replace(`/admin/products?notice=bulk_imported&count=${result.data.createdCount}&sync=1`);
        router.refresh();
      } else {
        setToast({
          type: "error",
          message:
            locale === "th"
              ? `นำเข้าได้ ${result.data.createdCount} รายการ, ล้มเหลว ${result.data.failedCount} รายการ`
              : `Imported ${result.data.createdCount}, failed ${result.data.failedCount}`,
        });
      }
    } catch (error) {
      setScanError(error instanceof Error ? error.message : "Bulk import failed");
    } finally {
      setSaveLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center justify-center rounded-full border border-indigo-200 bg-indigo-50 px-4 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
      >
        {t.trigger}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-6xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
              <h3 className="text-lg font-semibold text-slate-900">{t.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{t.subtitle}</p>
            </div>

            <div className="space-y-4 p-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <label className="mb-2 block text-sm font-semibold text-slate-700">{t.chooseFile}</label>
                <input
                  type="file"
                  accept=".csv,.pdf,image/png,image/jpeg,image/webp"
                  onChange={(event) => {
                    const selected = event.target.files?.[0] ?? null;
                    setFile(selected);
                    setPreview(null);
                    setCommitResult(null);
                    setScanError("");
                  }}
                  className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                />
                <p className="mt-2 text-xs text-slate-500">{t.acceptedHint}</p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleScanPreview}
                    disabled={scanLoading}
                    className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {scanLoading ? t.scanning : t.scan}
                  </button>
                  <button
                    type="button"
                    onClick={handleCommit}
                    disabled={
                      saveLoading ||
                      scanLoading ||
                      !evaluatedPreview ||
                      evaluatedPreview.readyItems.length === 0 ||
                      missingRequiredFields.length > 0
                    }
                    className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saveLoading ? t.saving : t.save}
                  </button>
                  <button
                    type="button"
                    onClick={resetState}
                    disabled={scanLoading || saveLoading}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {t.clear}
                  </button>
                </div>
              </div>

              {scanError ? (
                <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {scanError}
                </p>
              ) : null}

              {preview && evaluatedPreview ? (
                <div className="space-y-4">
                  <section className="rounded-2xl border border-slate-200 bg-white p-4">
                    <h4 className="text-sm font-semibold text-slate-900">{t.preview}</h4>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700">
                        {preview.fileName}
                      </span>
                      <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 font-semibold text-violet-700">
                        {t.sourceType}: {preview.sourceType.toUpperCase()}
                      </span>
                      <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 font-semibold text-blue-700">
                        {t.totalRows}: {preview.totalRows}
                      </span>
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">
                        {t.readyRows}: {evaluatedPreview.readyRows}
                      </span>
                      <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 font-semibold text-rose-700">
                        {t.invalidRows}: {evaluatedPreview.invalidRows}
                      </span>
                    </div>
                    {preview.truncated ? <p className="mt-2 text-xs text-amber-700">{t.truncated}</p> : null}
                    {preview.notes.length > 0 ? (
                      <div className="mt-2 space-y-1 text-xs text-slate-600">
                        {preview.notes.map((note) => (
                          <p key={note}>- {note}</p>
                        ))}
                      </div>
                    ) : null}
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900">{t.mapTitle}</h4>
                        <p className="mt-1 text-xs text-slate-600">{t.mapSubtitle}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setMapping(buildInitialMapping(preview))}
                          className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                        >
                          {t.autoMap}
                        </button>
                        <button
                          type="button"
                          onClick={() => setMapping(emptyMappingState())}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          {t.clearMap}
                        </button>
                      </div>
                    </div>
                    <div className="mb-3 flex flex-wrap gap-2 text-[11px]">
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 font-semibold text-amber-700">
                        {t.requiredHint}
                      </span>
                      {missingRequiredFields.length > 0 ? (
                        <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 font-semibold text-rose-700">
                          {t.missingRequired}: {missingRequiredFields.map((field) => fieldLabel(field, locale)).join(", ")}
                        </span>
                      ) : (
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">
                          {t.fieldMapped}: {REQUIRED_IMPORT_FIELDS.length}/{REQUIRED_IMPORT_FIELDS.length}
                        </span>
                      )}
                      {unreadableHeaderCount > 0 ? (
                        <span className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 font-semibold text-orange-700">
                          {t.unreadableHeaders}: {unreadableHeaderCount}
                        </span>
                      ) : null}
                    </div>
                    {unreadableHeaderCount > 0 ? (
                      <p className="mb-3 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-700">
                        {t.unreadableHint}
                      </p>
                    ) : null}
                    {preview.headers.length === 0 ? (
                      <p className="text-xs text-slate-500">{t.missingHeader}</p>
                    ) : (
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                        {IMPORT_FIELDS.map((field) => {
                          const selectedOption = headerOptions.find((item) => item.value === mapping[field]);
                          const isRequiredField = REQUIRED_IMPORT_FIELDS.includes(field);
                          return (
                            <label
                              key={field}
                              className={`rounded-xl border bg-slate-50/70 px-3 py-2 text-xs text-slate-700 ${
                                isRequiredField ? "border-amber-300" : "border-slate-200"
                              }`}
                            >
                              <span className="flex items-center gap-2 font-semibold text-slate-900">
                                {fieldLabel(field, locale)}
                                {isRequiredField ? (
                                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                    {t.required}
                                  </span>
                                ) : null}
                              </span>
                              <select
                                value={mapping[field]}
                                onChange={(event) => {
                                  const value = event.target.value;
                                  setMapping((prev) => ({ ...prev, [field]: value }));
                                }}
                                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
                              >
                                <option value="">{t.none}</option>
                                {headerOptions.map((option) => (
                                  <option key={`${field}-${option.value}`} value={option.value}>
                                    {`${option.displayLabel} | ${t.example}: ${option.sampleLabel}`}
                                  </option>
                                ))}
                              </select>
                              <span className="mt-1 block text-[11px] text-slate-500">
                                {t.confidence}: {confidenceByField.get(field) ?? 0}
                              </span>
                              {selectedOption ? (
                                <span className="mt-1 block text-[11px] text-slate-500">
                                  {t.example}: {selectedOption.sampleLabel}
                                </span>
                              ) : null}
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-4">
                    <h4 className="mb-3 text-sm font-semibold text-slate-900">{t.sampleTitle}</h4>
                    <div className="max-h-[300px] overflow-auto rounded-xl border border-slate-200">
                      <table className="min-w-full border-collapse text-xs">
                        <thead className="sticky top-0 bg-slate-50 text-slate-700">
                          <tr>
                            <th className="border-b border-slate-200 px-3 py-2 text-left">{t.sourceRow}</th>
                            <th className="border-b border-slate-200 px-3 py-2 text-left">{t.productName}</th>
                            <th className="border-b border-slate-200 px-3 py-2 text-left">{t.price}</th>
                            <th className="border-b border-slate-200 px-3 py-2 text-left">{t.stock}</th>
                            <th className="border-b border-slate-200 px-3 py-2 text-left">{t.status}</th>
                            <th className="border-b border-slate-200 px-3 py-2 text-left">{t.ready}</th>
                            <th className="border-b border-slate-200 px-3 py-2 text-left">{t.issues}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {evaluatedPreview.drafts.slice(0, 60).map((row) => (
                            <tr key={`preview-row-${row.rowNumber}`} className="border-b border-slate-100 text-slate-700">
                              <td className="px-3 py-2">{row.rowNumber}</td>
                              <td className="px-3 py-2">{row.input.title_th || "-"}</td>
                              <td className="px-3 py-2">{row.input.price.toLocaleString()}</td>
                              <td className="px-3 py-2">{row.input.stock}</td>
                              <td className="px-3 py-2">{row.input.status}</td>
                              <td className="px-3 py-2">
                                <span
                                  className={`rounded-full px-2 py-1 font-semibold ${
                                    row.ready ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                                  }`}
                                >
                                  {row.ready ? t.ready : t.notReady}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-rose-700">{row.issues.join(", ") || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </div>
              ) : (
                <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  {t.emptyPreview}
                </p>
              )}

              {commitResult && commitResult.failedCount > 0 ? (
                <section className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4">
                  <h4 className="mb-2 text-sm font-semibold text-rose-700">{t.failedRows}</h4>
                  <div className="max-h-40 space-y-1 overflow-auto text-xs text-rose-700">
                    {commitResult.failed.map((item) => (
                      <p key={`failed-${item.rowNumber}`}>
                        #{item.rowNumber}: {item.error}
                      </p>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>

            <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-5 py-4">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <Toast
        open={Boolean(toast)}
        type={toast?.type ?? "success"}
        message={toast?.message ?? ""}
        onClose={() => setToast(null)}
      />
    </>
  );
}
