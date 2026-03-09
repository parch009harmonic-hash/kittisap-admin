"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type AccountLocale = "th" | "en" | "lo";
type KycStatus = "not_started" | "in_progress" | "pending_review" | "approved" | "rejected" | "blocked";

type KycProfileDto = {
  customerId?: string;
  kycStatus?: KycStatus;
  kycLevel?: string;
  approvedAt?: string | null;
  rejectedReason?: string | null;
  updatedAt?: string | null;
};

type KycSessionDto = {
  sessionId: string;
  purpose: string;
  status: string;
  expiresAt: string;
  reused?: boolean;
};

function localeFromPath(pathname: string): AccountLocale {
  if (pathname.startsWith("/en")) return "en";
  if (pathname.startsWith("/lo")) return "lo";
  return "th";
}

function withLocale(locale: AccountLocale, path: string) {
  if (locale === "th") return path;
  return `/${locale}${path}`;
}

function copy(locale: AccountLocale) {
  if (locale === "en") {
    return {
      title: "Identity Verification Required",
      subtitle: "Before using your customer account, please start KYC onboarding.",
      loading: "Loading KYC status...",
      start: "Start KYC",
      starting: "Starting...",
      refresh: "Refresh Status",
      goAccount: "Go to Account",
      goHome: "Back to Home",
      approved: "KYC approved. You can continue to account.",
      pending: "KYC is in progress. Continue verification steps.",
      rejected: "KYC was rejected. Please retry onboarding.",
      blocked: "KYC is blocked. Please contact support.",
      sessionCreated: "KYC session created.",
      sessionReused: "Existing KYC session resumed.",
      authRequired: "Session expired. Please sign in again.",
    };
  }

  if (locale === "lo") {
    return {
      title: "ຕ້ອງຢືນຢັນຕົວຕົນ",
      subtitle: "ກ່ອນໃຊ້ບັນຊີລູກຄ້າ ກະລຸນາເລີ່ມ KYC.",
      loading: "ກຳລັງໂຫຼດສະຖານະ KYC...",
      start: "ເລີ່ມ KYC",
      starting: "ກຳລັງເລີ່ມ...",
      refresh: "ໂຫຼດສະຖານະອີກຄັ້ງ",
      goAccount: "ໄປໜ້າບັນຊີ",
      goHome: "ກັບໜ້າຫຼັກ",
      approved: "KYC ຜ່ານແລ້ວ. ສາມາດໄປໜ້າບັນຊີໄດ້.",
      pending: "KYC ກຳລັງດຳເນີນການ. ກະລຸນາດຳເນີນຕໍ່.",
      rejected: "KYC ບໍ່ຜ່ານ. ກະລຸນາລອງໃໝ່.",
      blocked: "KYC ຖືກລະງັບ. ກະລຸນາຕິດຕໍ່ຝ່າຍຊ່ວຍເຫຼືອ.",
      sessionCreated: "ສ້າງເຊດຊັນ KYC ແລ້ວ.",
      sessionReused: "ໃຊ້ເຊດຊັນ KYC ເກົ່າທີ່ຍັງໃຊ້ໄດ້.",
      authRequired: "ເຊດຊັນໝົດອາຍຸ. ກະລຸນາເຂົ້າລະບົບໃໝ່.",
    };
  }

  return {
    title: "ต้องยืนยันตัวตนก่อนใช้งาน",
    subtitle: "ก่อนใช้งานบัญชีลูกค้า กรุณาเริ่มกระบวนการ KYC",
    loading: "กำลังโหลดสถานะ KYC...",
    start: "เริ่ม KYC",
    starting: "กำลังเริ่ม...",
    refresh: "รีเฟรชสถานะ",
    goAccount: "ไปหน้าบัญชี",
    goHome: "กลับหน้าแรก",
    approved: "KYC ผ่านแล้ว สามารถไปหน้าบัญชีได้",
    pending: "KYC อยู่ระหว่างดำเนินการ กรุณาทำขั้นตอนต่อ",
    rejected: "KYC ไม่ผ่าน กรุณาลองส่งใหม่",
    blocked: "KYC ถูกระงับ กรุณาติดต่อทีมงาน",
    sessionCreated: "สร้าง KYC session แล้ว",
    sessionReused: "ใช้ KYC session เดิมที่ยังไม่หมดอายุ",
    authRequired: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่",
  };
}

function normalizeStatus(value: unknown): KycStatus {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "in_progress") return "in_progress";
  if (normalized === "pending_review") return "pending_review";
  if (normalized === "approved") return "approved";
  if (normalized === "rejected") return "rejected";
  if (normalized === "blocked") return "blocked";
  return "not_started";
}

function isKycSchemaCacheMissing(message: string) {
  const lower = String(message ?? "").trim().toLowerCase();
  return lower.includes("customer_kyc_profiles")
    && (
      lower.includes("schema cache")
      || lower.includes("could not find the table")
      || lower.includes("does not exist")
    );
}

