"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { getSupabaseBrowserClient } from "../../../lib/supabase/client";
import type { AppLocale } from "../../../lib/i18n/locale";

type EmailVerifyPendingCardProps = {
  locale: AppLocale;
  useLocalePrefix?: boolean;
};

function withLocale(locale: AppLocale, path: string, useLocalePrefix: boolean) {
  if (!useLocalePrefix && locale === "th") {
    return path;
  }
  return `/${locale}${path}`;
}

export function EmailVerifyPendingCard({ locale, useLocalePrefix = false }: EmailVerifyPendingCardProps) {
  const searchParams = useSearchParams();
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const email = useMemo(() => searchParams.get("email")?.trim() ?? "", [searchParams]);
  const loginPath = withLocale(locale, "/auth/login", useLocalePrefix);

  async function handleResend() {
    if (!email) {
      setError(locale === "th" ? "ไม่พบอีเมล กรุณากลับไปหน้าสมัครสมาชิก" : "Email not found. Please return to register.");
      return;
    }

    setSending(true);
    setError(null);
    setMessage(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
      if (!siteUrl) {
        setError("Missing NEXT_PUBLIC_SITE_URL");
        return;
      }

      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: `${siteUrl}/auth/callback?intent=customer&locale=${locale}`,
        },
      });

      if (resendError) {
        setError(resendError.message);
        return;
      }

      setMessage(
        locale === "th"
          ? "ส่งอีเมลยืนยันใหม่แล้ว กรุณาตรวจสอบกล่องจดหมายหรือสแปม"
          : "Confirmation email sent. Please check inbox or spam folder.",
      );
    } catch {
      setError(locale === "th" ? "ส่งอีเมลยืนยันไม่สำเร็จ" : "Failed to resend confirmation email.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="min-h-[100dvh] bg-[radial-gradient(circle_at_top_right,_#5c3f00_0%,_#1a1200_30%,_#090909_68%)] px-3 py-3 text-amber-50 md:px-4 md:py-10">
      <section className="mx-auto flex w-full max-w-md min-h-[calc(100dvh-1.5rem)] flex-col justify-center rounded-3xl border border-amber-500/35 bg-black/55 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur md:min-h-0 md:p-8">
        <p className="text-xs uppercase tracking-[0.24em] text-amber-300/80">
          {locale === "th" ? "ยืนยันอีเมล" : "Email Verification"}
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-amber-300">
          {locale === "th" ? "ยืนยันอีเมลแล้ว?" : "Email confirmed?"}
        </h1>
        <p className="mt-2 text-sm text-amber-100/75">
          {locale === "th"
            ? "หลังยืนยันอีเมลแล้ว ให้กดปุ่มด้านล่างเพื่อกลับไปเข้าสู่ระบบอีกครั้ง"
            : "After confirming your email, use the button below to return to login."}
        </p>
        {email ? <p className="mt-2 text-sm text-amber-200">{email}</p> : null}

        {error ? <p className="mt-4 rounded-xl border border-rose-400/35 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p> : null}
        {message ? <p className="mt-4 rounded-xl border border-emerald-400/35 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{message}</p> : null}

        <div className="mt-5 grid gap-3">
          <Link
            href={`${loginPath}${email ? `?email=${encodeURIComponent(email)}` : ""}`}
            className="inline-flex h-12 items-center justify-center rounded-full border border-amber-400/70 bg-gradient-to-r from-amber-500 to-yellow-400 px-5 text-base font-semibold text-zinc-950 shadow-[0_10px_24px_rgba(245,158,11,0.35)] transition hover:brightness-105 active:scale-95"
          >
            {locale === "th" ? "ยืนยันอีเมลแล้ว กดตรวจสอบอีกครั้ง" : "I confirmed my email, check again"}
          </Link>
          <button
            type="button"
            onClick={handleResend}
            disabled={sending}
            className="inline-flex h-12 items-center justify-center rounded-full border border-amber-500/35 bg-black/45 px-5 text-base font-semibold text-amber-100 transition hover:bg-black/60 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sending
              ? locale === "th"
                ? "กำลังส่ง..."
                : "Sending..."
              : locale === "th"
                ? "ส่งอีเมลยืนยันใหม่"
                : "Resend confirmation email"}
          </button>
        </div>
      </section>
    </main>
  );
}
