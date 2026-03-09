"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { getSupabaseBrowserClient } from "../../../lib/supabase/client";

type CustomerLocale = "th" | "en" | "lo";

type ForgotPasswordModalProps = {
  open: boolean;
  locale: CustomerLocale;
  initialEmail?: string;
  lockEmail?: boolean;
  onClose: () => void;
  onSuccess?: (message: string) => void;
};

const OTP_LENGTH = 6;

function createEmptyOtp() {
  return Array.from({ length: OTP_LENGTH }, () => "");
}

function normalizeOtpDigits(value: string) {
  return value.replace(/\D/g, "").slice(0, OTP_LENGTH);
}

function copy(locale: CustomerLocale) {
  if (locale === "en") {
    return {
      title: "Reset Password",
      subtitle: "Enter email, verify OTP, scan face, and set a new password.",
      emailLabel: "Email",
      sendOtp: "Send OTP",
      sendingOtp: "Sending OTP...",
      otpLabel: "OTP Code",
      verifyOtp: "Verify OTP",
      verifyingOtp: "Verifying OTP...",
      otpSent: "OTP sent. Please enter 6 digits from email.",
      otpVerified: "OTP verified successfully.",
      scanFace: "Scan Face",
      scanningFace: "Scanning...",
      faceReady: "Face scan verified.",
      passwordLabel: "New password",
      confirmPasswordLabel: "Confirm new password",
      save: "Save New Password",
      saving: "Saving...",
      cancel: "Cancel",
      needEmail: "Please enter your email.",
      emailNotFound: "This email is not registered in the system.",
      needOtp: "Please enter 6 OTP digits.",
      needOtpVerify: "Please verify OTP before face scan.",
      otpInvalid: "OTP is invalid or expired. Request a new code.",
      needFaceScan: "Please scan your face before setting a new password.",
      needPassword: "Please enter a new password.",
      passwordTooShort: "Password must be at least 6 characters.",
      passwordMismatch: "Passwords do not match.",
      permissionDenied: "Camera permission denied. Please allow camera access in your browser.",
      noCamera: "Camera is not available on this device.",
      scanFailed: "Face scan failed. Please try again.",
      rateLimited: "Too many requests. Please try again later.",
      faceReferenceMissing: "This account has no approved KYC face profile yet.",
      resetSuccess: "Password reset successful. Redirecting to your account...",
    };
  }

  if (locale === "lo") {
    return {
      title: "ຕັ້ງລະຫັດຜ່ານໃໝ່",
      subtitle: "ກອກອີເມວ, ຢືນຢັນ OTP, ສະແກນໃບໜ້າ ແລ້ວຕັ້ງລະຫັດໃໝ່.",
      emailLabel: "ອີເມວ",
      sendOtp: "ສົ່ງ OTP",
      sendingOtp: "ກຳລັງສົ່ງ OTP...",
      otpLabel: "ລະຫັດ OTP",
      verifyOtp: "ຢືນຢັນ OTP",
      verifyingOtp: "ກຳລັງຢືນຢັນ OTP...",
      otpSent: "ສົ່ງ OTP ແລ້ວ. ກະລຸນາກອກ 6 ຕົວເລກຈາກອີເມວ.",
      otpVerified: "ຢືນຢັນ OTP ສຳເລັດ.",
      scanFace: "ສະແກນໃບໜ້າ",
      scanningFace: "ກຳລັງສະແກນ...",
      faceReady: "ຢືນຢັນໃບໜ້າສຳເລັດ.",
      passwordLabel: "ລະຫັດຜ່ານໃໝ່",
      confirmPasswordLabel: "ຢືນຢັນລະຫັດຜ່ານໃໝ່",
      save: "ບັນທຶກລະຫັດໃໝ່",
      saving: "ກຳລັງບັນທຶກ...",
      cancel: "ຍົກເລີກ",
      needEmail: "ກະລຸນາກອກອີເມວ.",
      emailNotFound: "ອີເມວນີ້ບໍ່ຢູ່ໃນລະບົບ.",
      needOtp: "ກະລຸນາກອກ OTP 6 ຕົວເລກ.",
      needOtpVerify: "ກະລຸນາຢືນຢັນ OTP ກ່ອນສະແກນໃບໜ້າ.",
      otpInvalid: "OTP ບໍ່ຖືກ ຫຼື ໝົດອາຍຸ.",
      needFaceScan: "ກະລຸນາສະແກນໃບໜ້າກ່ອນຕັ້ງລະຫັດໃໝ່.",
      needPassword: "ກະລຸນາກອກລະຫັດຜ່ານໃໝ່.",
      passwordTooShort: "ລະຫັດຜ່ານຕ້ອງຢ່າງໜ້ອຍ 6 ຕົວ.",
      passwordMismatch: "ລະຫັດຜ່ານບໍ່ຕົງກັນ.",
      permissionDenied: "ບໍ່ໄດ້ຮັບອະນຸຍາດໃຊ້ກ້ອງ.",
      noCamera: "ອຸປະກອນນີ້ບໍ່ຮອງຮັບກ້ອງ.",
      scanFailed: "ສະແກນໃບໜ້າບໍ່ສຳເລັດ.",
      rateLimited: "ຮ້ອງຂໍຖີ່ເກີນໄປ. ກະລຸນາລໍຖ້າ.",
      faceReferenceMissing: "ບັນຊີນີ້ຍັງບໍ່ມີໃບໜ້າ KYC ທີ່ອະນຸມັດ.",
      resetSuccess: "ຕັ້ງລະຫັດໃໝ່ສຳເລັດ. ກຳລັງໄປໜ້າບັນຊີ...",
    };
  }

  return {
    title: "ตั้งรหัสผ่านใหม่",
    subtitle: "กรอกอีเมล ยืนยัน OTP สแกนใบหน้า แล้วตั้งรหัสผ่านใหม่",
    emailLabel: "อีเมล",
    sendOtp: "ส่ง OTP",
    sendingOtp: "กำลังส่ง OTP...",
    otpLabel: "รหัส OTP",
    verifyOtp: "ยืนยัน OTP",
    verifyingOtp: "กำลังยืนยัน OTP...",
    otpSent: "ส่ง OTP แล้ว กรุณากรอกรหัส 6 หลักจากอีเมล",
    otpVerified: "ยืนยัน OTP สำเร็จ",
    scanFace: "สแกนใบหน้า",
    scanningFace: "กำลังสแกน...",
    faceReady: "ยืนยันใบหน้าสำเร็จ",
    passwordLabel: "รหัสผ่านใหม่",
    confirmPasswordLabel: "ยืนยันรหัสผ่านใหม่",
    save: "บันทึกรหัสใหม่",
    saving: "กำลังบันทึก...",
    cancel: "ยกเลิก",
    needEmail: "กรุณากรอกอีเมล",
    emailNotFound: "อีเมลนี้ไม่มีบัญชีในระบบ",
    needOtp: "กรุณากรอก OTP 6 หลัก",
    needOtpVerify: "กรุณายืนยัน OTP ก่อนสแกนใบหน้า",
    otpInvalid: "OTP ไม่ถูกต้องหรือหมดอายุ กรุณาขอใหม่",
    needFaceScan: "กรุณาสแกนใบหน้าก่อนตั้งรหัสใหม่",
    needPassword: "กรุณากรอกรหัสผ่านใหม่",
    passwordTooShort: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร",
    passwordMismatch: "รหัสผ่านไม่ตรงกัน",
    permissionDenied: "ไม่ได้รับสิทธิ์ใช้งานกล้อง กรุณาอนุญาตกล้องในเบราว์เซอร์",
    noCamera: "อุปกรณ์นี้ไม่รองรับการเปิดกล้อง",
    scanFailed: "สแกนใบหน้าไม่สำเร็จ กรุณาลองใหม่",
    rateLimited: "ขอรหัสบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่",
    faceReferenceMissing: "บัญชีนี้ยังไม่มีข้อมูลใบหน้าที่ผ่าน KYC",
    resetSuccess: "ตั้งรหัสผ่านใหม่สำเร็จ กำลังพาไปหน้าบัญชีลูกค้า...",
  };
}

