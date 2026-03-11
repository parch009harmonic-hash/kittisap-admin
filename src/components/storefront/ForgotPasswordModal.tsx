"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getSupabaseBrowserClient } from "../../../lib/supabase/client";

type CustomerLocale = "th" | "en" | "lo";
type PasswordFlowIntent = "forgot" | "change";

type ForgotPasswordModalProps = {
  open: boolean;
  locale: CustomerLocale;
  intent?: PasswordFlowIntent;
  initialEmail?: string;
  lockEmail?: boolean;
  onClose: () => void;
  onSuccess?: (message: string) => void;
};

const OTP_MIN_LENGTH = 6;
const OTP_MAX_LENGTH = 16;

type FaceDetectorBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function normalizeOtpDigits(value: string) {
  return value.replace(/\D/g, "").slice(0, OTP_MAX_LENGTH);
}

function toFaceDetectorBox(face: unknown): FaceDetectorBox | null {
  if (!face || typeof face !== "object" || !("boundingBox" in face)) {
    return null;
  }
  const box = (face as { boundingBox?: unknown }).boundingBox;
  if (!box || typeof box !== "object") {
    return null;
  }
  const raw = box as Record<string, unknown>;
  const x = Number(raw.x);
  const y = Number(raw.y);
  const width = Number(raw.width);
  const height = Number(raw.height);
  if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) {
    return null;
  }
  return { x, y, width, height };
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
      otpSent: "OTP sent. Please enter the numeric code from your email.",
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
      needOtp: "Please enter at least 6 OTP digits.",
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
      otpSent: "ສົ່ງ OTP ແລ້ວ. ກະລຸນາກອກລະຫັດຕົວເລກຈາກອີເມວ.",
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
      needOtp: "ກະລຸນາກອກ OTP ຢ່າງນ້ອຍ 6 ຕົວເລກ.",
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
      otpSent: "ส่ง OTP แล้ว กรุณากรอกรหัสตัวเลขจากอีเมล",
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
    needOtp: "กรุณากรอก OTP อย่างน้อย 6 หลัก",
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
  intent = "forgot",
  initialEmail = "",
  lockEmail = false,
  onClose,
  onSuccess,
}: ForgotPasswordModalProps) {
  const t = useMemo(() => copy(locale), [locale]);
  const isChangeIntent = intent === "change";
  const modalTitle = isChangeIntent
    ? (locale === "en" ? "Change Password" : locale === "lo" ? "ປ່ຽນລະຫັດຜ່ານ" : "เปลี่ยนรหัสผ่าน")
    : t.title;
  const modalSubtitle = isChangeIntent
    ? (locale === "en"
      ? "Verify email OTP, scan face, then set a new password."
      : locale === "lo"
        ? "ຢືນຢັນ OTP ທາງອີເມວ, ສະແກນໃບໜ້າ ແລ້ວຕັ້ງລະຫັດໃໝ່."
        : "ยืนยัน OTP ทางอีเมล สแกนใบหน้า แล้วตั้งรหัสผ่านใหม่")
    : t.subtitle;
  const [email, setEmail] = useState(initialEmail.trim());
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [faceScanning, setFaceScanning] = useState(false);
  const [faceScanPassed, setFaceScanPassed] = useState(false);
  const [scanUiOpen, setScanUiOpen] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanDetail, setScanDetail] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const scanPreviewRef = useRef<HTMLVideoElement | null>(null);
  const scanStreamRef = useRef<MediaStream | null>(null);
  const otpValue = normalizeOtpDigits(otp);
  const otpComplete = otpValue.length >= OTP_MIN_LENGTH;

  const stopScanStream = useCallback(() => {
    const stream = scanStreamRef.current;
    if (stream) {
      for (const track of stream.getTracks()) {
        track.stop();
      }
    }
    scanStreamRef.current = null;
    const preview = scanPreviewRef.current;
    if (preview) {
      preview.srcObject = null;
    }
  }, []);

  useEffect(() => {
    if (!open) {
      stopScanStream();
      setScanUiOpen(false);
      setScanProgress(0);
      setScanDetail("");
      return;
    }
    setEmail(initialEmail.trim());
    setOtp("");
    setOtpSent(false);
    setOtpVerifying(false);
    setOtpVerified(false);
    setFaceScanning(false);
    setFaceScanPassed(false);
    setScanUiOpen(false);
    setScanProgress(0);
    setScanDetail("");
    setSendingOtp(false);
    setSaving(false);
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
    setMessage(null);
  }, [initialEmail, open, stopScanStream]);

  useEffect(() => () => {
    stopScanStream();
  }, [stopScanStream]);

  if (!open) {
    return null;
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
    setOtp("");
    setOtpVerified(false);
    setFaceScanPassed(false);
    setScanUiOpen(false);
    setScanProgress(0);
    setScanDetail("");
    stopScanStream();

    try {
      const response = await fetch("/api/customer/auth/forgot-password/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const payload = (await response.json().catch(() => null)) as { ok?: boolean; code?: string; error?: string; message?: string } | null;
      if (!response.ok || !payload?.ok) {
        if (payload?.code === "RATE_LIMITED") {
          throw new Error(t.rateLimited);
        }
        throw new Error(payload?.error ?? t.otpInvalid);
      }

      setOtpSent(true);
      setMessage(
        locale === "th"
          ? "หากอีเมลนี้มีอยู่ในระบบ เราได้ส่ง OTP แล้ว กรุณาตรวจสอบอีเมล"
          : locale === "lo"
            ? "ຖ້າອີເມວນີ້ມີຢູ່ໃນລະບົບ ພວກເຮົາໄດ້ສົ່ງ OTP ແລ້ວ ກະລຸນາກວດອີເມວ"
            : (payload?.message || "If this email exists in our system, OTP has been sent."),
      );
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
    setScanUiOpen(false);
    setScanProgress(0);
    setScanDetail("");
    stopScanStream();

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
    setFaceScanPassed(false);
    setScanUiOpen(true);
    setScanProgress(0);
    setScanDetail(t.scanningFace);
    try {
      const withFaceDetector = window as Window & {
        FaceDetector?: new (options?: { fastMode?: boolean; maxDetectedFaces?: number }) => {
          detect: (input: HTMLCanvasElement) => Promise<Array<unknown>>;
        };
      };

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });
      scanStreamRef.current = stream;

      const preview = scanPreviewRef.current ?? document.createElement("video");
      preview.srcObject = stream;
      preview.muted = true;
      preview.playsInline = true;
      await preview.play();
      await new Promise((resolve) => setTimeout(resolve, 450));

      const width = preview.videoWidth || 640;
      const height = preview.videoHeight || 480;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error(t.scanFailed);
      }
      const detector = withFaceDetector.FaceDetector
        ? new withFaceDetector.FaceDetector({ fastMode: true, maxDetectedFaces: 1 })
        : null;
      const fallbackCanvas = document.createElement("canvas");
      fallbackCanvas.width = 96;
      fallbackCanvas.height = 96;
      const fallbackContext = fallbackCanvas.getContext("2d");
      if (!fallbackContext) {
        throw new Error(t.scanFailed);
      }
      const frameCount = 10;
      let validFrames = 0;
      let movingFrames = 0;
      let areaRatioTotal = 0;
      let previousCenter: { x: number; y: number } | null = null;
      let fallbackReadableFrames = 0;
      let previousLumaFrame: Float32Array | null = null;

      for (let index = 0; index < frameCount; index += 1) {
        context.drawImage(preview, 0, 0, width, height);
        if (detector) {
          const faces = await detector.detect(canvas);
          const face = Array.isArray(faces) && faces.length === 1 ? toFaceDetectorBox(faces[0]) : null;
          if (face) {
            const areaRatio = (face.width * face.height) / (width * height);
            if (areaRatio >= 0.05 && areaRatio <= 0.65) {
              validFrames += 1;
              areaRatioTotal += areaRatio;
              const center = {
                x: (face.x + (face.width / 2)) / width,
                y: (face.y + (face.height / 2)) / height,
              };
              if (previousCenter) {
                const deltaX = center.x - previousCenter.x;
                const deltaY = center.y - previousCenter.y;
                if (Math.hypot(deltaX, deltaY) > 0.012) {
                  movingFrames += 1;
                }
              }
              previousCenter = center;
            }
          }
        } else {
          fallbackContext.drawImage(preview, 0, 0, fallbackCanvas.width, fallbackCanvas.height);
          const frame = fallbackContext.getImageData(0, 0, fallbackCanvas.width, fallbackCanvas.height);
          const pixelCount = fallbackCanvas.width * fallbackCanvas.height;
          const currentLumaFrame = new Float32Array(pixelCount);
          let brightnessSum = 0;
          let varianceSum = 0;
          let motionSum = 0;

          for (let p = 0, idx = 0; p < frame.data.length; p += 4, idx += 1) {
            const luma = (
              frame.data[p] * 0.299
              + frame.data[p + 1] * 0.587
              + frame.data[p + 2] * 0.114
            );
            currentLumaFrame[idx] = luma;
            brightnessSum += luma;
          }

          const avgBrightness = brightnessSum / pixelCount;
          for (let idx = 0; idx < currentLumaFrame.length; idx += 1) {
            const diff = currentLumaFrame[idx] - avgBrightness;
            varianceSum += diff * diff;
            if (previousLumaFrame) {
              motionSum += Math.abs(currentLumaFrame[idx] - previousLumaFrame[idx]);
            }
          }

          const variance = varianceSum / pixelCount;
          const meanMotion = previousLumaFrame ? motionSum / pixelCount : 0;
          if (avgBrightness >= 35 && avgBrightness <= 225 && variance >= 160) {
            fallbackReadableFrames += 1;
          }
          if (previousLumaFrame && meanMotion >= 4.2) {
            movingFrames += 1;
          }
          previousLumaFrame = currentLumaFrame;
        }
        setScanProgress(Math.round(((index + 1) / frameCount) * 100));
        setScanDetail(t.scanningFace);
        if (index < frameCount - 1) {
          await new Promise((resolve) => setTimeout(resolve, 140));
        }
      }

      const usingFallback = !detector;
      if (usingFallback) {
        validFrames = fallbackReadableFrames;
      }
      const validRatio = validFrames / frameCount;
      const averageAreaRatio = validFrames > 0 ? areaRatioTotal / validFrames : 0;
      if (
        (usingFallback && (validFrames < 6 || validRatio < 0.6 || movingFrames < 2))
        || (!usingFallback && (validFrames < 6 || movingFrames < 2 || averageAreaRatio < 0.08 || averageAreaRatio > 0.5))
      ) {
        throw new Error(t.scanFailed);
      }

      setFaceScanPassed(true);
      setMessage(t.faceReady);
    } catch (caught) {
      setFaceScanPassed(false);
      setError(mapFaceScanError(caught, t.noCamera, t.permissionDenied, t.scanFailed));
    } finally {
      stopScanStream();
      setScanUiOpen(false);
      setScanProgress(0);
      setScanDetail("");
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
        <h2 className="text-lg font-semibold text-cyan-200">{modalTitle}</h2>
        <p className="mt-1 text-sm text-cyan-100/80">{modalSubtitle}</p>

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
              <input
                type="text"
                value={otp}
                onChange={(event) => setOtp(normalizeOtpDigits(event.target.value))}
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                aria-label={t.otpLabel}
                placeholder={t.otpLabel}
                className="h-11 w-full rounded-xl border border-cyan-300/40 bg-black/45 px-4 text-center text-base font-semibold tracking-[0.18em] text-cyan-100 outline-none transition focus:border-cyan-200 focus:ring-2 focus:ring-cyan-200/20 sm:h-12 sm:text-lg"
              />

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

          {scanUiOpen ? (
            <div className="rounded-xl border border-emerald-300/35 bg-black/25 p-3">
              <div className="overflow-hidden rounded-xl border border-emerald-300/25 bg-black/45">
                <video
                  ref={scanPreviewRef}
                  autoPlay
                  muted
                  playsInline
                  className="aspect-video w-full object-cover"
                />
              </div>
              <div className="mt-3 space-y-2">
                <p className="text-xs font-medium text-emerald-100/90">{scanDetail || t.scanningFace}</p>
                <div className="h-2 w-full overflow-hidden rounded-full bg-emerald-950/70">
                  <div
                    className="h-full rounded-full bg-emerald-300 transition-[width] duration-150"
                    style={{ width: `${Math.max(0, Math.min(100, scanProgress))}%` }}
                  />
                </div>
              </div>
            </div>
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

