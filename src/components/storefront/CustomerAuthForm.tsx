"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { AppLocale } from "../../../lib/i18n/locale";
import { getSupabaseBrowserClient } from "../../../lib/supabase/client";

type Mode = "login" | "register";

type CustomerAuthFormProps = {
  mode: Mode;
  locale?: AppLocale;
  useLocalePrefix?: boolean;
};

function text(mode: Mode, locale: AppLocale) {
  const isThai = locale === "th";
  const isLao = locale === "lo";

  if (mode === "register") {
    return {
      eyebrow: "Customer Register",
      title: isThai ? "สมัครสมาชิก" : isLao ? "ສະໝັກສະມາຊິກ" : "Create account",
      subtitle: isThai
        ? "สร้างบัญชีลูกค้าเพื่อสั่งซื้อสินค้าและติดตามออเดอร์"
        : isLao
          ? "ສ້າງບັນຊີລູກຄ້າເພື່ອສັ່ງຊື້ ແລະ ຕິດຕາມອໍເດີ"
          : "Create your customer account for faster checkout and order tracking.",
      action: isThai ? "สร้างบัญชี" : isLao ? "ສ້າງບັນຊີ" : "Create Account",
      switchLabel: isThai ? "มีบัญชีแล้ว? เข้าสู่ระบบ" : isLao ? "ມີບັນຊີແລ້ວ? ເຂົ້າລະບົບ" : "Already have an account? Sign in",
      success: isThai ? "สมัครสมาชิกสำเร็จ กำลังพาไปยังหน้าบัญชี..." : isLao ? "ສະໝັກສຳເລັດ ກຳລັງນຳທ່ານໄປໜ້າບັນຊີ..." : "Account created. Redirecting to your account...",
      continueWithGoogle: isThai ? "ดำเนินการต่อด้วย Google" : isLao ? "ດຳເນີນການຕໍ່ດ້ວຍ Google" : "Continue with Google",
      continueWithGoogleLoading: isThai ? "กำลังเชื่อมต่อ Google..." : isLao ? "ກຳລັງເຊື່ອມຕໍ່ Google..." : "Connecting to Google...",
      fullNamePlaceholder: isThai ? "ชื่อ-นามสกุล" : isLao ? "ຊື່-ນາມສະກຸນ" : "Full name",
      phonePlaceholder: isThai ? "เบอร์โทรศัพท์" : isLao ? "ເບີໂທລະສັບ" : "Phone number",
      emailPlaceholder: "you@example.com",
      passwordPlaceholder: "********",
      or: "OR",
      emailNotConfirmed: isThai ? "อีเมลยังไม่ยืนยัน กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ" : isLao ? "ອີເມວຍັງບໍ່ຖືກຢືນຢັນ ກະລຸນາຢືນຢັນອີເມວກ່ອນ" : "Email not confirmed. Please confirm your email before signing in.",
      resendConfirm: isThai ? "ส่งอีเมลยืนยันใหม่" : isLao ? "ສົ່ງອີເມວຢືນຢັນອີກຄັ້ງ" : "Resend confirmation email",
      resendConfirmSuccess: isThai ? "ส่งอีเมลยืนยันใหม่แล้ว กรุณาตรวจสอบกล่องจดหมาย" : isLao ? "ສົ່ງອີເມວຢືນຢັນແລ້ວ ກະລຸນາກວດກ່ອງຂໍ້ຄວາມ" : "Confirmation email sent. Please check your inbox.",
      resendConfirmNeedEmail: isThai ? "กรุณากรอกอีเมลก่อนส่งอีเมลยืนยัน" : isLao ? "ກະລຸນາກອກອີເມວກ່ອນສົ່ງ" : "Please enter your email first.",
    };
  }

  return {
    eyebrow: "Customer Login",
    title: isThai ? "เข้าสู่ระบบลูกค้า" : isLao ? "ເຂົ້າລະບົບລູກຄ້າ" : "Sign in",
    subtitle: isThai ? "เข้าสู่ระบบเพื่อดูโปรไฟล์และออเดอร์ของคุณ" : isLao ? "ເຂົ້າລະບົບເພື່ອເບິ່ງໂປຣໄຟລ໌ ແລະ ອໍເດີຂອງທ່ານ" : "Sign in to view your account and orders.",
    action: isThai ? "เข้าสู่ระบบ" : isLao ? "ເຂົ້າລະບົບ" : "Sign In",
    switchLabel: isThai ? "ยังไม่มีบัญชี? สมัครสมาชิก" : isLao ? "ຍັງບໍ່ມີບັນຊີ? ສະໝັກສະມາຊິກ" : "No account yet? Register",
    success: isThai ? "เข้าสู่ระบบสำเร็จ กำลังพาไปยังหน้าบัญชี..." : isLao ? "ເຂົ້າລະບົບສຳເລັດ ກຳລັງນຳໄປໜ້າບັນຊີ..." : "Signed in. Redirecting to your account...",
    continueWithGoogle: isThai ? "ดำเนินการต่อด้วย Google" : isLao ? "ດຳເນີນການຕໍ່ດ້ວຍ Google" : "Continue with Google",
    continueWithGoogleLoading: isThai ? "กำลังเชื่อมต่อ Google..." : isLao ? "ກຳລັງເຊື່ອມຕໍ່ Google..." : "Connecting to Google...",
    fullNamePlaceholder: isThai ? "ชื่อ-นามสกุล" : isLao ? "ຊື່-ນາມສະກຸນ" : "Full name",
    phonePlaceholder: isThai ? "เบอร์โทรศัพท์" : isLao ? "ເບີໂທລະສັບ" : "Phone number",
    emailPlaceholder: "you@example.com",
    passwordPlaceholder: "********",
    or: "OR",
    emailNotConfirmed: isThai ? "อีเมลยังไม่ยืนยัน กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ" : isLao ? "ອີເມວຍັງບໍ່ຖືກຢືນຢັນ ກະລຸນາຢືນຢັນອີເມວກ່ອນ" : "Email not confirmed. Please confirm your email before signing in.",
    resendConfirm: isThai ? "ส่งอีเมลยืนยันใหม่" : isLao ? "ສົ່ງອີເມວຢືນຢັນອີກຄັ້ງ" : "Resend confirmation email",
    resendConfirmSuccess: isThai ? "ส่งอีเมลยืนยันใหม่แล้ว กรุณาตรวจสอบกล่องจดหมาย" : isLao ? "ສົ່ງອີເມວຢືນຢັນແລ້ວ ກະລຸນາກວດກ່ອງຂໍ້ຄວາມ" : "Confirmation email sent. Please check your inbox.",
    resendConfirmNeedEmail: isThai ? "กรุณากรอกอีเมลก่อนส่งอีเมลยืนยัน" : isLao ? "ກະລຸນາກອກອີເມວກ່ອນສົ່ງ" : "Please enter your email first.",
  };
}

