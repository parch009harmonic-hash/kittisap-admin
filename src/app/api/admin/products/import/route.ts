import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { z } from "zod";

import { requireAdminApi } from "../../../../../../lib/auth/admin";
import { createProduct } from "../../../../../../lib/db/products";
import { takeRateLimitToken } from "../../../../../../lib/security/rate-limit";
import { ProductInput } from "../../../../../../lib/types/product";
import { ProductInputSchema } from "../../../../../../lib/validators/product";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_IMPORT_ROWS = 300;
const MAX_FILE_SIZE_BYTES = 12 * 1024 * 1024;

const importFields = [
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

type ImportField = (typeof importFields)[number];

type MappedColumn = {
  field: ImportField;
  label: string;
  header: string | null;
  confidence: number;
};

type ImportDraft = {
  rowNumber: number;
  source: Record<string, string>;
  input: ProductInput;
  ready: boolean;
  issues: string[];
};

type FieldMappingValue = {
  index: number;
  score: number;
};

type FieldMapping = Record<ImportField, FieldMappingValue | null>;

type ParsedTable = {
  headers: string[];
  rows: string[][];
  notes: string[];
};

const fieldLabel: Record<ImportField, string> = {
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

const headerAliases: Record<ImportField, string[]> = {
  sku: ["sku", "รหัสสินค้า", "รหัส", "productcode", "code", "itemcode"],
  slug: ["slug", "urlslug", "permalink"],
  title_th: ["ชื่อสินค้า", "ชื่อ", "สินค้า", "เมนู", "title", "productname", "name", "titleth"],
  title_en: ["titleen", "nameen", "englishname", "productnameen"],
  title_lo: ["titlelo", "namelo", "productnamelo"],
  description_th: ["รายละเอียด", "รายละเอียดสินค้า", "description", "detail", "descriptionth"],
  description_en: ["descriptionen", "detailen", "descen"],
  description_lo: ["descriptionlo", "detaillo", "desclo"],
  price: ["ราคา", "ราคาขาย", "price", "unitprice", "saleprice", "amount"],
  compare_at_price: ["ราคาก่อนลด", "ราคาปกติ", "compareprice", "compareatprice", "originalprice", "mrp"],
  stock: ["สต็อก", "คงเหลือ", "จำนวน", "qty", "quantity", "stock", "onhand"],
  status: ["สถานะ", "status", "active", "enabled", "publish"],
};

const commitItemSchema = z.object({
  rowNumber: z.number().int().min(1),
  data: ProductInputSchema,
});

const commitPayloadSchema = z.object({
  mode: z.literal("commit"),
  items: z.array(commitItemSchema).min(1).max(MAX_IMPORT_ROWS),
});

const extractedVisionSchema = z.object({
  headers: z.array(z.union([z.string(), z.number()])).optional(),
  rows: z
    .array(z.array(z.union([z.string(), z.number(), z.boolean(), z.null()])))
    .optional(),
  items: z
    .array(
      z.record(
        z.string(),
        z.union([z.string(), z.number(), z.boolean(), z.null()]),
      ),
    )
    .optional(),
});

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

function mapStatus(message: string) {
  if (message === "Unauthorized") return 401;
  if (message === "Not authorized to manage users") return 403;
  if (message === "Network unstable") return 503;
  return 500;
}

function normalizeHeaderToken(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9ก-๙]/g, "");
}

function scoreHeaderMatch(token: string, alias: string) {
  if (!token || !alias) return 0;
  if (token === alias) return 120;
  if (token.startsWith(alias) || token.endsWith(alias)) return 72;
  if (token.includes(alias) || alias.includes(token)) return 44;
  return 0;
}

