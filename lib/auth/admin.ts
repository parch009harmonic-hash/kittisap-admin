import { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { getSupabaseServerClient } from "../supabase/server";

export type AdminRole = "admin" | "staff" | "developer";

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

async function resolveAdminRole(userId: string) {
  const supabase = await getSupabaseServerClient();
  const { data: profile, error } = await retryOnTransient(async () => {
    return await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
  });

  const role = profile?.role as string | undefined;
  const normalizedRole = (role ?? "") as AdminRole;
  const isAllowed = !error && (normalizedRole === "admin" || normalizedRole === "staff");

  return { isAllowed, role: isAllowed ? (normalizedRole as "admin" | "staff") : null, error };
}

export type AdminActor = {
  user: User;
  role: "admin" | "staff";
};

type DeveloperActor = {
  user: User;
  role: "admin" | "developer";
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
  if (!roleResult.isAllowed || !roleResult.role) {
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
      } else {
        const supabase = await getSupabaseServerClient();
        const { data: profile } = await retryOnTransient(async () => {
          return await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
        });
        if ((profile?.role as string | undefined) === "developer") {
          actor = { user, role: "developer" };
        }
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
      } else {
        const supabase = await getSupabaseServerClient();
        const { data: profile } = await retryOnTransient(async () => {
          return await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
        });
        if ((profile?.role as string | undefined) === "developer") {
          actor = { user, role: "developer" };
        }
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