async function upsertProfile(input: { fullName?: string; phone?: string }) {
  const response = await fetch("/api/customer/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Failed to update profile");
  }
}

function withLocale(locale: AppLocale, path: string, useLocalePrefix: boolean) {
  if (!useLocalePrefix && locale === "th") {
    return path;
  }
  return `/${locale}${path}`;
}

export function CustomerAuthForm({ mode, locale = "th", useLocalePrefix = false }: CustomerAuthFormProps) {
  const router = useRouter();
  const t = useMemo(() => text(mode, locale), [mode, locale]);

  const accountPath = withLocale(locale, "/account", useLocalePrefix);
  const switchPath = withLocale(locale, mode === "register" ? "/auth/login" : "/auth/register", useLocalePrefix);
  const verifyEmailPath = withLocale(locale, "/auth/verify-email", useLocalePrefix);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendingConfirm, setResendingConfirm] = useState(false);
  const [pendingConfirmEmail, setPendingConfirmEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function isEmailNotConfirmedError(input: string) {
    return input.toLowerCase().includes("email not confirmed");
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailFromQuery = params.get("email");
    if (emailFromQuery && !email) {
      setEmail(emailFromQuery);
      setPendingConfirmEmail(emailFromQuery);
    }
    const errorCode = params.get("error");
    if (!errorCode) return;

    if (errorCode === "network_unstable") {
      setError("เครือข่ายไปยัง Supabase ไม่เสถียร กรุณาลองใหม่");
      return;
    }
    if (errorCode === "oauth_failed") {
      setError("เข้าสู่ระบบด้วย Google ไม่สำเร็จ");
      return;
    }
    if (errorCode === "profile_upsert_failed") {
      setError("เข้าสู่ระบบสำเร็จ แต่บันทึกข้อมูลลูกค้าไม่สำเร็จ กรุณาลองใหม่");
      return;
    }
    if (errorCode === "oauth_code_missing") {
      setError("ไม่พบ OAuth code ใน callback");
    }
  }, [email]);

  async function handlePasswordAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    setPendingConfirmEmail(null);

    try {
      const supabase = getSupabaseBrowserClient();

      if (mode === "register") {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
        if (!siteUrl) {
          setError("Missing NEXT_PUBLIC_SITE_URL");
          return;
        }
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${siteUrl}/auth/callback?intent=customer&locale=${locale}`,
            data: {
              full_name: fullName,
              phone,
            },
          },
        });

        if (signUpError) {
          setError(signUpError.message);
          return;
        }

        if (!data.session) {
          setMessage("สมัครสำเร็จ กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชี แล้วกลับมาเข้าสู่ระบบ");
          const normalizedEmail = email.trim();
          setPendingConfirmEmail(normalizedEmail);
          router.replace(`${verifyEmailPath}?email=${encodeURIComponent(normalizedEmail)}`);
          return;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          if (isEmailNotConfirmedError(signInError.message)) {
            setError(t.emailNotConfirmed);
            setPendingConfirmEmail(email.trim());
          } else {
            setError(signInError.message);
          }
          return;
        }
      }

      await upsertProfile({ fullName, phone });
      setMessage(t.success);
      router.replace(accountPath);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendConfirmation() {
    const normalizedEmail = (pendingConfirmEmail ?? email).trim();
    if (!normalizedEmail) {
      setError(t.resendConfirmNeedEmail);
      return;
    }

    setResendingConfirm(true);
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
        email: normalizedEmail,
        options: {
          emailRedirectTo: `${siteUrl}/auth/callback?intent=customer&locale=${locale}`,
        },
      });

      if (resendError) {
        setError(resendError.message);
        return;
      }

      setMessage(t.resendConfirmSuccess);
      setPendingConfirmEmail(normalizedEmail);
    } catch {
      setError("Unable to resend confirmation email");
    } finally {
      setResendingConfirm(false);
    }
  }

  async function handleGoogleAuth() {
    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
      if (!siteUrl) {
        setError("Missing NEXT_PUBLIC_SITE_URL");
        return;
      }

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${siteUrl}/auth/callback?intent=customer&locale=${locale}`,
        },
      });

      if (oauthError) {
        setError(oauthError.message);
      }
    } catch {
      setError("Unable to continue with Google");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[100dvh] bg-[radial-gradient(circle_at_top_right,_#5c3f00_0%,_#1a1200_30%,_#090909_68%)] px-3 py-3 text-amber-50 md:px-4 md:py-10">
      <section className="mx-auto flex w-full max-w-md min-h-[calc(100dvh-1.5rem)] flex-col justify-center rounded-3xl border border-amber-500/35 bg-black/55 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur md:min-h-0 md:p-8">
        <div className="mb-3 flex items-center justify-center">
          <Image
            src="/icon.png"
            alt="Kittisap"
            width={84}
            height={84}
            priority
            sizes="84px"
            className="h-20 w-20 rounded-2xl border border-amber-400/30 bg-black/40 p-1"
          />
        </div>

        <p className="text-xs uppercase tracking-[0.24em] text-amber-300/80">{t.eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold text-amber-300">{t.title}</h1>
        <p className="mt-2 text-sm text-amber-100/75">{t.subtitle}</p>

        {error ? <p className="mt-4 rounded-xl border border-rose-400/35 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p> : null}
        {pendingConfirmEmail ? (
          <button
            type="button"
            onClick={handleResendConfirmation}
            disabled={resendingConfirm}
            className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-amber-400/50 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-200 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {resendingConfirm ? "Sending..." : t.resendConfirm}
          </button>
        ) : null}
        {message ? <p className="mt-4 rounded-xl border border-emerald-400/35 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{message}</p> : null}

        <form className="mt-5 space-y-3" onSubmit={handlePasswordAuth}>
          {mode === "register" ? (
            <>
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder={t.fullNamePlaceholder}
                autoComplete="name"
                className="h-12 w-full rounded-xl border border-amber-500/35 bg-black/50 px-4 text-base text-amber-50 outline-none transition-all duration-200 focus:scale-[1.01] focus:border-amber-300 focus:shadow-[0_0_0_3px_rgba(251,191,36,0.14)]"
              />
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder={t.phonePlaceholder}
                autoComplete="tel"
                inputMode="tel"
                className="h-12 w-full rounded-xl border border-amber-500/35 bg-black/50 px-4 text-base text-amber-50 outline-none transition-all duration-200 focus:scale-[1.01] focus:border-amber-300 focus:shadow-[0_0_0_3px_rgba(251,191,36,0.14)]"
              />
            </>
          ) : null}

          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
            placeholder={t.emailPlaceholder}
            className="h-12 w-full rounded-xl border border-amber-500/35 bg-black/50 px-4 text-base text-amber-50 outline-none transition-all duration-200 focus:scale-[1.01] focus:border-amber-300 focus:shadow-[0_0_0_3px_rgba(251,191,36,0.14)]"
          />

          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder={t.passwordPlaceholder}
            className="h-12 w-full rounded-xl border border-amber-500/35 bg-black/50 px-4 text-base text-amber-50 outline-none transition-all duration-200 focus:scale-[1.01] focus:border-amber-300 focus:shadow-[0_0_0_3px_rgba(251,191,36,0.14)]"
          />

          <button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-full border border-amber-400/70 bg-gradient-to-r from-amber-500 to-yellow-400 px-5 text-base font-semibold text-zinc-950 shadow-[0_10px_24px_rgba(245,158,11,0.35)] transition active:scale-95 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t.action}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-amber-500/30" />
          <span className="text-xs uppercase tracking-[0.18em] text-amber-100/60">{t.or}</span>
          <span className="h-px flex-1 bg-amber-500/30" />
        </div>

      <button
        type="button"
        onClick={handleGoogleAuth}
        disabled={loading}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-5 text-base font-semibold text-slate-800 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
            <path fill="#EA4335" d="M12 10.2v4h5.65c-.24 1.29-.97 2.39-2.06 3.12l3.33 2.58c1.94-1.79 3.08-4.43 3.08-7.58 0-.73-.07-1.43-.19-2.1H12z" />
            <path fill="#4285F4" d="M12 22c2.78 0 5.1-.92 6.8-2.5l-3.33-2.58c-.92.62-2.1.98-3.47.98-2.67 0-4.92-1.8-5.73-4.22H2.84v2.65A9.99 9.99 0 0 0 12 22z" />
            <path fill="#FBBC05" d="M6.27 13.68a6 6 0 0 1 0-3.36V7.67H2.84a9.99 9.99 0 0 0 0 8.66l3.43-2.65z" />
            <path fill="#34A853" d="M12 6.1c1.51 0 2.87.52 3.94 1.53l2.95-2.95C17.09 2.98 14.77 2 12 2a9.99 9.99 0 0 0-9.16 5.67l3.43 2.65C7.08 7.9 9.33 6.1 12 6.1z" />
          </svg>
          {loading ? t.continueWithGoogleLoading : t.continueWithGoogle}
      </button>

        <Link href={switchPath} className="mt-4 block text-center text-sm text-amber-200/90 hover:text-amber-100">
          {t.switchLabel}
        </Link>
      </section>
    </main>
  );
}
