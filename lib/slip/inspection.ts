import "server-only";

export type SlipCheckStatus = "pass" | "warn" | "fail" | "unknown";
export type SlipCheckKey = "file" | "amount" | "account_name" | "account_no" | "datetime";

export type SlipCheck = {
  key: SlipCheckKey;
  status: SlipCheckStatus;
  detail: string;
  expected: string | number | null;
  actual: string | number | null;
};

export type SlipInspectionExtracted = {
  amountThb: number | null;
  accountName: string | null;
  accountNo: string | null;
  transferDateTime: string | null;
};

export type SlipInspectionResult = {
  available: boolean;
  source: "gemini" | "none";
  pass: boolean;
  summary: string;
  checks: SlipCheck[];
  extracted: SlipInspectionExtracted;
  checkedAt: string;
};

type SlipInspectionInput = {
  expectedAmount: number;
  expectedAccountName: string;
  expectedAccountNo: string;
};

type ExtractOutcome = {
  available: boolean;
  source: "gemini" | "none";
  extracted: SlipInspectionExtracted;
};

const EMPTY_EXTRACTED: SlipInspectionExtracted = {
  amountThb: null,
  accountName: null,
  accountNo: null,
  transferDateTime: null,
};

function normalizeDigits(value: string) {
  return value.replace(/\D+/g, "");
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseJsonLoose(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    return JSON.parse(fenced);
  }
}

function parsePositiveNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseTextOrNull(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function fileCheck(file: File): SlipCheck {
  if (file.size <= 0) {
    return {
      key: "file",
      status: "fail",
      detail: "Uploaded file is empty.",
      expected: "non-empty file",
      actual: `${file.size} bytes`,
    };
  }

  if (file.size < 15 * 1024) {
    return {
      key: "file",
      status: "warn",
      detail: "Slip file is very small and may be unreadable.",
      expected: ">= 15 KB",
      actual: `${Math.round(file.size / 1024)} KB`,
    };
  }

  if (file.type === "application/pdf") {
    return {
      key: "file",
      status: "pass",
      detail: "Slip file looks valid (PDF).",
      expected: "image/pdf",
      actual: "pdf",
    };
  }

  if (file.type.startsWith("image/")) {
    return {
      key: "file",
      status: "pass",
      detail: "Slip image file looks valid.",
      expected: "image/pdf",
      actual: file.type,
    };
  }

  return {
    key: "file",
    status: "warn",
    detail: "Slip file type is unusual.",
    expected: "image/pdf",
    actual: file.type || "unknown",
  };
}

function amountCheck(expectedAmount: number, extractedAmount: number | null, extractionAvailable: boolean): SlipCheck {
  const normalizedExpected = parsePositiveNumber(expectedAmount);
  if (!normalizedExpected) {
    return {
      key: "amount",
      status: "unknown",
      detail: "Expected amount is not available for comparison.",
      expected: null,
      actual: extractedAmount,
    };
  }

  if (!extractionAvailable && extractedAmount === null) {
    return {
      key: "amount",
      status: "unknown",
      detail: "Automatic amount extraction is unavailable.",
      expected: Number(normalizedExpected.toFixed(2)),
      actual: null,
    };
  }

  if (extractedAmount === null) {
    return {
      key: "amount",
      status: "warn",
      detail: "Cannot read amount from slip.",
      expected: Number(normalizedExpected.toFixed(2)),
      actual: null,
    };
  }

  const expected = Number(normalizedExpected.toFixed(2));
  const actual = Number(extractedAmount.toFixed(2));
  const diff = Math.abs(expected - actual);

  if (diff <= 0.5) {
    return {
      key: "amount",
      status: "pass",
      detail: "Amount matches order total.",
      expected,
      actual,
    };
  }

  return {
    key: "amount",
    status: "fail",
    detail: "Amount does not match order total.",
    expected,
    actual,
  };
}

function accountNameCheck(expectedName: string, extractedName: string | null, extractionAvailable: boolean): SlipCheck {
  const normalizedExpected = normalizeText(expectedName);
  if (!normalizedExpected) {
    return {
      key: "account_name",
      status: "unknown",
      detail: "Expected account name is not configured.",
      expected: null,
      actual: extractedName,
    };
  }

  if (!extractionAvailable && !extractedName) {
    return {
      key: "account_name",
      status: "unknown",
      detail: "Automatic account-name extraction is unavailable.",
      expected: expectedName,
      actual: null,
    };
  }

  if (!extractedName) {
    return {
      key: "account_name",
      status: "warn",
      detail: "Cannot read account name from slip.",
      expected: expectedName,
      actual: null,
    };
  }

  const normalizedActual = normalizeText(extractedName);
  const matched =
    normalizedActual.length > 0
    && (normalizedActual.includes(normalizedExpected) || normalizedExpected.includes(normalizedActual));

  if (matched) {
    return {
      key: "account_name",
      status: "pass",
      detail: "Account name matches expected receiver.",
      expected: expectedName,
      actual: extractedName,
    };
  }

  return {
    key: "account_name",
    status: "fail",
    detail: "Account name does not match expected receiver.",
    expected: expectedName,
    actual: extractedName,
  };
}

function accountNoCheck(expectedNo: string, extractedNo: string | null, extractionAvailable: boolean): SlipCheck {
  const expectedDigits = normalizeDigits(expectedNo);
  if (!expectedDigits) {
    return {
      key: "account_no",
      status: "unknown",
      detail: "Expected account number is not configured.",
      expected: null,
      actual: extractedNo,
    };
  }

  if (!extractionAvailable && !extractedNo) {
    return {
      key: "account_no",
      status: "unknown",
      detail: "Automatic account-number extraction is unavailable.",
      expected: `****${expectedDigits.slice(-4)}`,
      actual: null,
    };
  }

  const extractedDigits = normalizeDigits(extractedNo ?? "");
  if (!extractedDigits) {
    return {
      key: "account_no",
      status: "warn",
      detail: "Cannot read account number from slip.",
      expected: `****${expectedDigits.slice(-4)}`,
      actual: null,
    };
  }

  const expectedTail = expectedDigits.slice(-4);
  const actualTail = extractedDigits.slice(-4);

  if (expectedTail && actualTail && expectedTail === actualTail) {
    return {
      key: "account_no",
      status: "pass",
      detail: "Account number suffix matches expected receiver.",
      expected: `****${expectedTail}`,
      actual: `****${actualTail}`,
    };
  }

  return {
    key: "account_no",
    status: "fail",
    detail: "Account number suffix does not match expected receiver.",
    expected: `****${expectedTail || "-"}`,
    actual: `****${actualTail || "-"}`,
  };
}

function dateTimeCheck(transferDateTime: string | null, extractionAvailable: boolean): SlipCheck {
  if (!extractionAvailable && !transferDateTime) {
    return {
      key: "datetime",
      status: "unknown",
      detail: "Automatic transfer date/time extraction is unavailable.",
      expected: "valid transfer time",
      actual: null,
    };
  }

  if (!transferDateTime) {
    return {
      key: "datetime",
      status: "warn",
      detail: "Cannot read transfer date/time from slip.",
      expected: "valid transfer time",
      actual: null,
    };
  }

  const parsed = new Date(transferDateTime);
  if (Number.isNaN(parsed.getTime())) {
    return {
      key: "datetime",
      status: "warn",
      detail: "Transfer date/time format looks invalid.",
      expected: "ISO date-time",
      actual: transferDateTime,
    };
  }

  const diffHours = (Date.now() - parsed.getTime()) / (1000 * 60 * 60);
  if (diffHours < -0.5) {
    return {
      key: "datetime",
      status: "warn",
      detail: "Slip transfer time appears in the future.",
      expected: "not in future",
      actual: parsed.toISOString(),
    };
  }

  if (diffHours > 24 * 14) {
    return {
      key: "datetime",
      status: "warn",
      detail: "Slip transfer time is older than 14 days.",
      expected: "within 14 days",
      actual: parsed.toISOString(),
    };
  }

  return {
    key: "datetime",
    status: "pass",
    detail: "Transfer date/time looks valid.",
    expected: "valid transfer time",
    actual: parsed.toISOString(),
  };
}

function buildSummary(checks: SlipCheck[], extractionAvailable: boolean) {
  const failed = checks.filter((item) => item.status === "fail").length;
  const warned = checks.filter((item) => item.status === "warn").length;

  if (failed > 0) {
    return `Pre-check found ${failed} mismatch item(s).`;
  }
  if (warned > 0) {
    return `Pre-check passed with ${warned} warning item(s).`;
  }
  if (!extractionAvailable) {
    return "Pre-check completed. Automatic text extraction is unavailable.";
  }
  return "Pre-check passed.";
}

async function extractWithGemini(file: File): Promise<ExtractOutcome> {
  const apiKey =
    process.env.GEMINI_API_KEY
    || process.env.GOOGLE_AI_API_KEY
    || process.env.GOOGLE_API_KEY
    || "";

  if (!apiKey) {
    return {
      available: false,
      source: "none",
      extracted: EMPTY_EXTRACTED,
    };
  }

  try {
    const bytes = await file.arrayBuffer();
    const base64Data = Buffer.from(bytes).toString("base64");
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
    const prompt = [
      "Extract payment slip fields from this image/pdf.",
      "Return JSON only with exact keys:",
      "{",
      '  "amount_thb": number | null,',
      '  "account_name": string | null,',
      '  "account_no": string | null,',
      '  "transfer_datetime": string | null',
      "}",
      "Rules:",
      "- amount_thb: receiver amount in THB.",
      "- account_name: receiver account holder name.",
      "- account_no: receiver account number (masked/full).",
      "- transfer_datetime: ISO 8601 if possible, else null.",
      "- If unknown, use null.",
      "- Do not include markdown.",
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
      signal: AbortSignal.timeout(18_000),
    });

    if (!response.ok) {
      return {
        available: false,
        source: "none",
        extracted: EMPTY_EXTRACTED,
      };
    }

    const raw = (await response.json().catch(() => null)) as
      | {
          candidates?: Array<{
            content?: {
              parts?: Array<{ text?: string }>;
            };
          }>;
        }
      | null;

    const text = raw?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
    if (!text) {
      return {
        available: false,
        source: "none",
        extracted: EMPTY_EXTRACTED,
      };
    }

    const parsed = parseJsonLoose(text) as Record<string, unknown> | null;
    if (!parsed || typeof parsed !== "object") {
      return {
        available: false,
        source: "none",
        extracted: EMPTY_EXTRACTED,
      };
    }

    const extracted: SlipInspectionExtracted = {
      amountThb: parsePositiveNumber(parsed.amount_thb),
      accountName: parseTextOrNull(parsed.account_name),
      accountNo: parseTextOrNull(parsed.account_no),
      transferDateTime: parseTextOrNull(parsed.transfer_datetime),
    };

    const available =
      extracted.amountThb !== null
      || extracted.accountName !== null
      || extracted.accountNo !== null
      || extracted.transferDateTime !== null;

    return {
      available,
      source: "gemini",
      extracted,
    };
  } catch {
    return {
      available: false,
      source: "none",
      extracted: EMPTY_EXTRACTED,
    };
  }
}

export async function inspectSlipFile(file: File, input: SlipInspectionInput): Promise<SlipInspectionResult> {
  const extraction = await extractWithGemini(file);
  const extracted = extraction.extracted;
  const checks: SlipCheck[] = [
    fileCheck(file),
    amountCheck(Number(input.expectedAmount ?? 0), extracted.amountThb, extraction.available),
    accountNameCheck(String(input.expectedAccountName ?? ""), extracted.accountName, extraction.available),
    accountNoCheck(String(input.expectedAccountNo ?? ""), extracted.accountNo, extraction.available),
    dateTimeCheck(extracted.transferDateTime, extraction.available),
  ];

  const pass = !checks.some((item) => item.status === "fail");

  return {
    available: extraction.available,
    source: extraction.source,
    pass,
    summary: buildSummary(checks, extraction.available),
    checks,
    extracted,
    checkedAt: new Date().toISOString(),
  };
}
