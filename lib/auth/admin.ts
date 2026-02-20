import { redirect } from "next/navigation";

import { getSupabaseServerClient } from "../supabase/server";

type AdminRole = "admin" | "staff";

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

  let supabase;
  try {
    supabase = await getSupabaseServerClient();
  } catch {
    redirect("/login");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const allowedRoles: AdminRole[] = ["admin", "staff"];
  const role = profile?.role as string | undefined;

  if (error || !role || !allowedRoles.includes(role as AdminRole)) {
    redirect("/login?error=not_authorized");
  }

  return user;
}
