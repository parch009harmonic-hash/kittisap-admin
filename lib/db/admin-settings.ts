import "server-only";

import { z } from "zod";

import { requireAdmin } from "../auth/admin";
import {
  AdminSettingField,
  AdminSettings,
  DefaultLanguage,
  getDefaultAdminSettings,
  SessionPolicy,
  UiMode,
} from "../types/admin-settings";
import { getSupabaseServiceRoleClient } from "../supabase/service";

const SettingsFieldSchema = z.enum([
  "displayName",
  "email",
  "language",
  "storeName",
  "supportPhone",
  "currency",
  "twoFa",
  "sessionPolicy",
  "emailNotify",
  "pushNotify",
  "orderNotify",
  "uiMode",
]);

const SessionPolicySchema = z.enum(["7d", "30d", "never"]);
const DefaultLanguageSchema = z.enum(["th", "en"]);
const UiModeSchema = z.enum(["auto", "windows", "mobile"]);

const SETTINGS_SELECT = [
  "user_id",
  "display_name",
  "contact_email",
  "default_language",
  "store_name",
  "support_phone",
  "currency",
  "security_2fa_enabled",
  "session_policy",
  "notify_email_enabled",
  "notify_browser_enabled",
  "notify_order_enabled",
  "ui_mode",
].join(",");

function errorText(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message || fallback);
  }
  return fallback;
}

function isMissingAdminSettingsSchema(error: unknown) {
  const message = errorText(error, "").toLowerCase();
  return (
    message.includes("admin_settings") &&
    (message.includes("does not exist") ||
      message.includes("column") ||
      message.includes("schema cache") ||
      message.includes("could not find the table"))
  );
}

function dbDefaults(userId: string) {
  const defaults = getDefaultAdminSettings();
  return {
    user_id: userId,
    display_name: defaults.displayName,
    contact_email: defaults.email,
    default_language: defaults.language,
    store_name: defaults.storeName,
    support_phone: defaults.supportPhone,
    currency: defaults.currency,
    security_2fa_enabled: defaults.twoFa,
    session_policy: defaults.sessionPolicy,
    notify_email_enabled: defaults.emailNotify,
    notify_browser_enabled: defaults.pushNotify,
    notify_order_enabled: defaults.orderNotify,
    ui_mode: defaults.uiMode,
  };
}

function mapRow(row: Record<string, unknown> | null | undefined): AdminSettings {
  const defaults = getDefaultAdminSettings();
  if (!row) {
    return defaults;
  }

  const language = DefaultLanguageSchema.safeParse(row.default_language);
  const sessionPolicy = SessionPolicySchema.safeParse(row.session_policy);
  const uiMode = UiModeSchema.safeParse(row.ui_mode);

  return {
    displayName: String(row.display_name ?? defaults.displayName),
    email: String(row.contact_email ?? defaults.email),
    language: (language.success ? language.data : defaults.language) as DefaultLanguage,
    storeName: String(row.store_name ?? defaults.storeName),
    supportPhone: String(row.support_phone ?? defaults.supportPhone),
    currency: String(row.currency ?? defaults.currency),
    twoFa: Boolean(row.security_2fa_enabled ?? defaults.twoFa),
    sessionPolicy: (sessionPolicy.success ? sessionPolicy.data : defaults.sessionPolicy) as SessionPolicy,
    emailNotify: Boolean(row.notify_email_enabled ?? defaults.emailNotify),
    pushNotify: Boolean(row.notify_browser_enabled ?? defaults.pushNotify),
    orderNotify: Boolean(row.notify_order_enabled ?? defaults.orderNotify),
    uiMode: (uiMode.success ? uiMode.data : defaults.uiMode) as UiMode,
  };
}

async function ensureRow(userId: string) {
  const supabase = getSupabaseServiceRoleClient();
  const existing = await supabase
    .from("admin_settings")
    .select(SETTINGS_SELECT)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing.error) {
    if (isMissingAdminSettingsSchema(existing.error)) {
      return getDefaultAdminSettings();
    }
    throw new Error(`Failed to load settings: ${errorText(existing.error, "Unknown error")}`);
  }

  if (existing.data) {
    return mapRow(existing.data as unknown as Record<string, unknown>);
  }

  const inserted = await supabase
    .from("admin_settings")
    .insert(dbDefaults(userId))
    .select(SETTINGS_SELECT)
    .single();

  if (inserted.error) {
    if (isMissingAdminSettingsSchema(inserted.error)) {
      return getDefaultAdminSettings();
    }
    throw new Error(`Failed to initialize settings: ${errorText(inserted.error, "Unknown error")}`);
  }

  return mapRow(inserted.data as unknown as Record<string, unknown>);
}

function validateFieldValue(field: AdminSettingField, value: unknown) {
  switch (field) {
    case "language":
      return DefaultLanguageSchema.parse(value);
    case "sessionPolicy":
      return SessionPolicySchema.parse(value);
    case "twoFa":
    case "emailNotify":
    case "pushNotify":
    case "orderNotify":
      return z.boolean().parse(value);
    case "uiMode":
      return UiModeSchema.parse(value);
    default:
      return z.string().trim().min(1).max(255).parse(value);
  }
}

function toUpdatePayload(field: AdminSettingField, value: unknown) {
  switch (field) {
    case "displayName":
      return { display_name: validateFieldValue(field, value) };
    case "email":
      return { contact_email: z.string().trim().email().parse(value) };
    case "language":
      return { default_language: validateFieldValue(field, value) };
    case "storeName":
      return { store_name: validateFieldValue(field, value) };
    case "supportPhone":
      return { support_phone: z.string().trim().min(3).max(64).parse(value) };
    case "currency":
      return { currency: z.string().trim().min(2).max(8).toUpperCase().parse(value) };
    case "twoFa":
      return { security_2fa_enabled: validateFieldValue(field, value) };
    case "sessionPolicy":
      return { session_policy: validateFieldValue(field, value) };
    case "emailNotify":
      return { notify_email_enabled: validateFieldValue(field, value) };
    case "pushNotify":
      return { notify_browser_enabled: validateFieldValue(field, value) };
    case "orderNotify":
      return { notify_order_enabled: validateFieldValue(field, value) };
    case "uiMode":
      return { ui_mode: validateFieldValue(field, value) };
    default:
      return {};
  }
}

export async function getAdminSettings() {
  const user = await requireAdmin();
  return ensureRow(user.id);
}

export async function updateAdminSetting(field: unknown, value: unknown) {
  const user = await requireAdmin();
  const parsedField = SettingsFieldSchema.parse(field);
  await ensureRow(user.id);

  const supabase = getSupabaseServiceRoleClient();
  const payload = toUpdatePayload(parsedField, value);
  const updated = await supabase
    .from("admin_settings")
    .update(payload)
    .eq("user_id", user.id)
    .select(SETTINGS_SELECT)
    .single();

  if (updated.error) {
    if (isMissingAdminSettingsSchema(updated.error)) {
      throw new Error(
        "ยังไม่พบตาราง admin_settings ในฐานข้อมูล กรุณารันไฟล์ sql/ensure-admin-settings.sql ใน Supabase SQL Editor ก่อนบันทึก"
      );
    }
    throw new Error(`Failed to update settings: ${errorText(updated.error, "Unknown error")}`);
  }

  return mapRow(updated.data as unknown as Record<string, unknown>);
}
