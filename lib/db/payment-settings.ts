import "server-only";

import { z } from "zod";

import { getAdminActor, requireAdminApi } from "../auth/admin";
import { getSupabaseServiceRoleClient } from "../supabase/service";
import { PaymentSettings } from "../types/commerce";

const PaymentSettingsInputSchema = z.object({
  promptpayPhone: z.string().trim().min(8).max(32),
  promptpayBaseUrl: z.string().trim().url().default("https://promptpay.io"),
  allowCustomAmount: z.boolean().default(true),
});

const DEFAULT_PROMPTPAY_BASE = "https://promptpay.io";
const DEFAULT_PROMPTPAY_PHONE = process.env.PROMPTPAY_PHONE?.trim() || "0843374982";

function mapSettings(row: Record<string, unknown> | null | undefined): PaymentSettings {
  if (!row) {
    return {
      promptpayPhone: DEFAULT_PROMPTPAY_PHONE,
      promptpayBaseUrl: DEFAULT_PROMPTPAY_BASE,
      allowCustomAmount: true,
      updatedAt: null,
    };
  }

  return {
    promptpayPhone: String(row.promptpay_phone ?? DEFAULT_PROMPTPAY_PHONE),
    promptpayBaseUrl: String(row.promptpay_base_url ?? DEFAULT_PROMPTPAY_BASE),
    allowCustomAmount: Boolean(row.allow_custom_amount ?? true),
    updatedAt: row.updated_at ? String(row.updated_at) : null,
  };
}

export async function getPaymentSettings() {
  const supabase = getSupabaseServiceRoleClient();
  const { data } = await supabase
    .from("payment_settings")
    .select("promptpay_phone,promptpay_base_url,allow_custom_amount,updated_at")
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
    updated_by: actor.user.id,
  };

  const { data, error } = await supabase
    .from("payment_settings")
    .upsert(payload, { onConflict: "id" })
    .select("promptpay_phone,promptpay_base_url,allow_custom_amount,updated_at")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapSettings(data as Record<string, unknown>);
}
