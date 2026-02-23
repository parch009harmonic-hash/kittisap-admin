import { createServerClient } from "@supabase/auth-helpers-nextjs";
import type { User } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function getSupabaseEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return { supabaseUrl, supabaseAnonKey };
}

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

function withCookies(source: NextResponse, destination: NextResponse): NextResponse {
  for (const cookie of source.cookies.getAll()) {
    destination.cookies.set(cookie);
  }

  return destination;
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeIntent(raw: string | null): "admin" | "customer" {
  return raw?.toLowerCase() === "customer" ? "customer" : "admin";
}

function normalizeLocale(raw: string | null): "th" | "en" {
  return raw?.toLowerCase() === "en" ? "en" : "th";
}

function customerPath(locale: "th" | "en", path: string) {
  if (locale === "th") return path;
  return `/${locale}${path}`;
}

function guessFullName(user: User) {
  return asString(user.user_metadata?.full_name)
    || asString(user.user_metadata?.name)
    || asString(user.user_metadata?.display_name)
    || asString(user.email).split("@")[0]
    || "";
}

function guessPhone(user: User) {
  return asString(user.user_metadata?.phone)
    || asString(user.user_metadata?.phone_number)
    || asString(user.phone);
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const intent = normalizeIntent(request.nextUrl.searchParams.get("intent"));
  const locale = normalizeLocale(request.nextUrl.searchParams.get("locale"));

  if (!code) {
    const target = intent === "customer"
      ? `${customerPath(locale, "/auth/login")}?error=oauth_code_missing`
      : "/login?error=oauth_code_missing";
    return NextResponse.redirect(new URL(target, request.url));
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

  const exchanged = await supabase.auth.exchangeCodeForSession(code).catch((error) => {
    if (isTransientNetworkError(error)) {
      return { data: null, error: new Error("network_unstable") };
    }
    return { data: null, error: new Error("oauth_failed") };
  });

  if (exchanged.error || !exchanged.data?.session) {
    const isNetwork = exchanged.error?.message === "network_unstable";
    const targetBase = intent === "customer" ? customerPath(locale, "/auth/login") : "/login";
    const res = NextResponse.redirect(new URL(`${targetBase}?error=${isNetwork ? "network_unstable" : "oauth_failed"}`, request.url));
    return withCookies(cookieResponse, res);
  }

  const user = exchanged.data.session.user;

  if (intent === "customer") {
    const { error: profileUpsertError } = await supabase
      .from("customer_profiles")
      .upsert(
        {
          id: user.id,
          full_name: guessFullName(user),
          phone: guessPhone(user),
        },
        { onConflict: "id" },
      );

    if (profileUpsertError) {
      const isNetwork = isTransientNetworkError(profileUpsertError);
      const res = NextResponse.redirect(
        new URL(`${customerPath(locale, "/auth/login")}?error=${isNetwork ? "network_unstable" : "profile_upsert_failed"}`, request.url),
      );
      return withCookies(cookieResponse, res);
    }

    const res = NextResponse.redirect(new URL(customerPath(locale, "/account"), request.url));
    return withCookies(cookieResponse, res);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = String(profile?.role ?? "").trim().toLowerCase();
  const isAllowed = role === "admin" || role === "staff" || role === "developer";

  if (profileError || !isAllowed) {
    const isNetwork = isTransientNetworkError(profileError);
    const res = NextResponse.redirect(new URL(`/login?error=${isNetwork ? "network_unstable" : "not_authorized"}`, request.url));
    return withCookies(cookieResponse, res);
  }

  const target = role === "developer" ? "/admin/developer" : "/admin";
  const res = NextResponse.redirect(new URL(target, request.url));
  return withCookies(cookieResponse, res);
}
