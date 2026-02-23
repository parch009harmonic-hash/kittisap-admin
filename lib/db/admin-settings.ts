import "server-only";

import { z } from "zod";

import { getAdminActor, requireAdmin, requireAdminApi } from "../auth/admin";
import { assertUiWriteAllowed } from "../maintenance/ui-maintenance-guard";
import {
  AdminSettingField,
  AdminSettings,
  DefaultLanguage,
  getDefaultAdminSettings,
  SessionPolicy,
  ThemePreset,
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
  "themePreset",
]);

const SessionPolicySchema = z.enum(["7d", "30d", "never"]);
const DefaultLanguageSchema = z.enum(["th", "en"]);
const UiModeSchema = z.enum(["auto", "windows", "mobile"]);
const ThemePresetSchema = z.enum(["default", "ocean", "mint", "sunset"]);

const SETTINGS_SELECT_WITH_THEME = [
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
  "theme_preset",
].join(",");

const SETTINGS_SELECT_LEGACY = [
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

function isMissingThemePresetColumn(error: unknown) {
  const message = errorText(error, "").toLowerCase();
  return message.includes("theme_preset") && (message.includes("column") || message.includes("does not exist"));
}

function withoutThemePreset(payload: Record<string, unknown>) {
  const rest = { ...payload };
  delete rest.theme_preset;
  return rest;
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
    theme_preset: defaults.themePreset,
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
  const themePreset = ThemePresetSchema.safeParse(row.theme_preset);

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
    themePreset: (themePreset.success ? themePreset.data : defaults.themePreset) as ThemePreset,
  };
}

async function selectByUserId(userId: string) {
  const supabase = getSupabaseServiceRoleClient();

  const full = await supabase
    .from("admin_settings")
    .select(SETTINGS_SELECT_WITH_THEME)
    .eq("user_id", userId)
    .maybeSingle();

  if (!full.error) {
    return { data: full.data as Record<string, unknown> | null, hasThemeColumn: true, error: null as unknown };
  }

  if (!isMissingThemePresetColumn(full.error)) {
    return { data: null, hasThemeColumn: true, error: full.error as unknown };
  }

  const legacy = await supabase
    .from("admin_settings")
    .select(SETTINGS_SELECT_LEGACY)
    .eq("user_id", userId)
    .maybeSingle();

  return {
    data: (legacy.data as Record<string, unknown> | null) ?? null,
    hasThemeColumn: false,
    error: legacy.error as unknown,
  };
}

async function ensureRow(userId: string) {
  const supabase = getSupabaseServiceRoleClient();
  const existing = await selectByUserId(userId);

  if (existing.error) {
    if (isMissingAdminSettingsSchema(existing.error)) {
      return getDefaultAdminSettings();
    }
    throw new Error(`Failed to load settings: ${errorText(existing.error, "Unknown error")}`);
  }

  if (existing.data) {
    return mapRow(existing.data);
  }

  const insertPayload = existing.hasThemeColumn ? dbDefaults(userId) : withoutThemePreset(dbDefaults(userId));
  const selectColumns = existing.hasThemeColumn ? SETTINGS_SELECT_WITH_THEME : SETTINGS_SELECT_LEGACY;

  const inserted = await supabase
    .from("admin_settings")
    .insert(insertPayload)
    .select(selectColumns)
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
    case "themePreset":
      return ThemePresetSchema.parse(value);
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
    case "themePreset":
      return { theme_preset: validateFieldValue(field, value) };
    default:
      return {};
  }
}

async function updateSettingForUser(
  userId: string,
  field: AdminSettingField,
  value: unknown,
  actorRole: "admin" | "staff" | "developer",
) {
  await assertUiWriteAllowed({
    path: "/admin/settings",
    actorRole,
  });

  const supabase = getSupabaseServiceRoleClient();
  const payload = {
    ...dbDefaults(userId),
    ...toUpdatePayload(field, value),
  };

  const fullUpdate = await supabase
    .from("admin_settings")
    .upsert(payload, { onConflict: "user_id" })
    .select(SETTINGS_SELECT_WITH_THEME)
    .single();

  if (!fullUpdate.error) {
    return mapRow(fullUpdate.data as unknown as Record<string, unknown>);
  }

  if (!isMissingThemePresetColumn(fullUpdate.error)) {
    if (isMissingAdminSettingsSchema(fullUpdate.error)) {
      throw new Error(
        "ยังไม่พบตาราง admin_settings ในฐานข้อมูล กรุณารันไฟล์ sql/ensure-admin-settings.sql ใน Supabase SQL Editor ก่อนบันทึก",
      );
    }
    throw new Error(`Failed to update settings: ${errorText(fullUpdate.error, "Unknown error")}`);
  }

  if (field === "themePreset") {
    throw new Error("ยังไม่พบคอลัมน์ theme_preset ในฐานข้อมูล กรุณารัน sql/ensure-admin-settings.sql ใน Supabase SQL Editor");
  }

  const legacyPayload = withoutThemePreset(payload);
  const legacyUpdate = await supabase
    .from("admin_settings")
    .upsert(legacyPayload, { onConflict: "user_id" })
    .select(SETTINGS_SELECT_LEGACY)
    .single();

  if (legacyUpdate.error) {
    if (isMissingAdminSettingsSchema(legacyUpdate.error)) {
      throw new Error(
        "ยังไม่พบตาราง admin_settings ในฐานข้อมูล กรุณารันไฟล์ sql/ensure-admin-settings.sql ใน Supabase SQL Editor ก่อนบันทึก",
      );
    }
    throw new Error(`Failed to update settings: ${errorText(legacyUpdate.error, "Unknown error")}`);
  }

  return mapRow(legacyUpdate.data as unknown as Record<string, unknown>);
}

export async function getAdminSettings() {
  const user = await requireAdmin();
  return ensureRow(user.id);
}

export async function getAdminSettingsApi() {
  const user = await requireAdminApi();
  return ensureRow(user.id);
}

export async function updateAdminSetting(field: unknown, value: unknown) {
  const user = await requireAdmin();
  const actor = await getAdminActor();
  if (!actor) {
    throw new Error("Unauthorized");
  }
  const parsedField = SettingsFieldSchema.parse(field);
  return updateSettingForUser(user.id, parsedField, value, actor.role);
}

export async function updateAdminSettingApi(field: unknown, value: unknown) {
  const user = await requireAdminApi();
  const actor = await getAdminActor();
  if (!actor) {
    throw new Error("Unauthorized");
  }
  const parsedField = SettingsFieldSchema.parse(field);
  return updateSettingForUser(user.id, parsedField, value, actor.role);
}