export function CustomerKycStartClient() {
  const pathname = usePathname();
  const locale = useMemo(() => localeFromPath(pathname), [pathname]);
  const t = useMemo(() => copy(locale), [locale]);
  const router = useRouter();

  const loginPath = withLocale(locale, "/auth/login");
  const accountPath = withLocale(locale, "/account");
  const homePath = withLocale(locale, "/");
  const schemaMissingMessage = locale === "en"
    ? "KYC tables are not ready yet. Please ask admin to run sql/ensure-customer-kyc.sql in Supabase SQL Editor."
    : locale === "lo"
      ? "ຕາຕະລາງ KYC ຍັງບໍ່ພ້ອມ. ກະລຸນາໃຫ້ແອດມິນຮັນ sql/ensure-customer-kyc.sql ໃນ Supabase SQL Editor."
      : "ตาราง KYC ยังไม่พร้อม กรุณาให้แอดมินรันไฟล์ sql/ensure-customer-kyc.sql ใน Supabase SQL Editor";
  const loadFailedMessage = locale === "en"
    ? "Failed to load KYC status"
    : locale === "lo"
      ? "ໂຫຼດສະຖານະ KYC ບໍ່ສຳເລັດ"
      : "โหลดสถานะ KYC ไม่สำเร็จ";
  const startFailedMessage = locale === "en"
    ? "Failed to start KYC"
    : locale === "lo"
      ? "ເລີ່ມ KYC ບໍ່ສຳເລັດ"
      : "เริ่ม KYC ไม่สำเร็จ";

  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [profile, setProfile] = useState<KycProfileDto | null>(null);
  const [session, setSession] = useState<KycSessionDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const mapKycErrorMessage = useCallback((code?: string, apiError?: string) => {
    const normalizedCode = String(code ?? "").trim().toUpperCase();
    const normalizedError = String(apiError ?? "").trim();
    if (normalizedCode === "AUTH_REQUIRED") {
      return t.authRequired;
    }
    if (normalizedCode === "KYC_SCHEMA_MISSING" || isKycSchemaCacheMissing(normalizedError)) {
      return schemaMissingMessage;
    }
    return normalizedError || loadFailedMessage;
  }, [loadFailedMessage, schemaMissingMessage, t.authRequired]);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/customer/kyc/session", { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as { ok?: boolean; code?: string; error?: string; data?: KycProfileDto } | null;
      if (response.status === 401) {
        router.replace(loginPath);
        return;
      }
      if (!response.ok || !payload?.ok) {
        throw new Error(mapKycErrorMessage(payload?.code, payload?.error));
      }
      setProfile(payload.data ?? null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : loadFailedMessage);
    } finally {
      setLoading(false);
    }
  }, [loadFailedMessage, loginPath, mapKycErrorMessage, router]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  async function startKyc() {
    if (starting) return;
    setStarting(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/customer/kyc/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose: "onboarding" }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; code?: string; error?: string; data?: KycSessionDto & { kycStatus?: KycStatus } }
        | null;

      if (response.status === 401) {
        setError(t.authRequired);
        router.replace(loginPath);
        return;
      }
      if (!response.ok || !payload?.ok || !payload.data) {
        throw new Error(mapKycErrorMessage(payload?.code, payload?.error) || startFailedMessage);
      }

      setSession(payload.data);
      setMessage(payload.data.reused ? t.sessionReused : t.sessionCreated);
      const nextStatus = normalizeStatus(payload.data.kycStatus);
      setProfile((prev) => ({
        ...(prev ?? {}),
        kycStatus: nextStatus,
      }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : startFailedMessage);
    } finally {
      setStarting(false);
    }
  }

  const kycStatus = normalizeStatus(profile?.kycStatus);
  const isApproved = kycStatus === "approved";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#5b3d00_0%,_#1a1305_35%,_#090909_70%)] px-4 py-8 text-slate-100">
      <section className="mx-auto w-full max-w-2xl rounded-3xl border border-amber-400/35 bg-black/60 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur">
        <p className="text-xs uppercase tracking-[0.18em] text-amber-300/80">KYC</p>
        <h1 className="mt-2 text-3xl font-semibold text-amber-200">{t.title}</h1>
        <p className="mt-2 text-sm text-slate-300/85">{t.subtitle}</p>

        {loading ? <p className="mt-5 text-sm text-amber-100/80">{t.loading}</p> : null}
        {error ? <p className="mt-5 rounded-xl border border-rose-400/40 bg-rose-500/15 px-4 py-3 text-sm text-rose-100">{error}</p> : null}
        {message ? <p className="mt-5 rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-100">{message}</p> : null}

        {!loading ? (
          <div className="mt-5 rounded-2xl border border-amber-300/25 bg-black/35 p-4">
            <p className="text-sm text-slate-300/85">
              {kycStatus === "approved"
                ? t.approved
                : kycStatus === "rejected"
                  ? t.rejected
                  : kycStatus === "blocked"
                    ? t.blocked
                    : t.pending}
            </p>
            {session ? (
              <div className="mt-3 rounded-xl border border-cyan-300/25 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100/90">
                <p>session: {session.sessionId}</p>
                <p>expires: {session.expiresAt}</p>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void startKyc()}
            disabled={starting || isApproved}
            className="inline-flex h-11 items-center justify-center rounded-full border border-amber-300/65 bg-gradient-to-r from-amber-500 to-yellow-300 px-6 text-sm font-semibold text-zinc-900 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {starting ? t.starting : t.start}
          </button>

          <button
            type="button"
            onClick={() => void loadStatus()}
            disabled={loading}
            className="inline-flex h-11 items-center justify-center rounded-full border border-slate-300/40 bg-slate-900/70 px-6 text-sm font-semibold text-slate-100 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t.refresh}
          </button>

          {isApproved ? (
            <Link
              href={accountPath}
              className="inline-flex h-11 items-center justify-center rounded-full border border-emerald-300/50 bg-emerald-500/20 px-6 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/30"
            >
              {t.goAccount}
            </Link>
          ) : null}

          <Link
            href={homePath}
            className="inline-flex h-11 items-center justify-center rounded-full border border-slate-300/35 bg-black/35 px-6 text-sm font-semibold text-slate-200 transition hover:bg-black/50"
          >
            {t.goHome}
          </Link>
        </div>
      </section>
    </main>
  );
}
