"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import { THAI_BANK_OPTIONS } from "../../../../lib/constants/thai-banks";

type PaymentSettingsPayload = {
  ok?: boolean;
  error?: string;
  data?: {
    promptpayPhone?: string;
    promptpayBaseUrl?: string;
    allowCustomAmount?: boolean;
    activeQrMode?: "promptpay" | "bank_qr";
    bankCode?: string;
    bankName?: string;
    bankAccountNo?: string;
    bankAccountName?: string;
    bankQrImageUrl?: string;
  };
};

type Draft = {
  promptpayPhone: string;
  promptpayBaseUrl: string;
  allowCustomAmount: boolean;
  activeQrMode: "promptpay" | "bank_qr";
  bankCode: string;
  bankName: string;
  bankAccountNo: string;
  bankAccountName: string;
  bankQrImageUrl: string;
};

const DEFAULT_DRAFT: Draft = {
  promptpayPhone: "",
  promptpayBaseUrl: "https://promptpay.io",
  allowCustomAmount: true,
  activeQrMode: "promptpay",
  bankCode: "",
  bankName: "",
  bankAccountNo: "",
  bankAccountName: "",
  bankQrImageUrl: "",
};

async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(input, { ...init, signal: controller.signal, cache: "no-store" });
    const payload = (await response.json().catch(() => null)) as T | null;
    return { response, payload };
  } finally {
    clearTimeout(timer);
  }
}

