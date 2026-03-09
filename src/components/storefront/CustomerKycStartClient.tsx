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

type KycCompletePayload = {
  ok?: boolean;
  code?: string;
  error?: string;
  data?: {
    sessionId?: string;
    status?: string;
    kycStatus?: KycStatus;
    approvedAt?: string | null;
  };
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
      scan: "Scan Face",
      scanning: "Scanning...",
      cameraHint: "System will open the camera and verify your face automatically.",
    };
  }

  if (locale === "lo") {
    return {
      title: "ຕ້ອງຢືນຢັນຕົວຕົນກ່ອນໃຊ້ງານ",
      subtitle: "ກ່ອນໃຊ້ບັນຊີລູກຄ້າ ກະລຸນາເລີ່ມ KYC",
      loading: "ກຳລັງໂຫຼດສະຖານະ KYC...",
      start: "ເລີ່ມ KYC",
      starting: "ກຳລັງເລີ່ມ...",
      refresh: "ຣີເຟຣຊສະຖານະ",
      goAccount: "ໄປບັນຊີ",
      goHome: "ກັບໜ້າຫຼັກ",
      approved: "KYC ຜ່ານແລ້ວ ສາມາດເຂົ້າບັນຊີໄດ້",
      pending: "KYC ກຳລັງດຳເນີນການ ກະລຸນາເຮັດຂັ້ນຕອນຕໍ່",
      rejected: "KYC ບໍ່ຜ່ານ ກະລຸນາລອງໃໝ່",
      blocked: "KYC ຖືກບລັອກ ກະລຸນາຕິດຕໍ່ທີມງານ",
      sessionCreated: "ສ້າງ KYC session ແລ້ວ",
      sessionReused: "ນຳ KYC session ເກົ່າກັບມາໃຊ້",
      authRequired: "ເຊສຊັນໝົດອາຍຸ ກະລຸນາເຂົ້າລະບົບໃໝ່",
      scan: "ສະແກນໃບໜ້າ",
      scanning: "ກຳລັງສະແກນ...",
      cameraHint: "ລະບົບຈະເປີດກ້ອງ ແລະກວດໃບໜ້າອັດຕະໂນມັດ",
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
    rejected: "KYC ไม่ผ่าน กรุณาลองใหม่",
    blocked: "KYC ถูกระงับ กรุณาติดต่อทีมงาน",
    sessionCreated: "สร้าง KYC session แล้ว",
    sessionReused: "ใช้ KYC session เดิมที่ยังไม่หมดอายุ",
    authRequired: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่",
    scan: "สแกนใบหน้า",
    scanning: "กำลังสแกน...",
    cameraHint: "ระบบจะเปิดกล้องและตรวจสอบใบหน้าให้อัตโนมัติ",
  };
}