function mapFaceScanError(caught: unknown, noCameraMessage: string, permissionDeniedMessage: string, fallbackMessage: string) {
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
    return permissionDeniedMessage;
  }

  if (name === "notfounderror" || name === "notreadableerror") {
    return noCameraMessage;
  }

  if (lower.includes("could not start video") || lower.includes("could not access video stream")) {
    return noCameraMessage;
  }

  return message || fallbackMessage;
}

export function ForgotPasswordModal({
  open,
  locale,
  initialEmail = "",
  lockEmail = false,
  onClose,
  onSuccess,
}: ForgotPasswordModalProps) {
  const t = useMemo(() => copy(locale), [locale]);

  const [email, setEmail] = useState(initialEmail.trim());
  const [otp, setOtp] = useState<string[]>(createEmptyOtp);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [faceScanning, setFaceScanning] = useState(false);
  const [faceScanPassed, setFaceScanPassed] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  const otpValue = otp.join("");
  const otpComplete = otpValue.length === OTP_LENGTH;

  useEffect(() => {
    if (!open) {
      return;
    }
    setEmail(initialEmail.trim());
    setOtp(createEmptyOtp());
    setOtpSent(false);
    setOtpVerifying(false);
    setOtpVerified(false);
    setFaceScanning(false);
    setFaceScanPassed(false);
    setSendingOtp(false);
    setSaving(false);
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
    setMessage(null);
  }, [initialEmail, open]);

  useEffect(() => {
    if (!open || !otpSent) {
      return;
    }
    requestAnimationFrame(() => {
      otpRefs.current[0]?.focus();
      otpRefs.current[0]?.select();
    });
  }, [open, otpSent]);

  if (!open) {
    return null;
  }

  function focusOtpCell(index: number) {
    const bounded = Math.max(0, Math.min(OTP_LENGTH - 1, index));
    const target = otpRefs.current[bounded];
    if (!target) {
      return;
    }
    target.focus();
    target.select();
  }

  function handleOtpChange(index: number, raw: string) {
    const digits = normalizeOtpDigits(raw);
    if (!digits) {
      setOtp((previous) => {
        const next = [...previous];
        next[index] = "";
        return next;
      });
      return;
    }

    setOtp((previous) => {
      const next = [...previous];
      let cursor = index;
      for (const digit of digits) {
        if (cursor >= OTP_LENGTH) {
          break;
        }
        next[cursor] = digit;
        cursor += 1;
      }
      return next;
    });

    requestAnimationFrame(() => {
      const nextIndex = Math.min(index + digits.length, OTP_LENGTH - 1);
      focusOtpCell(nextIndex);
    });
  }

  function handleOtpKeyDown(index: number, key: string) {
    if (key === "Backspace") {
      if (otp[index]) {
        setOtp((previous) => {
          const next = [...previous];
          next[index] = "";
          return next;
        });
        return;
      }
      if (index > 0) {
        setOtp((previous) => {
          const next = [...previous];
          next[index - 1] = "";
          return next;
        });
        requestAnimationFrame(() => focusOtpCell(index - 1));
      }
      return;
    }
    if (key === "ArrowLeft" && index > 0) {
      requestAnimationFrame(() => focusOtpCell(index - 1));
      return;
    }
    if (key === "ArrowRight" && index < OTP_LENGTH - 1) {
      requestAnimationFrame(() => focusOtpCell(index + 1));
    }
  }

  function handleOtpPaste(index: number, pastedText: string) {
    const digits = normalizeOtpDigits(pastedText);
    if (!digits) {
      return;
    }
    setOtp((previous) => {
      const next = [...previous];
      let cursor = index;
      for (const digit of digits) {
        if (cursor >= OTP_LENGTH) {
          break;
        }
        next[cursor] = digit;
        cursor += 1;
      }
      return next;
    });
    requestAnimationFrame(() => {
      const nextIndex = Math.min(index + digits.length, OTP_LENGTH - 1);
      focusOtpCell(nextIndex);
    });
  }

  async function handleSendOtp() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError(t.needEmail);
      return;
    }

    setSendingOtp(true);
    setError(null);
    setMessage(null);
    setOtp(createEmptyOtp());
    setOtpVerified(false);
    setFaceScanPassed(false);

    try {
      const response = await fetch("/api/customer/auth/forgot-password/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const payload = (await response.json().catch(() => null)) as { ok?: boolean; code?: string; error?: string } | null;
      if (!response.ok || !payload?.ok) {
        if (payload?.code === "EMAIL_NOT_FOUND") {
          throw new Error(t.emailNotFound);
        }
        if (payload?.code === "RATE_LIMITED") {
          throw new Error(t.rateLimited);
        }
        throw new Error(payload?.error ?? t.otpInvalid);
      }

      setOtpSent(true);
      setMessage(t.otpSent);
    } catch (caught) {
      const fallback = caught instanceof Error ? caught.message : t.otpInvalid;
      setError(fallback);
    } finally {
      setSendingOtp(false);
    }
  }

  async function handleVerifyOtp() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError(t.needEmail);
      return;
    }
    if (!otpComplete) {
      setError(t.needOtp);
      return;
    }

    setOtpVerifying(true);
    setError(null);
    setMessage(null);
    setFaceScanPassed(false);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: normalizedEmail,
        token: otpValue,
        type: "email",
      });
      if (verifyError) {
        throw new Error(t.otpInvalid);
      }

      const kycResponse = await fetch("/api/customer/kyc/session", { cache: "no-store" });
      const kycPayload = (await kycResponse.json().catch(() => null)) as
        | { ok?: boolean; data?: { kycStatus?: string } }
        | null;
      const kycStatus = String(kycPayload?.data?.kycStatus ?? "").trim().toLowerCase();
      if (!kycResponse.ok || !kycPayload?.ok || kycStatus !== "approved") {
        await supabase.auth.signOut();
        throw new Error(t.faceReferenceMissing);
      }

      setOtpVerified(true);
      setMessage(t.otpVerified);
    } catch (caught) {
      const fallback = caught instanceof Error ? caught.message : t.otpInvalid;
      setError(fallback);
      setOtpVerified(false);
    } finally {
      setOtpVerifying(false);
    }
  }

  async function handleFaceScan() {
    if (faceScanning) {
      return;
    }
    if (!otpVerified) {
      setError(t.needOtpVerify);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(t.noCamera);
      return;
    }

    setError(null);
    setMessage(null);
    setFaceScanning(true);
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      const video = document.createElement("video");
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      await video.play();
      await new Promise((resolve) => setTimeout(resolve, 450));

      const width = video.videoWidth || 640;
      const height = video.videoHeight || 480;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error(t.scanFailed);
      }
      context.drawImage(video, 0, 0, width, height);

      let detected = true;
      const withFaceDetector = window as Window & {
        FaceDetector?: new (options?: { fastMode?: boolean; maxDetectedFaces?: number }) => {
          detect: (input: HTMLCanvasElement) => Promise<Array<unknown>>;
        };
      };
      if (withFaceDetector.FaceDetector) {
        const detector = new withFaceDetector.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
        const faces = await detector.detect(canvas);
        detected = Array.isArray(faces) && faces.length > 0;
      }
      if (!detected) {
        throw new Error(t.scanFailed);
      }

      setFaceScanPassed(true);
      setMessage(t.faceReady);
    } catch (caught) {
      setFaceScanPassed(false);
      setError(mapFaceScanError(caught, t.noCamera, t.permissionDenied, t.scanFailed));
    } finally {
      if (stream) {
        for (const track of stream.getTracks()) {
          track.stop();
        }
      }
      setFaceScanning(false);
    }
  }

  async function handleSaveNewPassword() {
    const normalizedNewPassword = newPassword.trim();
    const normalizedConfirmPassword = confirmPassword.trim();

    if (!otpVerified) {
      setError(t.needOtpVerify);
      return;
    }
    if (!faceScanPassed) {
      setError(t.needFaceScan);
      return;
    }
    if (!normalizedNewPassword) {
      setError(t.needPassword);
      return;
    }
    if (normalizedNewPassword.length < 6) {
      setError(t.passwordTooShort);
      return;
    }
    if (normalizedNewPassword !== normalizedConfirmPassword) {
      setError(t.passwordMismatch);
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password: normalizedNewPassword,
      });
      if (updateError) {
        throw updateError;
      }

      setMessage(t.resetSuccess);
      if (onSuccess) {
        onSuccess(t.resetSuccess);
      }
      window.setTimeout(() => {
        onClose();
      }, 250);
    } catch (caught) {
      const fallback = caught instanceof Error ? caught.message : t.otpInvalid;
      setError(fallback);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[170] flex items-center justify-center bg-black/70 px-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-cyan-300/45 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18)_0%,_rgba(9,16,22,0.95)_46%,_#08090b_100%)] p-5 text-cyan-50 shadow-[0_24px_80px_rgba(0,0,0,0.56)]"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-cyan-200">{t.title}</h2>
        <p className="mt-1 text-sm text-cyan-100/80">{t.subtitle}</p>

        {error ? (
          <p className="mt-3 rounded-xl border border-rose-300/45 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="mt-3 rounded-xl border border-emerald-300/45 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
            {message}
          </p>
        ) : null}

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-cyan-100/90">{t.emailLabel}</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={lockEmail || otpSent || otpVerified || saving || sendingOtp || otpVerifying}
              className="h-11 w-full rounded-xl border border-cyan-300/40 bg-black/35 px-3 text-sm text-cyan-50 outline-none transition focus:border-cyan-200 focus:ring-2 focus:ring-cyan-200/20 disabled:opacity-75"
            />
          </label>

          <button
            type="button"
            onClick={() => void handleSendOtp()}
            disabled={sendingOtp || saving || otpVerifying}
            className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-sky-300/60 bg-sky-500/20 px-3 text-sm font-semibold text-sky-100 transition hover:bg-sky-500/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sendingOtp ? t.sendingOtp : t.sendOtp}
          </button>

          {otpSent ? (
            <>
              <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
                {Array.from({ length: OTP_LENGTH }, (_, index) => (
                  <input
                    key={`forgot-password-otp-${index}`}
                    ref={(node) => {
                      otpRefs.current[index] = node;
                    }}
                    value={otp[index] ?? ""}
                    onChange={(event) => handleOtpChange(index, event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Backspace" || event.key === "ArrowLeft" || event.key === "ArrowRight") {
                        event.preventDefault();
                        handleOtpKeyDown(index, event.key);
                        return;
                      }
                      if (event.key.length === 1 && !/[0-9]/.test(event.key)) {
                        event.preventDefault();
                      }
                    }}
                    onFocus={(event) => event.currentTarget.select()}
                    onPaste={(event) => {
                      event.preventDefault();
                      handleOtpPaste(index, event.clipboardData.getData("text"));
                    }}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={OTP_LENGTH}
                    autoComplete={index === 0 ? "one-time-code" : "off"}
                    aria-label={`${t.otpLabel} ${index + 1}`}
                    className="h-11 w-full rounded-xl border border-cyan-300/40 bg-black/45 px-0 text-center text-base font-semibold tracking-[0.08em] text-cyan-100 outline-none transition focus:border-cyan-200 focus:ring-2 focus:ring-cyan-200/20 sm:h-12 sm:text-lg"
                  />
                ))}
              </div>

              {!otpVerified ? (
                <button
                  type="button"
                  onClick={() => void handleVerifyOtp()}
                  disabled={otpVerifying || saving || !otpComplete}
                  className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-cyan-300/60 bg-cyan-500/20 px-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {otpVerifying ? t.verifyingOtp : t.verifyOtp}
                </button>
              ) : null}
            </>
          ) : null}

          {otpVerified ? (
            <button
              type="button"
              onClick={() => void handleFaceScan()}
              disabled={faceScanning || saving}
              className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-emerald-300/60 bg-emerald-500/20 px-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {faceScanning ? t.scanningFace : t.scanFace}
            </button>
          ) : null}

          {faceScanPassed ? (
            <>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-cyan-100/90">{t.passwordLabel}</span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  autoComplete="new-password"
                  className="h-11 w-full rounded-xl border border-cyan-300/40 bg-black/35 px-3 text-sm text-cyan-50 outline-none transition focus:border-cyan-200 focus:ring-2 focus:ring-cyan-200/20"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-cyan-100/90">{t.confirmPasswordLabel}</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  className="h-11 w-full rounded-xl border border-cyan-300/40 bg-black/35 px-3 text-sm text-cyan-50 outline-none transition focus:border-cyan-200 focus:ring-2 focus:ring-cyan-200/20"
                />
              </label>
            </>
          ) : null}
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving || sendingOtp || otpVerifying || faceScanning}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-500/45 bg-slate-800/70 px-4 text-sm font-semibold text-slate-100 transition hover:bg-slate-700/80 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t.cancel}
          </button>
          <button
            type="button"
            onClick={() => void handleSaveNewPassword()}
            disabled={saving || !faceScanPassed}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-cyan-300/65 bg-gradient-to-r from-cyan-300 to-sky-300 px-4 text-sm font-semibold text-zinc-900 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? t.saving : t.save}
          </button>
        </div>
      </div>
    </div>
  );
}
