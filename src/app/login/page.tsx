"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getSupabaseBrowserClient } from "../../../lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "network_unstable") {
      setError("Network to Supabase unstable. โปรดตรวจสอบอินเทอร์เน็ต/DNS แล้วลองใหม่อีกครั้ง.");
      return;
    }
    if (params.get("error") === "not_authorized") {
      setError("ไม่มีสิทธิ์เข้าใช้งานหน้านี้ / You are not authorized.");
      return;
    }
    if (params.get("error") === "oauth_failed") {
      setError("เข้าสู่ระบบด้วย Google ไม่สำเร็จ / Google sign-in failed.");
      return;
    }
    setError(null);
  }, []);

  async function handlePasswordSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(signInError.message);
        return;
      }

      router.replace("/admin");
      router.refresh();
    } catch {
      setError("ไม่สามารถเข้าสู่ระบบได้ในขณะนี้ / Unable to sign in right now.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError(null);
    setIsLoading(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
      if (!siteUrl) {
        setError("Missing NEXT_PUBLIC_SITE_URL");
        return;
      }

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${siteUrl}/auth/callback` },
      });

      if (oauthError) {
        setError(oauthError.message);
      }
    } catch {
      setError("ไม่สามารถเข้าสู่ระบบด้วย Google ได้ / Unable to continue with Google.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="app-surface flex min-h-screen items-center justify-center px-4 py-10">
      <section className="sst-card-soft w-full max-w-md rounded-3xl p-6 md:p-8">
        <p className="text-xs uppercase tracking-[0.3em] text-blue-600">Admin Access</p>
        <h1 className="mt-3 font-heading text-4xl font-semibold tracking-tight text-slate-900">Sign In</h1>
        <p className="mt-2 text-sm text-slate-600">เข้าสู่ระบบผู้ดูแล / Admin authentication</p>

        {error && (
          <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handlePasswordSignIn} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="input-base"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
              placeholder="********"
              className="input-base"
            />
          </label>
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-lg transition hover:bg-blue-700 disabled:opacity-60"
          >
            {isLoading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-xs uppercase tracking-[0.2em] text-slate-500">OR</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-900 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
        >
          Continue with Google
        </button>
      </section>
    </main>
  );
}
