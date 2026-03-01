import "server-only";

import { z } from "zod";

import { getAdminActor, requireAdminApi } from "../auth/admin";
import { getSupabaseServiceRoleClient } from "../supabase/service";
import { PaymentSettings } from "../types/commerce";

const PaymentSettingsInputSchema = z.object({
  promptpayPhone: z.string().trim().min(8).max(32),
  promptpayBaseUrl: z.string().trim().url().default("https://promptpay.io"),
  allowCustomAmount: z.boolean().default(true),
  activeQrMode: z.enum(["promptpay", "bank_qr"]).default("promptpay"),
  bankCode: z.string().trim().max(64).default(""),
  bankName: z.string().trim().max(180).default(""),
  bankAccountNo: z.string().trim().max(64).default(""),
  bankAccountName: z.string().trim().max(180).default(""),
  bankQrImageUrl: z.union([z.literal(""), z.string().trim().url()]).default(""),
});

const DEFAULT_PROMPTPAY_BASE = "https://promptpay.io";
const DEFAULT_PROMPTPAY_PHONE = process.env.PROMPTPAY_PHONE?.trim() || "0843374982";

function mapSettings(row: Record<string, unknown> | null | undefined): PaymentSettings {
  if (!row) {
    return {
      promptpayPhone: DEFAULT_PROMPTPAY_PHONE,
      promptpayBaseUrl: DEFAULT_PROMPTPAY_BASE,
      allowCustomAmount: true,
      activeQrMode: "promptpay",
      bankCode: "",
      bankName: "",
      bankAccountNo: "",
      bankAccountName: "",
      bankQrImageUrl: "",
      updatedAt: null,
    };
  }

  return {
    promptpayPhone: String(row.promptpay_phone ?? DEFAULT_PROMPTPAY_PHONE),
    promptpayBaseUrl: String(row.promptpay_base_url ?? DEFAULT_PROMPTPAY_BASE),
    allowCustomAmount: Boolean(row.allow_custom_amount ?? true),
    activeQrMode: row.active_qr_mode === "bank_qr" ? "bank_qr" : "promptpay",
    bankCode: String(row.bank_code ?? ""),
    bankName: String(row.bank_name ?? ""),
    bankAccountNo: String(row.bank_account_no ?? ""),
    bankAccountName: String(row.bank_account_name ?? ""),
    bankQrImageUrl: String(row.bank_qr_image_url ?? ""),
    updatedAt: row.updated_at ? String(row.updated_at) : null,
  };
}

export async function getPaymentSettings() {
  const supabase = getSupabaseServiceRoleClient();
  const { data } = await supabase
    .from("payment_settings")
    .select("promptpay_phone,promptpay_base_url,allow_custom_amount,active_qr_mode,bank_code,bank_name,bank_account_no,bank_account_name,bank_qr_image_url,updated_at")
    .eq("id", "default")
    .maybeSingle();

  return mapSettings(data as Record<string, unknown> | null);
}

export async function getPaymentSettingsApi() {
  await requireAdminApi();
  return getPaymentSettings();
}

export async function updatePaymentSettingsApi(input: unknown) {
  await requireAdminApi();
  const actor = await getAdminActor();
  if (!actor) {
    throw new Error("Unauthorized");
  }

  const parsed = PaymentSettingsInputSchema.parse(input);
  const supabase = getSupabaseServiceRoleClient();
  const payload = {
    id: "default",
    promptpay_phone: parsed.promptpayPhone,
    promptpay_base_url: parsed.promptpayBaseUrl,
    allow_custom_amount: parsed.allowCustomAmount,
    active_qr_mode: parsed.activeQrMode,
    bank_code: parsed.bankCode,
    bank_name: parsed.bankName,
    bank_account_no: parsed.bankAccountNo,
    bank_account_name: parsed.bankAccountName,
    bank_qr_image_url: parsed.bankQrImageUrl,
    updated_by: actor.user.id,
  };

  const { data, error } = await supabase
    .from("payment_settings")
    .upsert(payload, { onConflict: "id" })
    .select("promptpay_phone,promptpay_base_url,allow_custom_amount,active_qr_mode,bank_code,bank_name,bank_account_no,bank_account_name,bank_qr_image_url,updated_at")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapSettings(data as Record<string, unknown>);
}