function buildFieldMapping(headers: string[]): FieldMapping {
  const normalizedAliases = Object.fromEntries(
    importFields.map((field) => [
      field,
      headerAliases[field].map((alias) => normalizeHeaderToken(alias)).filter(Boolean),
    ]),
  ) as Record<ImportField, string[]>;

  const candidates = headers.map((header, index) => ({
    index,
    raw: header,
    token: normalizeHeaderToken(header),
  }));

  const mapping = {} as FieldMapping;
  const usedIndexes = new Set<number>();

  const assignmentOrder: ImportField[] = [
    "title_th",
    "price",
    "stock",
    "sku",
    "status",
    "compare_at_price",
    "slug",
    "title_en",
    "title_lo",
    "description_th",
    "description_en",
    "description_lo",
  ];

  for (const field of assignmentOrder) {
    let best: FieldMappingValue | null = null;
    for (const candidate of candidates) {
      if (usedIndexes.has(candidate.index) || !candidate.token) continue;
      for (const alias of normalizedAliases[field]) {
        const score = scoreHeaderMatch(candidate.token, alias);
        if (score === 0) continue;
        if (!best || score > best.score) {
          best = { index: candidate.index, score };
        }
      }
    }

    if (best) {
      mapping[field] = best;
      usedIndexes.add(best.index);
    } else {
      mapping[field] = null;
    }
  }

  return mapping;
}

function parseNumberValue(raw: string) {
  const normalized = raw
    .replace(/[,\s]/g, "")
    .replace(/บาท|thb|฿/gi, "")
    .trim();

  if (!normalized) return Number.NaN;
  return Number(normalized);
}

function parseIntegerValue(raw: string) {
  const normalized = raw.replace(/[,\s]/g, "").trim();
  if (!normalized) return Number.NaN;
  return Number.parseInt(normalized, 10);
}

function normalizeStatus(raw: string): "active" | "inactive" {
  const token = normalizeHeaderToken(raw);
  if (!token) return "active";
  const inactiveTokens = new Set([
    "inactive",
    "disable",
    "disabled",
    "off",
    "ปิดใช้งาน",
    "ปิด",
    "ไม่ใช้งาน",
    "ยกเลิก",
    "หยุดขาย",
    "0",
    "false",
  ]);
  return inactiveTokens.has(token) ? "inactive" : "active";
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

function parseDelimitedRows(text: string, delimiter: string) {
  const rows: string[][] = [];
  let currentCell = "";
  let currentRow: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === "\"") {
      if (inQuotes && nextChar === "\"") {
        currentCell += "\"";
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === delimiter) {
      currentRow.push(currentCell.trim());
      currentCell = "";
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && nextChar === "\n") {
        i += 1;
      }
      currentRow.push(currentCell.trim());
      currentCell = "";
      if (currentRow.some((cell) => cell !== "")) {
        rows.push(currentRow);
      }
      currentRow = [];
      continue;
    }

    currentCell += char;
  }

  if (currentCell !== "" || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((cell) => cell !== "")) {
      rows.push(currentRow);
    }
  }

  return rows;
}

function parseCsvRows(text: string) {
  const delimiters = [",", ";", "\t", "|"] as const;

  let bestRows: string[][] = [];
  let bestScore = -1;

  for (const delimiter of delimiters) {
    const parsed = parseDelimitedRows(text, delimiter);
    if (parsed.length === 0) continue;
    const sample = parsed.slice(0, 6);
    const avgCols =
      sample.reduce((total, row) => total + row.length, 0) / Math.max(sample.length, 1);
    if (avgCols > bestScore) {
      bestScore = avgCols;
      bestRows = parsed;
    }
  }

  return bestRows;
}

