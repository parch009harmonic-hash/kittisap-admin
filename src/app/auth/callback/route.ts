import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { NextRequest, NextResponse } from "next/server";

function getSupabaseEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  return { supabaseUrl, supabaseAnonKey };
}

function withCookies(
  source: NextResponse,
  destination: NextResponse
): NextResponse {
  for (const cookie of source.cookies.getAll()) {
    destination.cookies.set(cookie);
  }

  return destination;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=oauth_code_missing", request.url)
    );
  }

  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();
  const cookieResponse = NextResponse.next();

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const cookie of cookiesToSet) {
          cookieResponse.cookies.set(cookie.name, cookie.value, cookie.options);
        }
      },
    },
  });

  const { data: authData, error: authError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (authError || !authData.session) {
    const res = NextResponse.redirect(new URL("/login?error=oauth_failed", request.url));
    return withCookies(cookieResponse, res);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", authData.session.user.id)
    .maybeSingle();

  const role = profile?.role as string | undefined;
  const isAllowed = role === "admin" || role === "staff";

  if (profileError || !isAllowed) {
    const res = NextResponse.redirect(
      new URL("/login?error=not_authorized", request.url)
    );
    return withCookies(cookieResponse, res);
  }

  const res = NextResponse.redirect(new URL("/admin", request.url));
  return withCookies(cookieResponse, res);
}