function scanCopy(locale: AccountLocale) {
  if (locale === "en") {
    return {
      working: "Opening camera and scanning face...",
      success: "Face scan verified. KYC approved.",
      failed: "Face scan failed. Please try again with better lighting.",
      noCamera: "Camera is not available on this device.",
      permissionDenied: "Camera permission denied. Please allow camera access in your browser.",
      needSession: "Please start KYC session before scanning face.",
      sessionExpired: "KYC session expired. Please start again.",
    };
  }
  if (locale === "lo") {
    return {
      working: "ກຳລັງເປີດກ້ອງ ແລະສະແກນໃບໜ້າ...",
      success: "ຢືນຢັນໃບໜ້າສຳເລັດ ແລະ KYC ຖືກອະນຸມັດ",
      failed: "ສະແກນໃບໜ້າບໍ່ສຳເລັດ ກະລຸນາລອງໃໝ່",
      noCamera: "ອຸປະກອນນີ້ບໍ່ຮອງຮັບກ້ອງ",
      permissionDenied: "ບໍ່ໄດ້ອະນຸຍາດກ້ອງ ກະລຸນາອະນຸຍາດໃນເບຣາວເຊີ",
      needSession: "ກະລຸນາເລີ່ມ KYC session ກ່ອນ",
      sessionExpired: "KYC session ໝົດອາຍຸ ກະລຸນາເລີ່ມໃໝ່",
    };
  }
  return {
    working: "กำลังเปิดกล้องและสแกนใบหน้า...",
    success: "ยืนยันใบหน้าสำเร็จ และอนุมัติ KYC แล้ว",
    failed: "สแกนใบหน้าไม่สำเร็จ กรุณาลองใหม่ในที่แสงพอ",
    noCamera: "อุปกรณ์นี้ไม่รองรับการเปิดกล้อง",
    permissionDenied: "ไม่ได้รับสิทธิ์ใช้งานกล้อง กรุณาอนุญาตกล้องในเบราว์เซอร์",
    needSession: "กรุณาเริ่ม KYC session ก่อนสแกนใบหน้า",
    sessionExpired: "KYC session หมดอายุแล้ว กรุณาเริ่มใหม่",
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

function mapFaceScanError(caught: unknown, permissionDeniedText: string, genericFailedText: string, notSupportedText: string) {
  const name = typeof caught === "object" && caught && "name" in caught
    ? String((caught as { name?: unknown }).name ?? "").trim().toLowerCase()
    : "";
  const message = caught instanceof Error ? caught.message : "";
  const lower = message.toLowerCase();

  if (
    name === "notallowederror"
    || name === "permissiondeniederror"
    || lower.includes("permission denied")
    || lower.includes("permissiondenied")
    || lower.includes("notallowederror")
  ) {
    return permissionDeniedText;
  }

  if (name === "notfounderror" || name === "notreadableerror") {
    return notSupportedText;
  }

  if (lower.includes("could not start video") || lower.includes("could not access video stream")) {
    return notSupportedText;
  }

  return message || genericFailedText;
}

export function CustomerKycStartClient() {
  const pathname = usePathname();
  const locale = useMemo(() => localeFromPath(pathname), [pathname]);
  const t = useMemo(() => copy(locale), [locale]);
  const s = useMemo(() => scanCopy(locale), [locale]);
  const router = useRouter();

  const loginPath = withLocale(locale, "/auth/login");
  const accountPath = withLocale(locale, "/account");
  const homePath = withLocale(locale, "/");
  const schemaMissingMessage = locale === "en"
    ? "KYC tables are not ready yet. Please ask admin to run sql/ensure-customer-kyc.sql in Supabase SQL Editor."
    : locale === "lo"
      ? "ຕາຕະລາງ KYC ຍັງບໍ່ພ້ອມ. ກະລຸນາໃຫ້ແອດມິນລັນ sql/ensure-customer-kyc.sql ໃນ Supabase SQL Editor."
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
  const [scanning, setScanning] = useState(false);
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

  const performFaceScan = useCallback(async (nextSession?: KycSessionDto | null) => {
    const activeSession = nextSession ?? session;
    if (scanning) {
      return false;
    }
    if (!activeSession?.sessionId) {
      setError(s.needSession);
      return false;
    }
    if (Date.parse(activeSession.expiresAt) <= Date.now()) {
      setError(s.sessionExpired);
      return false;
    }

    setScanning(true);
    setError(null);
    setMessage(s.working);

    let stream: MediaStream | null = null;
    try {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        throw new Error(s.noCamera);
      }

      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      const video = document.createElement("video");
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      await video.play();
      await new Promise((resolve) => setTimeout(resolve, 650));

      const width = video.videoWidth || 640;
      const height = video.videoHeight || 480;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error(s.failed);
      }
      context.drawImage(video, 0, 0, width, height);

      let scanMethod = "camera";
      let detected = true;
      const withFaceDetector = window as Window & {
        FaceDetector?: new (options?: { fastMode?: boolean; maxDetectedFaces?: number }) => {
          detect: (input: HTMLCanvasElement) => Promise<Array<unknown>>;
        };
      };
      if (withFaceDetector.FaceDetector) {
        scanMethod = "camera+facedetector";
        const detector = new withFaceDetector.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
        const faces = await detector.detect(canvas);
        detected = Array.isArray(faces) && faces.length > 0;
      }
      if (!detected) {
        throw new Error(s.failed);
      }

      const response = await fetch("/api/customer/kyc/session/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: activeSession.sessionId,
          verificationMethod: scanMethod,
          resultPayload: {
            faceDetected: true,
            imageWidth: width,
            imageHeight: height,
          },
        }),
      });

      const payload = (await response.json().catch(() => null)) as KycCompletePayload | null;
      if (response.status === 401) {
        setError(t.authRequired);
        router.replace(loginPath);
        return false;
      }
      if (!response.ok || !payload?.ok) {
        if (payload?.code === "KYC_SESSION_EXPIRED" || payload?.code === "KYC_SESSION_FINALIZED") {
          throw new Error(s.sessionExpired);
        }
        throw new Error(mapKycErrorMessage(payload?.code, payload?.error));
      }

      const nextStatus = normalizeStatus(payload?.data?.kycStatus ?? "approved");
      setProfile((prev) => ({
        ...(prev ?? {}),
        kycStatus: nextStatus,
        approvedAt: payload?.data?.approvedAt ?? prev?.approvedAt ?? null,
      }));
      setMessage(s.success);
      setError(null);
      return true;
    } catch (caught) {
      setError(mapFaceScanError(caught, s.permissionDenied, s.failed, s.noCamera));
      setMessage(null);
      return false;
    } finally {
      if (stream) {
        for (const track of stream.getTracks()) {
          track.stop();
        }
      }
      setScanning(false);
    }
  }, [loginPath, mapKycErrorMessage, router, s.failed, s.needSession, s.noCamera, s.permissionDenied, s.sessionExpired, s.success, s.working, scanning, session, t.authRequired]);

  async function startKyc() {
    if (starting || scanning) return;
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
      const nextStatus = normalizeStatus(payload.data.kycStatus);
      setProfile((prev) => ({
        ...(prev ?? {}),
        kycStatus: nextStatus,
      }));
      setMessage(payload.data.reused ? t.sessionReused : t.sessionCreated);

      // Trigger camera immediately after KYC session is created.
      await performFaceScan(payload.data);
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
            <p className="mt-2 text-xs text-slate-400/90">{t.cameraHint}</p>
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
            disabled={starting || scanning || isApproved}
            className="inline-flex h-11 items-center justify-center rounded-full border border-amber-300/65 bg-gradient-to-r from-amber-500 to-yellow-300 px-6 text-sm font-semibold text-zinc-900 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {starting ? t.starting : t.start}
          </button>

          <button
            type="button"
            onClick={() => void performFaceScan()}
            disabled={scanning || isApproved}
            className="inline-flex h-11 items-center justify-center rounded-full border border-cyan-300/40 bg-cyan-900/40 px-6 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-800/60 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {scanning ? t.scanning : t.scan}
          </button>

          <button
            type="button"
            onClick={() => void loadStatus()}
            disabled={loading || starting || scanning}
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