function findHeaderRow(rows: string[][]) {
  const maxProbe = Math.min(rows.length, 8);
  let bestIndex = 0;
  let bestScore = -1;

  for (let rowIndex = 0; rowIndex < maxProbe; rowIndex += 1) {
    const row = rows[rowIndex] ?? [];
    let score = 0;
    for (const cell of row) {
      const token = normalizeHeaderToken(cell);
      if (!token) continue;
      for (const field of importFields) {
        const aliases = headerAliases[field].map((item) => normalizeHeaderToken(item));
        if (aliases.some((alias) => scoreHeaderMatch(token, alias) > 0)) {
          score += 1;
          break;
        }
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestIndex = rowIndex;
    }
  }

  return {
    headerIndex: bestIndex,
    weakHeader: bestScore <= 0,
  };
}

function mapValueToString(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function stripCodeBlockFence(input: string) {
  const trimmed = input.trim();
  if (!trimmed.startsWith("```")) {
    return trimmed;
  }
  const firstLineBreak = trimmed.indexOf("\n");
  if (firstLineBreak < 0) {
    return trimmed.replace(/```/g, "").trim();
  }
  const lastFence = trimmed.lastIndexOf("```");
  if (lastFence <= firstLineBreak) {
    return trimmed.slice(firstLineBreak + 1).trim();
  }
  return trimmed.slice(firstLineBreak + 1, lastFence).trim();
}

function parseJsonLoose(input: string) {
  const direct = stripCodeBlockFence(input);
  try {
    return JSON.parse(direct) as unknown;
  } catch {
    const firstBrace = direct.indexOf("{");
    const lastBrace = direct.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      const sliced = direct.slice(firstBrace, lastBrace + 1);
      return JSON.parse(sliced) as unknown;
    }
    throw new Error("AI output is not valid JSON");
  }
}

function scoreDecodedText(value: string) {
  const replacementCount = (value.match(/\uFFFD/g) ?? []).length;
  const thaiCount = (value.match(/[\u0E00-\u0E7F]/g) ?? []).length;
  const latinExtendedCount = (value.match(/[À-ÿ]/g) ?? []).length;
  const mojibakePatternCount = (value.match(/ï»¿|Ã.|Â.|â.|เธ/g) ?? []).length;
  const controlCount = (value.match(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g) ?? []).length;
  return thaiCount * 3 - replacementCount * 10 - latinExtendedCount * 2 - mojibakePatternCount * 8 - controlCount * 6;
}

function decodeText(buffer: ArrayBuffer) {
  const view = new Uint8Array(buffer);
  const decoders = ["utf-8", "windows-874", "tis-620", "windows-1252"] as const;
  let best = "";
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const encoding of decoders) {
    try {
      const decoded = new TextDecoder(encoding).decode(view);
      const score = scoreDecodedText(decoded);
      if (score > bestScore) {
        bestScore = score;
        best = decoded;
      }
    } catch {
      // Ignore unsupported encodings in runtime.
    }
  }

  return best.replace(/^\uFEFF/, "").replace(/^ï»¿/, "");
}

function hasBinary(command: string) {
  const check = spawnSync(command, ["--version"], {
    encoding: "utf8",
    windowsHide: true,
  });
  return !check.error && check.status === 0;
}

function runBinary(command: string, args: string[]) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 32 * 1024 * 1024,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  if (result.status !== 0) {
    const stderr = String(result.stderr ?? "").trim();
    throw new Error(stderr || `${command} failed with exit code ${result.status}`);
  }

  return String(result.stdout ?? "");
}

function guessDelimiter(lines: string[]) {
  const candidates = [",", ";", "\t", "|"] as const;
  let bestDelimiter: string | null = null;
  let bestScore = 0;

  for (const delimiter of candidates) {
    const score = lines
      .slice(0, 12)
      .map((line) => line.split(delimiter).length)
      .reduce((sum, value) => sum + value, 0);

    if (score > bestScore) {
      bestScore = score;
      bestDelimiter = delimiter;
    }
  }

  return bestScore > lines.length * 1.8 ? bestDelimiter : null;
}

function parseTextRows(text: string) {
  const lines = text
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return [] as string[][];
  }

  const delimiter = guessDelimiter(lines);
  const rows = lines
    .map((line) => {
      if (delimiter) {
        return line.split(delimiter).map((cell) => cell.trim());
      }
      return line.split(/\t+|\s{2,}/g).map((cell) => cell.trim());
    })
    .filter((row) => row.length >= 2);

  return rows;
}

function tableFromPlainText(text: string, notes: string[] = []): ParsedTable {
  const rows = parseTextRows(text);
  if (rows.length === 0) {
    return {
      headers: [],
      rows: [],
      notes: [...notes, "ไม่พบข้อมูลตารางที่อ่านได้จากไฟล์"],
    };
  }

  const headerResult = findHeaderRow(rows);
  const headerRow = rows[headerResult.headerIndex] ?? [];
  const headers = headerRow.map((cell, index) => cell || `column_${index + 1}`);
  const bodyRows = rows
    .slice(headerResult.headerIndex + 1)
    .map((row) => {
      const normalized = [...row];
      while (normalized.length < headers.length) {
        normalized.push("");
      }
      return normalized.slice(0, headers.length);
    })
    .filter((row) => row.some((cell) => cell.length > 0));

  return {
    headers,
    rows: bodyRows,
    notes,
  };
}

