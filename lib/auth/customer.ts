import { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { getSupabaseServerClient } from "../supabase/server";

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

export type CustomerActor = {
  user: User;
  role: "customer";
};

export async function getCustomerSession() {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
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
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

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
