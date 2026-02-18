import { redirect } from "next/navigation";

import { getSupabaseServerClient } from "../supabase/server";

type AdminRole = "admin" | "staff";

export async function getAdminSession() {
  try {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      return null;
    }

    return data.session;
  } catch {
    return null;
  }
}

export async function requireAdmin() {
  const session = await getAdminSession();

  if (!session) {
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
    .eq("id", session.user.id)
    .maybeSingle();

  const allowedRoles: AdminRole[] = ["admin", "staff"];
  const role = profile?.role as string | undefined;

  if (error || !role || !allowedRoles.includes(role as AdminRole)) {
    redirect("/login?error=not_authorized");
  }

  return session;
}
