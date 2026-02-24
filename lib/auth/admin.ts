import { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { getSupabaseServerClient } from "../supabase/server";
import { getSupabaseServiceRoleClient } from "../supabase/service";

export type AdminRole = "admin" | "staff" | "developer";

type ProfilesRoleLookup = {
  role: AdminRole | null;
  error: unknown;
  missingColumn: boolean;
};

function isTransientNetworkError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error ?? "").toLowerCase();
  return (
    message.includes("enotfound") ||
    message.includes("eai_again") ||
    message.includes("fetch failed") ||
    message.includes("connect timeout") ||
    message.includes("und_err_connect_timeout")
  );
}

function isSupabaseNetworkUnstable(error: unknown) {
  return isTransientNetworkError(error);
}

function isMissingProfileColumnError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error ?? "").toLowerCase();
  return message.includes("column") && message.includes("does not exist");
}

function normalizeAdminRole(value: unknown): AdminRole | null {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "admin" || normalized === "staff" || normalized === "developer") {
    return normalized as AdminRole;
  }
  return null;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retryOnTransient<T>(task: () => Promise<T>, attempts = 3, delayMs = 250): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (!isTransientNetworkError(error) || i === attempts - 1) {
        throw error;
      }
      await sleep(delayMs * (i + 1));
    }
  }
  throw lastError;
}

async function fetchProfilesRole(
  userId: string,
  column: "id" | "user_id",
): Promise<ProfilesRoleLookup> {
  const supabase = getSupabaseServiceRoleClient();
  const result = await retryOnTransient(async () => {
    return await supabase
      .from("profiles")
      .select("role,updated_at,created_at")
      .eq(column, userId)
      .order("updated_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false, nullsFirst: false })
      .limit(20);
  });

  if (result.error) {
    return {
      role: null,
      error: result.error,
      missingColumn: isMissingProfileColumnError(result.error),
    };
  }

  for (const row of (result.data ?? []) as Array<Record<string, unknown>>) {
    const role = normalizeAdminRole(row.role);
    if (role) {
      return { role, error: null, missingColumn: false };
    }
  }

  return { role: null, error: null, missingColumn: false };
}

async function resolveAdminRole(userId: string) {
  const byId = await fetchProfilesRole(userId, "id");
  let role = byId.role;
  let error = byId.error;

  if (!role || byId.missingColumn) {
    const byUserId = await fetchProfilesRole(userId, "user_id");
    if (byUserId.role) {
      role = byUserId.role;
      error = null;
    } else if (!error) {
      error = byUserId.error;
    }
  }

  return { role, error };
}

export type AdminActor = {
  user: User;
  role: "admin" | "staff";
};

type DeveloperActor = {
  user: User;
  role: "admin" | "developer";
};

export type BackofficeActor = {
  user: User;
  role: AdminRole;
};

export async function getAdminSession() {
  try {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await retryOnTransient(async () => await supabase.auth.getUser());

    if (error) {
      if (isSupabaseNetworkUnstable(error)) {
        throw new Error("Network unstable");
      }
      return null;
    }

    return data.user ?? null;
  } catch (error) {
    if (isSupabaseNetworkUnstable(error)) {
      throw new Error("Network unstable");
    }
    return null;
  }
}

export async function getAdminActor(): Promise<AdminActor | null> {
  const user = await getAdminSession();
  if (!user) {
    return null;
  }

  const roleResult = await resolveAdminRole(user.id);
  if (!roleResult.role || (roleResult.role !== "admin" && roleResult.role !== "staff")) {
    return null;
  }

  return {
    user,
    role: roleResult.role,
  };
}

export async function getBackofficeActor(): Promise<BackofficeActor | null> {
  const user = await getAdminSession();
  if (!user) {
    return null;
  }

  const roleResult = await resolveAdminRole(user.id);
  if (!roleResult.role) {
    return null;
  }

  return {
    user,
    role: roleResult.role,
  };
}

export async function requireAdmin() {
  let actor: AdminActor | null = null;
  try {
    actor = await getAdminActor();
  } catch (error) {
    if (isSupabaseNetworkUnstable(error) || (error instanceof Error && error.message === "Network unstable")) {
      redirect("/login?error=network_unstable");
    }
    throw error;
  }
  if (!actor) {
    redirect("/login?error=not_authorized");
  }

  return actor.user;
}

export async function requireBackoffice() {
  let actor: BackofficeActor | null = null;
  try {
    actor = await getBackofficeActor();
  } catch (error) {
    if (isSupabaseNetworkUnstable(error) || (error instanceof Error && error.message === "Network unstable")) {
      redirect("/login?error=network_unstable");
    }
    throw error;
  }

  if (!actor) {
    redirect("/login?error=not_authorized");
  }

  return actor;
}

export async function requireAdminApi() {
  let actor: AdminActor | null = null;
  try {
    actor = await getAdminActor();
  } catch (error) {
    if (isSupabaseNetworkUnstable(error) || (error instanceof Error && error.message === "Network unstable")) {
      throw new Error("Network unstable");
    }
    throw error;
  }
  if (!actor) {
    throw new Error("Unauthorized");
  }

  return actor.user;
}

export async function requireDeveloper(options?: { allowAdmin?: boolean }) {
  const allowAdmin = options?.allowAdmin ?? false;
  let actor: DeveloperActor | null = null;
  try {
    const user = await getAdminSession();
    if (user) {
      const roleResult = await resolveAdminRole(user.id);
      if (roleResult.role === "admin") {
        actor = { user, role: "admin" };
      } else if (roleResult.role === "developer") {
        actor = { user, role: "developer" };
      }
    }
  } catch (error) {
    if (isSupabaseNetworkUnstable(error) || (error instanceof Error && error.message === "Network unstable")) {
      redirect("/login?error=network_unstable");
    }
    throw error;
  }

  if (!actor) {
    redirect("/login?error=not_authorized");
  }

  if (actor.role === "developer" || (allowAdmin && actor.role === "admin")) {
    return actor;
  }

  redirect("/admin?error=developer_only");
}

export async function requireDeveloperApi(options?: { allowAdmin?: boolean }) {
  const allowAdmin = options?.allowAdmin ?? false;
  let actor: DeveloperActor | null = null;
  try {
    const user = await getAdminSession();
    if (user) {
      const roleResult = await resolveAdminRole(user.id);
      if (roleResult.role === "admin") {
        actor = { user, role: "admin" };
      } else if (roleResult.role === "developer") {
        actor = { user, role: "developer" };
      }
    }
  } catch (error) {
    if (isSupabaseNetworkUnstable(error) || (error instanceof Error && error.message === "Network unstable")) {
      throw new Error("Network unstable");
    }
    throw error;
  }

  if (!actor) {
    throw new Error("Unauthorized");
  }

  if (actor.role === "developer" || (allowAdmin && actor.role === "admin")) {
    return actor;
  }

  throw new Error("Developer only");
}