export function PaymentShortcutSettingItem({
  locale,
  onSuccess,
  onError,
}: {
  locale: "th" | "en";
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [draft, setDraft] = useState<Draft>(DEFAULT_DRAFT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const text = useMemo(
    () =>
      locale === "th"
        ? {
            title: "ข้อมูลร้านค้าและสลิปเงิน",
            subtitle: "กำหนดโหมด QR และบัญชีรับเงินสำหรับฝั่งลูกค้า",
            bankLabel: "ชื่อธนาคาร",
            accountNoLabel: "เลขที่บัญชี",
            accountNameLabel: "ชื่อเจ้าของบัญชี",
            promptpayLabel: "เลขพร้อมเพย์ (เบอร์โทร/บัตรประชาชน)",
            promptpayBaseLabel: "PromptPay Base URL",
            qrImageLabel: "QR ธรรมดา (URL รูปภาพ)",
            qrImageHint: "สามารถวาง URL รูป QR หรืออัปโหลดรูปใหม่ได้",
            uploadLabel: "อัปโหลดรูป QR",
            preview: "ตัวอย่าง QR",
            modeLabel: "โหมดที่เปิดใช้งาน",
            openPromptpay: "เปิดระบบ QR พร้อมเพย์",
            openBankQr: "เปิดระบบ QR ธรรมาดา",
            save: "บันทึกการตั้งค่า",
            saving: "กำลังบันทึก...",
            loading: "กำลังโหลดข้อมูล...",
            useBotRef: "ตัวเลือกธนาคารอ้างอิงจากรายชื่อธนาคารที่ดำเนินงานในประเทศไทย",
            saved: "บันทึกข้อมูลการชำระเงินสำเร็จ",
            loadFailed: "โหลดข้อมูลการชำระเงินไม่สำเร็จ",
            saveFailed: "บันทึกข้อมูลการชำระเงินไม่สำเร็จ",
            uploadFailed: "อัปโหลดรูป QR ไม่สำเร็จ",
            uploadDone: "อัปโหลดรูป QR สำเร็จ",
          }
        : {
            title: "Store payment profile",
            subtitle: "Configure QR mode and destination account for customer checkout.",
            bankLabel: "Bank",
            accountNoLabel: "Bank account number",
            accountNameLabel: "Account name",
            promptpayLabel: "PromptPay ID (phone/national ID)",
            promptpayBaseLabel: "PromptPay Base URL",
            qrImageLabel: "Standard QR image URL",
            qrImageHint: "Paste an image URL or upload a QR image.",
            uploadLabel: "Upload QR image",
            preview: "QR preview",
            modeLabel: "Active QR mode",
            openPromptpay: "Enable PromptPay QR",
            openBankQr: "Enable Standard QR",
            save: "Save payment settings",
            saving: "Saving...",
            loading: "Loading payment settings...",
            useBotRef: "Bank list references banks operating in Thailand.",
            saved: "Payment settings saved.",
            loadFailed: "Failed to load payment settings.",
            saveFailed: "Failed to save payment settings.",
            uploadFailed: "Failed to upload QR image.",
            uploadDone: "QR image uploaded.",
          },
    [locale],
  );

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const { response, payload } = await fetchJson<PaymentSettingsPayload>("/api/admin/settings/payment", { method: "GET" });
        if (!active) return;
        if (!response.ok || !payload?.ok || !payload.data) {
          throw new Error(payload?.error ?? text.loadFailed);
        }
        setDraft({
          promptpayPhone: String(payload.data.promptpayPhone ?? ""),
          promptpayBaseUrl: String(payload.data.promptpayBaseUrl ?? "https://promptpay.io"),
          allowCustomAmount: Boolean(payload.data.allowCustomAmount ?? true),
          activeQrMode: payload.data.activeQrMode === "bank_qr" ? "bank_qr" : "promptpay",
          bankCode: String(payload.data.bankCode ?? ""),
          bankName: String(payload.data.bankName ?? ""),
          bankAccountNo: String(payload.data.bankAccountNo ?? ""),
          bankAccountName: String(payload.data.bankAccountName ?? ""),
          bankQrImageUrl: String(payload.data.bankQrImageUrl ?? ""),
        });
      } catch (error) {
        onError(error instanceof Error ? error.message : text.loadFailed);
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [onError, text.loadFailed]);

  function setField<K extends keyof Draft>(field: K, value: Draft[K]) {
    setDraft((prev) => ({ ...prev, [field]: value }));
  }

  function onBankChange(value: string) {
    const selected = THAI_BANK_OPTIONS.find((item) => item.code === value);
    setDraft((prev) => ({
      ...prev,
      bankCode: value,
      bankName: selected ? selected.nameTh : "",
    }));
  }

  async function onUploadQr(file: File | null) {
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const { response, payload } = await fetchJson<{ url?: string; error?: string }>("/api/admin/upload/payment-qr", {
        method: "POST",
        body: form,
      });
      if (!response.ok || !payload?.url) {
        throw new Error(payload?.error ?? text.uploadFailed);
      }
      setField("bankQrImageUrl", payload.url);
      onSuccess(text.uploadDone);
    } catch (error) {
      onError(error instanceof Error ? error.message : text.uploadFailed);
    } finally {
      setUploading(false);
    }
  }

  async function onSave() {
    setSaving(true);
    try {
      const { response, payload } = await fetchJson<PaymentSettingsPayload>("/api/admin/settings/payment", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error ?? text.saveFailed);
      }
      onSuccess(text.saved);
    } catch (error) {
      onError(error instanceof Error ? error.message : text.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <li className="px-4 py-4">
        <p className="text-sm text-slate-500">{text.loading}</p>
      </li>
    );
  }

  return (
    <li className="px-4 py-4">
      <div className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-slate-800">{text.title}</p>
          <p className="text-xs text-slate-500">{text.subtitle}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{text.modeLabel}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setField("activeQrMode", "promptpay")}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                draft.activeQrMode === "promptpay"
                  ? "border-amber-300 bg-amber-100 text-amber-800"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              }`}
            >
              {text.openPromptpay}
            </button>
            <button
              type="button"
              onClick={() => setField("activeQrMode", "bank_qr")}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                draft.activeQrMode === "bank_qr"
                  ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              }`}
            >
              {text.openBankQr}
            </button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 md:col-span-2">
            <span className="text-xs font-semibold text-slate-600">{text.bankLabel}</span>
            <select
              value={draft.bankCode}
              onChange={(event) => onBankChange(event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">-</option>
              {THAI_BANK_OPTIONS.map((bank) => (
                <option key={bank.code} value={bank.code}>
                  {bank.nameTh} ({bank.nameEn})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500">{text.useBotRef}</p>
          </label>

          <label className="space-y-1">
            <span className="text-xs font-semibold text-slate-600">{text.accountNoLabel}</span>
            <input
              type="text"
              value={draft.bankAccountNo}
              onChange={(event) => setField("bankAccountNo", event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs font-semibold text-slate-600">{text.accountNameLabel}</span>
            <input
              type="text"
              value={draft.bankAccountName}
              onChange={(event) => setField("bankAccountName", event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs font-semibold text-slate-600">{text.promptpayLabel}</span>
            <input
              type="text"
              value={draft.promptpayPhone}
              onChange={(event) => setField("promptpayPhone", event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs font-semibold text-slate-600">{text.promptpayBaseLabel}</span>
            <input
              type="url"
              value={draft.promptpayBaseUrl}
              onChange={(event) => setField("promptpayBaseUrl", event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label className="space-y-1 md:col-span-2">
            <span className="text-xs font-semibold text-slate-600">{text.qrImageLabel}</span>
            <input
              type="url"
              value={draft.bankQrImageUrl}
              onChange={(event) => setField("bankQrImageUrl", event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
            <p className="text-[11px] text-slate-500">{text.qrImageHint}</p>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex cursor-pointer items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => void onUploadQr(event.target.files?.[0] ?? null)}
              className="hidden"
            />
            {uploading ? "..." : text.uploadLabel}
          </label>
          <button
            type="button"
            onClick={() => void onSave()}
            disabled={saving}
            className="btn-primary rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            {saving ? text.saving : text.save}
          </button>
        </div>

        {draft.bankQrImageUrl ? (
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{text.preview}</p>
            <div className="relative h-44 w-44 overflow-hidden rounded-lg border border-slate-200">
              <Image src={draft.bankQrImageUrl} alt="Bank QR" fill sizes="176px" className="object-contain" />
            </div>
          </div>
        ) : null}
      </div>
    </li>
  );
}
