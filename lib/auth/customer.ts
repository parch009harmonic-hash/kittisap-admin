import { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { getSupabaseServerClient } from "../supabase/server";

const SUPABASE_TIMEOUT_MS = 15_000;
const SUPABASE_TRANSIENT_RETRIES = 1;

function isTransientNetworkError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error ?? "").toLowerCase();
  return (
    message.includes("timed out")
    || message.includes("enotfound")
    || message.includes("eai_again")
    || message.includes("fetch failed")
    || message.includes("connect timeout")
    || message.includes("und_err_connect_timeout")
  );
}

async function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number, label: string) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(promise),
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

async function runWithTransientRetry<T>(operation: () => PromiseLike<T>, label: string) {
  let lastError: unknown;

  for (let attempt = 0; attempt <= SUPABASE_TRANSIENT_RETRIES; attempt += 1) {
    try {
      return await withTimeout(operation(), SUPABASE_TIMEOUT_MS, label);
    } catch (error) {
      lastError = error;
      if (!isTransientNetworkError(error) || attempt >= SUPABASE_TRANSIENT_RETRIES) {
        throw error;
      }
      await new Promise((resolve) => {
        setTimeout(resolve, 250 * (attempt + 1));
      });
    }
  }

  throw lastError;
}

export type CustomerActor = {
  user: User;
  role: "customer";
};

export async function getCustomerSession() {
  const supabase = await getSupabaseServerClient();
  let authResult: Awaited<ReturnType<typeof supabase.auth.getUser>>;
  try {
    authResult = await runWithTransientRetry(() => supabase.auth.getUser(), "Supabase auth");
  } catch (error) {
    if (isTransientNetworkError(error)) {
      throw new Error("Network unstable");
    }
    throw error;
  }

  const { data, error } = authResult;
  if (error) {
    if (isTransientNetworkError(error)) {
      throw new Error("Network unstable");
    }
    return null;
  }
  return data.user ?? null;
}

export async function getCustomerActor(): Promise<CustomerActor | null> {
  const user = await getCustomerSession();
  if (!user) {
    return null;
  }

  const supabase = await getSupabaseServerClient();

  let profile: { role?: string } | null = null;
  let error: { message?: string } | null = null;

  try {
    const byId = await runWithTransientRetry(
      () => Promise.resolve(
        supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle(),
      ),
      "Profile role lookup",
    );
    profile = (byId.data as { role?: string } | null) ?? null;
    error = (byId.error as { message?: string } | null) ?? null;
  } catch (caught) {
    if (isTransientNetworkError(caught)) {
      throw new Error("Network unstable");
    }
    throw caught;
  }

  const missingColumn = String(error?.message ?? "").toLowerCase().includes("column")
    && String(error?.message ?? "").toLowerCase().includes("does not exist");

  if ((!profile && !error) || missingColumn) {
    try {
      const byUserId = await runWithTransientRetry(
        () => Promise.resolve(
          supabase
            .from("profiles")
            .select("role")
            .eq("user_id", user.id)
            .maybeSingle(),
        ),
        "Profile role fallback lookup",
      );

      if (!byUserId.error && byUserId.data) {
        profile = (byUserId.data as { role?: string } | null) ?? null;
        error = null;
      } else if (!error) {
        error = (byUserId.error as { message?: string } | null) ?? null;
      }
    } catch (caught) {
      if (isTransientNetworkError(caught)) {
        throw new Error("Network unstable");
      }
      throw caught;
    }
  }

  if (error) {
    if (isTransientNetworkError(error)) {
      throw new Error("Network unstable");
    }
    return {
      user,
      role: "customer",
    };
  }

  const role = String(profile?.role ?? "").trim().toLowerCase();
  if (role === "admin" || role === "staff" || role === "developer") {
    return null;
  }

  return {
    user,
    role: "customer",
  };
}

export async function requireCustomerApi() {
  const actor = await getCustomerActor();
  if (!actor) {
    throw new Error("Unauthorized");
  }
  return actor;
}

export async function requireCustomer() {
  let actor: CustomerActor | null = null;
  try {
    actor = await getCustomerActor();
  } catch (error) {
    if (error instanceof Error && error.message === "Network unstable") {
      redirect("/auth/login?error=network_unstable");
    }
    throw error;
  }

  if (!actor) {
    redirect("/auth/login?error=not_authorized");
  }

  return actor.user;
}
