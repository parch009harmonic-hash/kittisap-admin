import "server-only";

import { headers } from "next/headers";

import type { AdminRole } from "../auth/admin";
import { listUiMaintenanceRules } from "../db/ui-maintenance";
import { detectUiPlatformFromUserAgent, normalizeUiPath } from "./ui-maintenance";

export class UiMaintenanceLockedError extends Error {
  readonly path: string;
  readonly status: number;
  readonly code: "UI_MAINTENANCE_LOCKED";

  constructor(path: string, message: string) {
    super(message);
    this.name = "UiMaintenanceLockedError";
    this.path = path;
    this.status = 423;
    this.code = "UI_MAINTENANCE_LOCKED";
  }
}

export function isUiMaintenanceLockedError(error: unknown): error is UiMaintenanceLockedError {
  return error instanceof UiMaintenanceLockedError;
}

async function getRequestUserAgent() {
  try {
    const headerStore = await headers();
    return headerStore.get("user-agent") ?? "";
  } catch {
    return "";
  }
}

export async function assertUiWriteAllowed(input: {
  path: string;
  actorRole: AdminRole;
  userAgent?: string | null;
}) {
  const normalizedPath = normalizeUiPath(input.path);
  if (!normalizedPath) {
    return;
  }

  if (input.actorRole !== "admin" && input.actorRole !== "staff") {
    return;
  }

  const userAgent = input.userAgent ?? (await getRequestUserAgent());
  const platform = detectUiPlatformFromUserAgent(userAgent);
  const rules = await listUiMaintenanceRules({ bypassCache: true });
  const matchedRule = rules.find((item) => item.path === normalizedPath);
  const blocked = Boolean(
    matchedRule &&
      matchedRule.enabled &&
      matchedRule.roles.includes(input.actorRole) &&
      matchedRule.platforms.includes(platform),
  );

  if (!blocked) {
    return;
  }

  throw new UiMaintenanceLockedError(
    normalizedPath,
    matchedRule?.message?.trim() || "This page is temporarily under maintenance.",
  );
}
