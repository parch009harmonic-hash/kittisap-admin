import "server-only";

import { getSupabaseServiceRoleClient } from "../supabase/service";
import {
  getDefaultUiMaintenanceRule,
  type UiMaintenanceRule,
  type UiPlatform,
  type UiRole,
  UI_MAINTENANCE_PATHS,
} from "../maintenance/ui-maintenance";

type Row = {
  path: string;
  enabled: boolean;
  roles: string[] | null;
  platforms: string[] | null;
  message: string | null;
  updated_at: string | null;
  updated_by: string | null;
};

function toRoleList(value: string[] | null | undefined): UiRole[] {
  const normalized = (value ?? []).filter((item): item is UiRole => item === "admin" || item === "staff");
  return normalized.length > 0 ? normalized : ["admin", "staff"];
}

function toPlatformList(value: string[] | null | undefined): UiPlatform[] {
  const normalized = (value ?? []).filter(
    (item): item is UiPlatform => item === "windows" || item === "android" || item === "ios",
  );
  return normalized.length > 0 ? normalized : ["windows", "android", "ios"];
}

function fromRow(row: Row): UiMaintenanceRule {
  const fallback = getDefaultUiMaintenanceRule(row.path);
  return {
    path: row.path,
    enabled: Boolean(row.enabled),
    roles: toRoleList(row.roles),
    platforms: toPlatformList(row.platforms),
    message: row.message?.trim() || fallback.message,
    updatedAt: row.updated_at ?? null,
    updatedBy: row.updated_by ?? null,
  };
}

function isMissingTable(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error ?? "").toLowerCase();
  return message.includes("ui_maintenance_rules") && (message.includes("does not exist") || message.includes("schema cache"));
}

export async function listUiMaintenanceRules() {
  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("ui_maintenance_rules")
    .select("path,enabled,roles,platforms,message,updated_at,updated_by")
    .order("path", { ascending: true });

  if (error) {
    if (isMissingTable(error)) {
      return UI_MAINTENANCE_PATHS.map((path) => getDefaultUiMaintenanceRule(path));
    }
    throw new Error(error.message);
  }

  const byPath = new Map<string, UiMaintenanceRule>();
  for (const row of (data ?? []) as Row[]) {
    byPath.set(row.path, fromRow(row));
  }

  return UI_MAINTENANCE_PATHS.map((path) => byPath.get(path) ?? getDefaultUiMaintenanceRule(path));
}

export async function upsertUiMaintenanceRule(input: {
  path: string;
  enabled: boolean;
  roles: UiRole[];
  platforms: UiPlatform[];
  message: string;
  updatedBy: string;
}) {
  const supabase = getSupabaseServiceRoleClient();
  const payload = {
    path: input.path,
    enabled: input.enabled,
    roles: input.roles,
    platforms: input.platforms,
    message: input.message.trim() || getDefaultUiMaintenanceRule(input.path).message,
    updated_by: input.updatedBy,
  };

  const { data, error } = await supabase
    .from("ui_maintenance_rules")
    .upsert(payload, { onConflict: "path" })
    .select("path,enabled,roles,platforms,message,updated_at,updated_by")
    .single();

  if (error) {
    if (isMissingTable(error)) {
      throw new Error("Missing ui_maintenance_rules table. Run sql/ensure-ui-maintenance.sql first.");
    }
    throw new Error(error.message);
  }

  return fromRow(data as Row);
}