function extractReadablePdfStrings(pdfBytes: ArrayBuffer) {
  const text = Buffer.from(pdfBytes).toString("latin1");
  const chunks: string[] = [];
  const regex = /\(([^()]{1,320})\)/g;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const segment = match[1]
      .replace(/\\n/g, " ")
      .replace(/\\r/g, " ")
      .replace(/\\t/g, " ")
      .replace(/\\\(/g, "(")
      .replace(/\\\)/g, ")")
      .replace(/\\\\/g, "\\")
      .trim();
    if (segment.length > 1) {
      chunks.push(segment);
    }
  }

  return chunks.join("\n");
}

async function extractTableViaLocalTesseract(file: File) {
  const tempDir = path.join(os.tmpdir(), `kittisap-import-${randomUUID()}`);
  await fs.mkdir(tempDir, { recursive: true });

  const extFromName = path.extname(file.name || "").trim().toLowerCase();
  const safeExt = extFromName && /^[.\w-]+$/.test(extFromName) ? extFromName : ".bin";
  const inputPath = path.join(tempDir, `input${safeExt}`);

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(inputPath, bytes);

    const attempts: Array<string[]> = [
      [inputPath, "stdout", "-l", "tha+eng", "--psm", "6"],
      [inputPath, "stdout", "-l", "eng", "--psm", "6"],
    ];

    let extractedText = "";
    for (const args of attempts) {
      try {
        const output = runBinary("tesseract", args);
        if (output.trim()) {
          extractedText = output;
          break;
        }
      } catch {
        // Try fallback language/profile.
      }
    }

    if (!extractedText.trim()) {
      throw new Error("เครื่องมือ OCR ภายในเครื่องไม่พบข้อความ");
    }

    return tableFromPlainText(extractedText, [
      "อ่านด้วย OCR ภายในเครื่อง (tesseract)",
    ]);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function extractTableViaLocalPdfText(file: File) {
  const tempDir = path.join(os.tmpdir(), `kittisap-import-${randomUUID()}`);
  await fs.mkdir(tempDir, { recursive: true });
  const inputPath = path.join(tempDir, "input.pdf");

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(inputPath, bytes);

    const text = runBinary("pdftotext", ["-layout", inputPath, "-"]);
    if (!text.trim()) {
      throw new Error("อ่าน PDF ไม่สำเร็จ (pdftotext ไม่พบข้อความ)");
    }

    return tableFromPlainText(text, ["อ่านด้วย pdftotext ภายในเครื่อง"]);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function extractTableWithoutAi(file: File): Promise<ParsedTable> {
  const contentType = file.type.toLowerCase();
  const filename = file.name.toLowerCase();
  const isImage = contentType.startsWith("image/");
  const isPdf = contentType.includes("pdf") || filename.endsWith(".pdf");

  if (isImage) {
    if (!hasBinary("tesseract")) {
      throw new Error("ไม่พบ OCR ภายในเครื่อง กรุณาติดตั้ง tesseract หรือกำหนด GEMINI_API_KEY");
    }
    return extractTableViaLocalTesseract(file);
  }

  if (isPdf) {
    if (hasBinary("pdftotext")) {
      return extractTableViaLocalPdfText(file);
    }
    if (hasBinary("tesseract")) {
      return extractTableViaLocalTesseract(file);
    }

    const fallbackText = extractReadablePdfStrings(await file.arrayBuffer());
    if (!fallbackText.trim()) {
      throw new Error("ไม่พบตัวอ่าน PDF ภายในเครื่อง กรุณาติดตั้ง pdftotext/tesseract หรือกำหนด GEMINI_API_KEY");
    }

    return tableFromPlainText(fallbackText, [
      "อ่านจากข้อความที่ฝังใน PDF (ความแม่นยำต่ำ)",
    ]);
  }

  throw new Error("ชนิดไฟล์นี้ไม่รองรับในโหมดไม่ใช้ AI");
}

async function extractTableFromVisionFile(file: File): Promise<ParsedTable> {
  const apiKey =
    process.env.GEMINI_API_KEY ??
    process.env.GOOGLE_AI_API_KEY ??
    process.env.GOOGLE_API_KEY ??
    "";

  if (!apiKey) {
    throw new Error("การสแกนรูปภาพ/PDF ต้องตั้งค่า GEMINI_API_KEY หรือ GOOGLE_AI_API_KEY");
  }

  const bytes = await file.arrayBuffer();
  const base64Data = Buffer.from(bytes).toString("base64");
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`;

  const prompt = [
    "Extract product table data from this file.",
    "Return JSON only with this exact shape:",
    "{",
    '  "headers": ["header1","header2"],',
    '  "rows": [["value1","value2"]]',
    "}",
    "Rules:",
    "- Keep headers exactly as seen in the source when possible.",
    "- Each row should represent one product item only.",
    "- Do not include markdown fences.",
    "- If there are no products, return headers as [] and rows as [].",
  ].join("\n");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: file.type || "application/octet-stream",
                data: base64Data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        topP: 0.8,
        responseMimeType: "application/json",
      },
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(55_000),
  });

  const raw = (await response.json().catch(() => null)) as
    | {
        candidates?: Array<{
          content?: {
            parts?: Array<{ text?: string }>;
          };
        }>;
        error?: { message?: string };
      }
    | null;

  if (!response.ok) {
    const message = raw?.error?.message || `AI extract failed (${response.status})`;
    throw new Error(message);
  }

  const text = raw?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) {
    throw new Error("AI ไม่ส่งผลลัพธ์กลับมา");
  }

  const parsedRaw = parseJsonLoose(text);
  const parsed = extractedVisionSchema.parse(parsedRaw);

  if (parsed.headers && parsed.rows) {
    const headers = parsed.headers.map(mapValueToString).filter((item) => item.length > 0);
    const rows = parsed.rows.map((row) => row.map(mapValueToString));
    return {
      headers,
      rows,
      notes: [],
    };
  }

  if (parsed.items && parsed.items.length > 0) {
    const allKeys = new Set<string>();
    for (const row of parsed.items) {
      Object.keys(row).forEach((key) => allKeys.add(key));
    }
    const headers = Array.from(allKeys);
    const rows = parsed.items.map((item) =>
      headers.map((key) => mapValueToString(item[key])),
    );
    return {
      headers,
      rows,
      notes: ["AI output was normalized from item objects."],
    };
  }

  return {
    headers: [],
    rows: [],
    notes: ["ไม่พบตารางสินค้าจากไฟล์รูปภาพ/PDF"],
  };
}

async function parseTableFromFile(file: File): Promise<ParsedTable> {
  const contentType = file.type.toLowerCase();
  const filename = file.name.toLowerCase();
  const isCsv = contentType.includes("csv") || filename.endsWith(".csv");
  const isImage = contentType.startsWith("image/");
  const isPdf = contentType.includes("pdf") || filename.endsWith(".pdf");

  if (!isCsv && !isImage && !isPdf) {
    throw new Error("ชนิดไฟล์ไม่รองรับ กรุณาใช้ CSV, รูปภาพ หรือ PDF");
  }

  if (file.size <= 0) {
    throw new Error("ไฟล์ที่อัปโหลดว่างเปล่า");
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error("File is too large. Maximum size is 12MB.");
  }

  if (isCsv) {
    const text = decodeText(await file.arrayBuffer());
    const rows = parseCsvRows(text);
    if (rows.length === 0) {
      throw new Error("ไม่พบแถวข้อมูลที่อ่านได้ใน CSV");
    }
    const headerResult = findHeaderRow(rows);
    const headerRow = rows[headerResult.headerIndex] ?? [];
    const headers = headerRow.map((cell, index) => cell || `column_${index + 1}`);
    const dataRows = rows
      .slice(headerResult.headerIndex + 1)
      .map((row) => {
        const normalized = [...row];
        while (normalized.length < headers.length) {
          normalized.push("");
        }
        return normalized.slice(0, headers.length);
      })
      .filter((row) => row.some((cell) => cell.trim() !== ""));

    return {
      headers,
      rows: dataRows,
      notes: headerResult.weakHeader ? ["ตรวจไม่พบแถวหัวตารางที่ชัดเจน กรุณาตรวจการจับคู่คอลัมน์อีกครั้ง"] : [],
    };
  }

  try {
    const extracted = await extractTableFromVisionFile(file);
    const headers = extracted.headers.map((header, index) => header || `column_${index + 1}`);
    const rows = extracted.rows
      .map((row) => {
        const normalized = [...row];
        while (normalized.length < headers.length) {
          normalized.push("");
        }
        return normalized.slice(0, headers.length);
      })
      .filter((row) => row.some((cell) => cell.trim() !== ""));

    return {
      headers,
      rows,
      notes: extracted.notes,
    };
  } catch (aiError) {
    const local = await extractTableWithoutAi(file);
    const aiMessage = aiError instanceof Error ? aiError.message : "";
    const aiUnavailableNote =
      /quota|rate|exceed|limit/i.test(aiMessage)
        ? "AI ไม่พร้อมใช้งานชั่วคราว (โควตาไม่เพียงพอ) ระบบใช้โหมดอ่านไฟล์ภายในเครื่องแทน"
        : "AI ไม่พร้อมใช้งาน ระบบใช้โหมดอ่านไฟล์ภายในเครื่องแทน";
    return {
      ...local,
      notes: [
        ...local.notes,
        aiUnavailableNote,
      ],
    };
  }
}

function buildSourceRecord(headers: string[], row: string[]) {
  const source: Record<string, string> = {};
  for (let i = 0; i < headers.length; i += 1) {
    const key = headers[i] || `column_${i + 1}`;
    source[key] = String(row[i] ?? "").trim();
  }
  return source;
}

function buildDraftRows(table: ParsedTable) {
  const mapping = buildFieldMapping(table.headers);
  const mappedColumns: MappedColumn[] = importFields.map((field) => {
    const mapped = mapping[field];
    return {
      field,
      label: fieldLabel[field],
      header: mapped ? table.headers[mapped.index] ?? null : null,
      confidence: mapped?.score ?? 0,
    };
  });

  const drafts: ImportDraft[] = [];

  for (let rowIndex = 0; rowIndex < table.rows.length; rowIndex += 1) {
    const rowNumber = rowIndex + 1;
    const row = table.rows[rowIndex] ?? [];
    const source = buildSourceRecord(table.headers, row);
    const issues: string[] = [];

    const read = (field: ImportField) => {
      const mapped = mapping[field];
      if (!mapped) return "";
      return String(row[mapped.index] ?? "").trim();
    };

    const titleTh = read("title_th");
    const priceValue = parseNumberValue(read("price"));
    const stockValue = parseIntegerValue(read("stock"));
    const compareAtRaw = read("compare_at_price");
    const compareAtValue = parseNumberValue(compareAtRaw);
    const slugRaw = read("slug");
    const skuRaw = read("sku");
    const statusRaw = read("status");

    if (!titleTh) {
      issues.push("ไม่พบชื่อสินค้า (TH)");
    }
    if (!Number.isFinite(priceValue)) {
      issues.push("ราคาไม่ถูกต้อง");
    }
    if (!Number.isFinite(stockValue)) {
      issues.push("สต็อกไม่ถูกต้อง");
    }
    if (compareAtRaw && !Number.isFinite(compareAtValue)) {
      issues.push("ราคาก่อนลดไม่ถูกต้อง");
    }

    const generatedSlugBase = slugify(slugRaw) || slugify(titleTh) || slugify(skuRaw);
    const slug = generatedSlugBase || buildFallbackSlug(rowNumber);

    const candidate = {
      sku: skuRaw,
      slug,
      title_th: titleTh,
      title_en: read("title_en"),
      title_lo: read("title_lo"),
      description_th: read("description_th"),
      description_en: read("description_en"),
      description_lo: read("description_lo"),
      price: Number.isFinite(priceValue) ? Number(priceValue.toFixed(2)) : 0,
      stock: Number.isFinite(stockValue) ? stockValue : 0,
      status: normalizeStatus(statusRaw),
      ...(compareAtRaw
        ? { compare_at_price: Number.isFinite(compareAtValue) ? Number(compareAtValue.toFixed(2)) : 0 }
        : {}),
    };

    const validation = ProductInputSchema.safeParse(candidate);
    if (!validation.success) {
      for (const issue of validation.error.issues) {
        issues.push(issue.message);
      }
    }

    drafts.push({
      rowNumber,
      source,
      input: validation.success ? validation.data : candidate,
      ready: issues.length === 0,
      issues,
    });
  }

  const limitedDrafts = drafts.slice(0, MAX_IMPORT_ROWS);
  const readyItems = limitedDrafts
    .filter((item) => item.ready)
    .map((item) => ({ rowNumber: item.rowNumber, data: item.input }));
  const invalidRows = limitedDrafts.filter((item) => !item.ready).length;
  const readyRows = readyItems.length;
  const truncated = drafts.length > limitedDrafts.length;

  return {
    mappedColumns,
    drafts: limitedDrafts,
    readyItems,
    invalidRows,
    readyRows,
    totalRows: drafts.length,
    truncated,
  };
}

function revalidatePublicProductPaths() {
  revalidatePath("/admin/products");
  revalidatePath("/");
  revalidatePath("/th");
  revalidatePath("/en");
  revalidatePath("/lo");
  revalidatePath("/products");
  revalidatePath("/en/products");
  revalidatePath("/lo/products");
  revalidatePath("/pricing");
  revalidatePath("/en/pricing");
  revalidatePath("/lo/pricing");
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = takeRateLimitToken(`admin-products-import:${ip}`, {
    limit: 10,
    windowMs: 60_000,
  });

  if (!rateLimit.ok) {
    return NextResponse.json(
      { ok: false, error: "ส่งคำขอนำเข้าบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่" },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  }

  try {
    await requireAdminApi();

    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const mode = String(formData.get("mode") ?? "preview");
      if (mode !== "preview") {
        return NextResponse.json({ ok: false, error: "โหมดฟอร์มไม่ถูกต้อง" }, { status: 400 });
      }

      const file = formData.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ ok: false, error: "ไม่พบไฟล์ที่อัปโหลด" }, { status: 400 });
      }

      const parsedTable = await parseTableFromFile(file);
      const preview = buildDraftRows(parsedTable);
      const sourceType = file.type.startsWith("image/")
        ? "image"
        : file.type.includes("pdf") || file.name.toLowerCase().endsWith(".pdf")
          ? "pdf"
          : "csv";

      return NextResponse.json(
        {
          ok: true,
          mode: "preview",
          data: {
            fileName: file.name,
            sourceType,
            headers: parsedTable.headers,
            totalRows: preview.totalRows,
            readyRows: preview.readyRows,
            invalidRows: preview.invalidRows,
            truncated: preview.truncated,
            notes: parsedTable.notes,
            mappedColumns: preview.mappedColumns,
            drafts: preview.drafts,
            readyItems: preview.readyItems,
          },
        },
        { headers: { "Cache-Control": "no-store, max-age=0" } },
      );
    }

    const payload = commitPayloadSchema.parse(await request.json());
    const created: Array<{ rowNumber: number; productId: string }> = [];
    const failed: Array<{ rowNumber: number; error: string }> = [];

    for (const item of payload.items) {
      try {
        const productId = await createProduct(item.data);
        created.push({ rowNumber: item.rowNumber, productId });
      } catch (error) {
        const message = error instanceof Error ? error.message : "สร้างสินค้าไม่สำเร็จ";
        failed.push({ rowNumber: item.rowNumber, error: message });
      }
    }

    if (created.length > 0) {
      revalidatePublicProductPaths();
    }

    const status = failed.length > 0 ? 207 : 200;
    return NextResponse.json(
      {
        ok: failed.length === 0,
        mode: "commit",
        data: {
          createdCount: created.length,
          failedCount: failed.length,
          failed,
        },
      },
      { status, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          ok: false,
          error: error.issues.map((item) => item.message).join(", "),
        },
        { status: 400, headers: { "Cache-Control": "no-store, max-age=0" } },
      );
    }

    const message = error instanceof Error ? error.message : "นำเข้าสินค้าไม่สำเร็จ";
    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: mapStatus(message), headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }
}
