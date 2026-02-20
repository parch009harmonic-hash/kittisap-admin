import { redirect } from "next/navigation";

import { getSupabaseServerClient } from "../supabase/server";

type AdminRole = "admin" | "staff";
const allowedRoles: AdminRole[] = ["admin", "staff"];

async function resolveAdminRole(userId: string) {
  const supabase = await getSupabaseServerClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  const role = profile?.role as string | undefined;
  const isAllowed = !error && Boolean(role) && allowedRoles.includes(role as AdminRole);

  return { isAllowed, role: role ?? null, error };
}

export async function getAdminSession() {
  try {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      return null;
    }

    return data.user ?? null;
  } catch {
    return null;
  }
}

export async function requireAdmin() {
  const user = await getAdminSession();

  if (!user) {
    redirect("/login");
  }

  try {
    const { isAllowed } = await resolveAdminRole(user.id);
    if (!isAllowed) {
      redirect("/login?error=not_authorized");
    }
  } catch {
    redirect("/login");
  }

  return user;
}

export async function requireAdminApi() {
  const user = await getAdminSession();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const { isAllowed } = await resolveAdminRole(user.id);
  if (!isAllowed) {
    throw new Error("Not authorized to manage users");
  }

  return user;
}
