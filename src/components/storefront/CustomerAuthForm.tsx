"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type { AppLocale } from "../../../lib/i18n/locale";
import { buildCustomerAuthCallbackUrl } from "../../../lib/storefront/auth-redirect-url";
import { markCustomerSessionActive } from "../../../lib/storefront/customer-session";
import { getSupabaseBrowserClient } from "../../../lib/supabase/client";
import { ForgotPasswordModal } from "./ForgotPasswordModal";

type Mode = "login" | "register";

type CustomerAuthFormProps = {
  mode: Mode;
  locale?: AppLocale;
  useLocalePrefix?: boolean;
};

const EMAIL_RECOVERY_OTP_MIN_LENGTH = 6;
const EMAIL_RECOVERY_OTP_MAX_LENGTH = 16;

function normalizeOtpDigits(value: string) {
  return value.replace(/\D/g, "").slice(0, EMAIL_RECOVERY_OTP_MAX_LENGTH);
}

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
      googlePendingTitle: isThai ? "Google Login กำลังเตรียมใช้งาน" : isLao ? "Google Login ກຳລັງກຽມໃຊ້ງານ" : "Google Login Is Coming Soon",
      googlePendingDescription: isThai
        ? "ระบบล็อกอินด้วย Google อยู่ระหว่างรอดำเนินการ และจะเปิดใช้งานในเร็ว ๆ นี้"
        : isLao
          ? "ລະບົບເຂົ້າລະບົບດ້ວຍ Google ກຳລັງລໍຖ້າດຳເນີນການ ແລະ ຈະເປີດໃຊ້ໄວໆນີ້"
          : "Google sign-in is currently pending setup and will be available soon.",
      googlePendingClose: isThai ? "รับทราบ" : isLao ? "ຮັບຊາບ" : "Got it",
      fullNamePlaceholder: isThai ? "ชื่อ-นามสกุล" : isLao ? "ຊື່-ນາມສະກຸນ" : "Full name",
      phonePlaceholder: isThai ? "เบอร์โทรศัพท์" : isLao ? "ເບີໂທລະສັບ" : "Phone number",
      emailPlaceholder: "you@example.com",
      passwordPlaceholder: "********",
      or: "OR",
      emailNotConfirmed: isThai ? "อีเมลยังไม่ยืนยัน กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ" : isLao ? "ອີເມວຍັງບໍ່ຖືກຢືນຢັນ ກະລຸນາຢືນຢັນອີເມວກ່ອນ" : "Email not confirmed. Please confirm your email before signing in.",
      resendConfirm: isThai ? "ส่งอีเมลยืนยันใหม่" : isLao ? "ສົ່ງອີເມວຢືນຢັນອີກຄັ້ງ" : "Resend confirmation email",
      resendConfirmSuccess: isThai ? "ส่งอีเมลยืนยันใหม่แล้ว กรุณาตรวจสอบกล่องจดหมาย" : isLao ? "ສົ່ງອີເມວຢືນຢັນແລ້ວ ກະລຸນາກວດກ່ອງຂໍ້ຄວາມ" : "Confirmation email sent. Please check your inbox.",
      resendConfirmNeedEmail: isThai ? "กรุณากรอกอีเมลก่อนส่งอีเมลยืนยัน" : isLao ? "ກະລຸນາກອກອີເມວກ່ອນສົ່ງ" : "Please enter your email first.",
      sessionExpired: isThai ? "ไม่มีการใช้งานเกิน 24 ชั่วโมง ระบบออกจากระบบอัตโนมัติแล้ว กรุณาเข้าสู่ระบบใหม่" : isLao ? "ບໍ່ມີການໃຊ້ງານເກີນ 24 ຊົ່ວໂມງ ລະບົບໄດ້ອອກຈາກລະບົບອັດຕະໂນມັດ ກະລຸນາເຂົ້າໃໝ່" : "You were signed out after 24 hours of inactivity. Please sign in again.",
      errorPopupTitle: isThai ? "เกิดข้อผิดพลาดในการเข้าสู่ระบบ" : isLao ? "ເກີດຂໍ້ຜິດພາດໃນການເຂົ້າລະບົບ" : "Sign-in error",
      errorPopupClose: isThai ? "ปิด" : isLao ? "ປິດ" : "Close",
      accountDeletePending: isThai ? "กำลังดำเนินการลบบัญชีผู้ใช้ โปรดกู้คืนบัญชีผู้ใช้ก่อนแก้ไขโปรไฟล์" : isLao ? "ບັນຊີຢູ່ລະຫວ່າງລໍລົບ ກະລຸນາກູ້ຄືນກ່ອນແກ້ໄຂໂປຣໄຟລ໌" : "Account deletion is pending. Recover your account before editing profile.",
      recoveryLinkAction: isThai ? "ส่ง OTP ทางอีเมล" : isLao ? "ສົ່ງ OTP ທາງອີເມວ" : "Send Email OTP",
      recoveryLinkSending: isThai ? "กำลังส่ง OTP..." : isLao ? "ກຳລັງສົ່ງ OTP..." : "Sending OTP...",
      recoveryLinkSent: isThai ? "หากอีเมลนี้มีอยู่ในระบบ เราได้ส่ง OTP แล้ว กรุณาตรวจสอบอีเมลและกรอกรหัสด้านล่าง" : isLao ? "ຖ້າອີເມວນີ້ມີຢູ່ໃນລະບົບ ພວກເຮົາໄດ້ສົ່ງ OTP ແລ້ວ ກະລຸນາກວດອີເມວ" : "If this email exists in our system, OTP has been sent. Please check your email and enter the code below.",
      recoveryNeedEmail: isThai ? "กรุณากรอกอีเมลก่อนส่ง OTP กู้คืนบัญชี" : isLao ? "ກະລຸນາກອກອີເມວກ່ອນສົ່ງ OTP ກູ້ຄືນ" : "Please enter your email before sending recovery OTP.",
      recoveryOtpPlaceholder: isThai ? "รหัส OTP (ตัวเลขเท่านั้น)" : isLao ? "ລະຫັດ OTP (ຕົວເລກເທົ່ານັ້ນ)" : "OTP code (digits only)",
      recoveryOtpAction: isThai ? "ยืนยัน OTP และกู้คืนบัญชี" : isLao ? "ຢືນຢັນ OTP ແລະ ກູ້ຄືນບັນຊີ" : "Verify OTP & Recover",
      recoveryOtpWorking: isThai ? "กำลังยืนยัน OTP..." : isLao ? "ກຳລັງຢືນຢັນ OTP..." : "Verifying OTP...",
      recoveryOtpNeed: isThai ? "กรุณากรอกรหัส OTP อย่างน้อย 6 หลัก" : isLao ? "ກະລຸນາກອກ OTP ຢ່າງນ້ອຍ 6 ຫຼັກ" : "Please enter at least 6 OTP digits.",
      recoveryOtpInvalid: isThai ? "รหัส OTP ไม่ถูกต้องหรือหมดอายุ กรุณาขอรหัสใหม่" : isLao ? "OTP ບໍ່ຖືກ ຫຼື ໝົດອາຍຸ ກະລຸນາຂໍໃໝ່" : "OTP is invalid or expired. Request a new code.",
      recoveryNeedKyc: isThai ? "บัญชีนี้ยังไม่ผ่าน KYC ใบหน้า กรุณาทำ KYC ก่อนดำเนินการ" : isLao ? "ບັນຊີນີ້ຍັງບໍ່ຜ່ານ KYC ໃບໜ້າ ກະລຸນາເຮັດ KYC ກ່ອນ" : "Face KYC is required before continuing.",
      recoveryExpired: isThai ? "หมดเวลาการกู้คืนบัญชี (เกิน 3 วัน)" : isLao ? "ໝົດເວລາກູ້ຄືນບັນຊີ (ເກີນ 3 ມື້)" : "Recovery window has expired (over 3 days).",
      recoveryFailed: isThai ? "กู้คืนบัญชีไม่สำเร็จ กรุณาลองอีกครั้ง" : isLao ? "ກູ້ຄືນບັນຊີບໍ່ສຳເລັດ ກະລຸນາລອງໃໝ່" : "Account recovery failed. Please try again.",
      accountRecovered: isThai ? "กู้คืนบัญชีสำเร็จแล้ว สามารถใช้งานต่อได้ทันที" : isLao ? "ກູ້ຄືນບັນຊີສຳເລັດແລ້ວ" : "Account recovered successfully.",
      unauthorized: isThai ? "อีเมลหรือรหัสผ่านไม่ถูกต้อง" : isLao ? "ອີເມວ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ" : "Invalid email or password.",
      networkUnstable: isThai ? "เครือข่ายไม่เสถียร กรุณาลองใหม่" : isLao ? "ເຄືອຂ່າຍບໍ່ສະຖຽນ ກະລຸນາລອງໃໝ່" : "Network unstable. Please try again.",
      emailRateLimit: isThai ? "ส่งอีเมลบ่อยเกินไป กรุณารอสักครู่ หรือกู้คืนด้วยสแกนหน้า/ข้อมูลคำสั่งซื้อ" : isLao ? "ສົ່ງອີເມວຖີ່ເກີນໄປ ກະລຸນາລໍຖ້າ ຫຼື ກູ້ຄືນດ້ວຍສະແກນໃບໜ້າ/ຂໍ້ມູນອໍເດີ" : "Email rate limit exceeded. Please wait or recover with face scan/order info.",
      recoverByFaceAction: isThai ? "กู้คืนด้วยสแกนหน้า" : isLao ? "ກູ້ຄືນດ້ວຍສະແກນໃບໜ້າ" : "Recover by Face Scan",
      recoverByFaceTitle: isThai ? "กู้คืนบัญชีด้วยสแกนหน้า" : isLao ? "ກູ້ຄືນບັນຊີດ້ວຍສະແກນໃບໜ້າ" : "Recover Account by Face Scan",
      recoverByFacePassword: isThai ? "รหัสผ่านยืนยัน" : isLao ? "ລະຫັດຜ່ານຢືນຢັນ" : "Confirm password",
      recoverByFaceScan: isThai ? "สแกนใบหน้า" : isLao ? "ສະແກນໃບໜ້າ" : "Scan Face",
      recoverByFaceScanning: isThai ? "กำลังสแกน..." : isLao ? "ກຳລັງສະແກນ..." : "Scanning...",
      recoverByFaceScanned: isThai ? "ยืนยันใบหน้าสำเร็จ" : isLao ? "ຢືນຢັນໃບໜ້າສຳເລັດ" : "Face scan verified.",
      recoverByFaceNeedScan: isThai ? "กรุณาสแกนใบหน้าก่อนยืนยันกู้คืน" : isLao ? "ກະລຸນາສະແກນໃບໜ້າກ່ອນຢືນຢັນກູ້ຄືນ" : "Please scan face before recovery.",
      recoverByFaceConfirm: isThai ? "ยืนยันกู้คืนบัญชี" : isLao ? "ຢືນຢັນກູ້ຄືນບັນຊີ" : "Confirm recovery",
      recoverByFaceCancel: isThai ? "ยกเลิก" : isLao ? "ຍົກເລີກ" : "Cancel",
      recoverByFaceWorking: isThai ? "กำลังกู้คืน..." : isLao ? "ກຳລັງກູ້ຄືນ..." : "Recovering...",
      recoverByFaceNoCamera: isThai ? "อุปกรณ์นี้ไม่รองรับกล้อง" : isLao ? "ອຸປະກອນນີ້ບໍ່ຮອງຮັບກ້ອງ" : "Camera is not available on this device.",
      recoverByFaceFailed: isThai ? "สแกนใบหน้าไม่สำเร็จ กรุณาลองใหม่ในที่แสงพอ" : isLao ? "ສະແກນໃບໜ້າບໍ່ສຳເລັດ ກະລຸນາລອງໃໝ່" : "Face scan failed. Please try again.",
      recoverByFacePermissionDenied: isThai ? "ไม่ได้รับสิทธิ์ใช้งานกล้อง กรุณาอนุญาตกล้องในเบราว์เซอร์ หรือใช้การกู้คืนทางเลือก" : isLao ? "ບໍ່ໄດ້ຮັບສິດໃຊ້ກ້ອງ ກະລຸນາອະນຸຍາດກ້ອງ ຫຼື ໃຊ້ວິທີກູ້ຄືນອື່ນ" : "Camera permission denied. Allow camera access or use alternative recovery.",
      recoverByOrderAction: isThai ? "กู้คืนด้วยข้อมูลคำสั่งซื้อ" : isLao ? "ກູ້ຄືນດ້ວຍຂໍ້ມູນອໍເດີ" : "Recover by Order Info",
      recoverByOrderTitle: isThai ? "กู้คืนบัญชีด้วยข้อมูลคำสั่งซื้อ" : isLao ? "ກູ້ຄືນບັນຊີດ້ວຍຂໍ້ມູນອໍເດີ" : "Recover Account by Order",
      recoverByOrderHint: isThai ? "กรอกเบอร์โทร 4 ตัวท้ายและเลขออเดอร์ล่าสุดของบัญชีนี้" : isLao ? "ກອກເບີໂທ 4 ຕົວທ້າຍ ແລະ ເລກອໍເດີຫຼ້າສຸດ" : "Enter your phone last 4 digits and your latest order number.",
      recoverByOrderPhoneLast4: isThai ? "เบอร์โทร 4 ตัวท้าย" : isLao ? "4 ຕົວທ້າຍເບີໂທ" : "Phone last 4 digits",
      recoverByOrderOrderNo: isThai ? "เลขออเดอร์ล่าสุด" : isLao ? "ເລກອໍເດີຫຼ້າສຸດ" : "Latest order number",
      recoverByOrderNeedPhone: isThai ? "กรุณากรอกเบอร์โทร 4 ตัวท้าย" : isLao ? "ກະລຸນາກອກເບີໂທ 4 ຕົວທ້າຍ" : "Please enter your phone last 4 digits.",
      recoverByOrderNeedOrderNo: isThai ? "กรุณากรอกเลขออเดอร์ล่าสุด" : isLao ? "ກະລຸນາກອກເລກອໍເດີຫຼ້າສຸດ" : "Please enter your latest order number.",
      recoverByOrderInvalidProof: isThai ? "ข้อมูลยืนยันไม่ตรงกับบัญชีนี้ กรุณาตรวจสอบอีกครั้ง" : isLao ? "ຂໍ້ມູນຢືນຢັນບໍ່ຕົງກັບບັນຊີນີ້" : "Recovery proof does not match this account.",
      recoverByOrderConfirm: isThai ? "ยืนยันกู้คืนด้วยข้อมูลออเดอร์" : isLao ? "ຢືນຢັນກູ້ຄືນດ້ວຍຂໍ້ມູນອໍເດີ" : "Confirm order recovery",
      recoverByOrderWorking: isThai ? "กำลังกู้คืน..." : isLao ? "ກຳລັງກູ້ຄືນ..." : "Recovering...",
      recoverByOrderRateLimit: isThai ? "พยายามกู้คืนบ่อยเกินไป กรุณารอแล้วลองใหม่" : isLao ? "ພະຍາຍາມກູ້ຄືນຫຼາຍເກີນໄປ ກະລຸນາລໍຖ້າ" : "Too many recovery attempts. Please try again later.",
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
    googlePendingTitle: isThai ? "Google Login กำลังเตรียมใช้งาน" : isLao ? "Google Login ກຳລັງກຽມໃຊ້ງານ" : "Google Login Is Coming Soon",
    googlePendingDescription: isThai
      ? "ระบบล็อกอินด้วย Google อยู่ระหว่างรอดำเนินการ และจะเปิดใช้งานในเร็ว ๆ นี้"
      : isLao
        ? "ລະບົບເຂົ້າລະບົບດ້ວຍ Google ກຳລັງລໍຖ້າດຳເນີນການ ແລະ ຈະເປີດໃຊ້ໄວໆນີ້"
        : "Google sign-in is currently pending setup and will be available soon.",
    googlePendingClose: isThai ? "รับทราบ" : isLao ? "ຮັບຊາບ" : "Got it",
    fullNamePlaceholder: isThai ? "ชื่อ-นามสกุล" : isLao ? "ຊື່-ນາມສະກຸນ" : "Full name",
    phonePlaceholder: isThai ? "เบอร์โทรศัพท์" : isLao ? "ເບີໂທລະສັບ" : "Phone number",
    emailPlaceholder: "you@example.com",
    passwordPlaceholder: "********",
    or: "OR",
    emailNotConfirmed: isThai ? "อีเมลยังไม่ยืนยัน กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ" : isLao ? "ອີເມວຍັງບໍ່ຖືກຢືນຢັນ ກະລຸນາຢືນຢັນອີເມວກ່ອນ" : "Email not confirmed. Please confirm your email before signing in.",
    resendConfirm: isThai ? "ส่งอีเมลยืนยันใหม่" : isLao ? "ສົ່ງອີເມວຢືນຢັນອີກຄັ້ງ" : "Resend confirmation email",
    resendConfirmSuccess: isThai ? "ส่งอีเมลยืนยันใหม่แล้ว กรุณาตรวจสอบกล่องจดหมาย" : isLao ? "ສົ່ງອີເມວຢືນຢັນແລ້ວ ກະລຸນາກວດກ່ອງຂໍ້ຄວາມ" : "Confirmation email sent. Please check your inbox.",
    resendConfirmNeedEmail: isThai ? "กรุณากรอกอีเมลก่อนส่งอีเมลยืนยัน" : isLao ? "ກະລຸນາກອກອີເມວກ່ອນສົ່ງ" : "Please enter your email first.",
    sessionExpired: isThai ? "ไม่มีการใช้งานเกิน 24 ชั่วโมง ระบบออกจากระบบอัตโนมัติแล้ว กรุณาเข้าสู่ระบบใหม่" : isLao ? "ບໍ່ມີການໃຊ້ງານເກີນ 24 ຊົ່ວໂມງ ລະບົບໄດ້ອອກຈາກລະບົບອັດຕະໂນມັດ ກະລຸນາເຂົ້າໃໝ່" : "You were signed out after 24 hours of inactivity. Please sign in again.",
    errorPopupTitle: isThai ? "เกิดข้อผิดพลาดในการเข้าสู่ระบบ" : isLao ? "ເກີດຂໍ້ຜິດພາດໃນການເຂົ້າລະບົບ" : "Sign-in error",
    errorPopupClose: isThai ? "ปิด" : isLao ? "ປິດ" : "Close",
    accountDeletePending: isThai ? "กำลังดำเนินการลบบัญชีผู้ใช้ โปรดกู้คืนบัญชีผู้ใช้ก่อนแก้ไขโปรไฟล์" : isLao ? "ບັນຊີຢູ່ລະຫວ່າງລໍລົບ ກະລຸນາກູ້ຄືນກ່ອນແກ້ໄຂໂປຣໄຟລ໌" : "Account deletion is pending. Recover your account before editing profile.",
    recoveryLinkAction: isThai ? "ส่ง OTP ทางอีเมล" : isLao ? "ສົ່ງ OTP ທາງອີເມວ" : "Send Email OTP",
    recoveryLinkSending: isThai ? "กำลังส่ง OTP..." : isLao ? "ກຳລັງສົ່ງ OTP..." : "Sending OTP...",
    recoveryLinkSent: isThai ? "หากอีเมลนี้มีอยู่ในระบบ เราได้ส่ง OTP แล้ว กรุณาตรวจสอบอีเมลและกรอกรหัสด้านล่าง" : isLao ? "ຖ້າອີເມວນີ້ມີຢູ່ໃນລະບົບ ພວກເຮົາໄດ້ສົ່ງ OTP ແລ້ວ ກະລຸນາກວດອີເມວ" : "If this email exists in our system, OTP has been sent. Please check your email and enter the code below.",
    recoveryNeedEmail: isThai ? "กรุณากรอกอีเมลก่อนส่ง OTP กู้คืนบัญชี" : isLao ? "ກະລຸນາກອກອີເມວກ່ອນສົ່ງ OTP ກູ້ຄືນ" : "Please enter your email before sending recovery OTP.",
    recoveryOtpPlaceholder: isThai ? "รหัส OTP (ตัวเลขเท่านั้น)" : isLao ? "ລະຫັດ OTP (ຕົວເລກເທົ່ານັ້ນ)" : "OTP code (digits only)",
    recoveryOtpAction: isThai ? "ยืนยัน OTP และกู้คืนบัญชี" : isLao ? "ຢືນຢັນ OTP ແລະ ກູ້ຄືນບັນຊີ" : "Verify OTP & Recover",
    recoveryOtpWorking: isThai ? "กำลังยืนยัน OTP..." : isLao ? "ກຳລັງຢືນຢັນ OTP..." : "Verifying OTP...",
    recoveryOtpNeed: isThai ? "กรุณากรอกรหัส OTP อย่างน้อย 6 หลัก" : isLao ? "ກະລຸນາກອກ OTP ຢ່າງນ້ອຍ 6 ຫຼັກ" : "Please enter at least 6 OTP digits.",
    recoveryOtpInvalid: isThai ? "รหัส OTP ไม่ถูกต้องหรือหมดอายุ กรุณาขอรหัสใหม่" : isLao ? "OTP ບໍ່ຖືກ ຫຼື ໝົດອາຍຸ ກະລຸນາຂໍໃໝ່" : "OTP is invalid or expired. Request a new code.",
    recoveryNeedKyc: isThai ? "บัญชีนี้ยังไม่ผ่าน KYC ใบหน้า กรุณาทำ KYC ก่อนดำเนินการ" : isLao ? "ບັນຊີນີ້ຍັງບໍ່ຜ່ານ KYC ໃບໜ້າ ກະລຸນາເຮັດ KYC ກ່ອນ" : "Face KYC is required before continuing.",
    recoveryExpired: isThai ? "หมดเวลาการกู้คืนบัญชี (เกิน 3 วัน)" : isLao ? "ໝົດເວລາກູ້ຄືນບັນຊີ (ເກີນ 3 ມື້)" : "Recovery window has expired (over 3 days).",
    recoveryFailed: isThai ? "กู้คืนบัญชีไม่สำเร็จ กรุณาลองอีกครั้ง" : isLao ? "ກູ້ຄືນບັນຊີບໍ່ສຳເລັດ ກະລຸນາລອງໃໝ່" : "Account recovery failed. Please try again.",
    accountRecovered: isThai ? "กู้คืนบัญชีสำเร็จแล้ว สามารถใช้งานต่อได้ทันที" : isLao ? "ກູ້ຄືນບັນຊີສຳເລັດແລ້ວ" : "Account recovered successfully.",
    unauthorized: isThai ? "อีเมลหรือรหัสผ่านไม่ถูกต้อง" : isLao ? "ອີເມວ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ" : "Invalid email or password.",
    networkUnstable: isThai ? "เครือข่ายไม่เสถียร กรุณาลองใหม่" : isLao ? "ເຄືອຂ່າຍບໍ່ສະຖຽນ ກະລຸນາລອງໃໝ່" : "Network unstable. Please try again.",
    emailRateLimit: isThai ? "ส่งอีเมลบ่อยเกินไป กรุณารอสักครู่ หรือกู้คืนด้วยสแกนหน้า/ข้อมูลคำสั่งซื้อ" : isLao ? "ສົ່ງອີເມວຖີ່ເກີນໄປ ກະລຸນາລໍຖ້າ ຫຼື ກູ້ຄືນດ້ວຍສະແກນໃບໜ້າ/ຂໍ້ມູນອໍເດີ" : "Email rate limit exceeded. Please wait or recover with face scan/order info.",
    recoverByFaceAction: isThai ? "กู้คืนด้วยสแกนหน้า" : isLao ? "ກູ້ຄືນດ້ວຍສະແກນໃບໜ້າ" : "Recover by Face Scan",
    recoverByFaceTitle: isThai ? "กู้คืนบัญชีด้วยสแกนหน้า" : isLao ? "ກູ້ຄືນບັນຊີດ້ວຍສະແກນໃບໜ້າ" : "Recover Account by Face Scan",
    recoverByFacePassword: isThai ? "รหัสผ่านยืนยัน" : isLao ? "ລະຫັດຜ່ານຢືນຢັນ" : "Confirm password",
    recoverByFaceScan: isThai ? "สแกนใบหน้า" : isLao ? "ສະແກນໃບໜ້າ" : "Scan Face",
    recoverByFaceScanning: isThai ? "กำลังสแกน..." : isLao ? "ກຳລັງສະແກນ..." : "Scanning...",
    recoverByFaceScanned: isThai ? "ยืนยันใบหน้าสำเร็จ" : isLao ? "ຢືນຢັນໃບໜ້າສຳເລັດ" : "Face scan verified.",
    recoverByFaceNeedScan: isThai ? "กรุณาสแกนใบหน้าก่อนยืนยันกู้คืน" : isLao ? "ກະລຸນາສະແກນໃບໜ້າກ່ອນຢືນຢັນກູ້ຄືນ" : "Please scan face before recovery.",
    recoverByFaceConfirm: isThai ? "ยืนยันกู้คืนบัญชี" : isLao ? "ຢືນຢັນກູ້ຄືນບັນຊີ" : "Confirm recovery",
    recoverByFaceCancel: isThai ? "ยกเลิก" : isLao ? "ຍົກເລີກ" : "Cancel",
    recoverByFaceWorking: isThai ? "กำลังกู้คืน..." : isLao ? "ກຳລັງກູ້ຄືນ..." : "Recovering...",
    recoverByFaceNoCamera: isThai ? "อุปกรณ์นี้ไม่รองรับกล้อง" : isLao ? "ອຸປະກອນນີ້ບໍ່ຮອງຮັບກ້ອງ" : "Camera is not available on this device.",
    recoverByFaceFailed: isThai ? "สแกนใบหน้าไม่สำเร็จ กรุณาลองใหม่ในที่แสงพอ" : isLao ? "ສະແກນໃບໜ້າບໍ່ສຳເລັດ ກະລຸນາລອງໃໝ່" : "Face scan failed. Please try again.",
    recoverByFacePermissionDenied: isThai ? "ไม่ได้รับสิทธิ์ใช้งานกล้อง กรุณาอนุญาตกล้องในเบราว์เซอร์ หรือใช้การกู้คืนทางเลือก" : isLao ? "ບໍ່ໄດ້ຮັບສິດໃຊ້ກ້ອງ ກະລຸນາອະນຸຍາດກ້ອງ ຫຼື ໃຊ້ວິທີກູ້ຄືນອື່ນ" : "Camera permission denied. Allow camera access or use alternative recovery.",
    recoverByOrderAction: isThai ? "กู้คืนด้วยข้อมูลคำสั่งซื้อ" : isLao ? "ກູ້ຄືນດ້ວຍຂໍ້ມູນອໍເດີ" : "Recover by Order Info",
    recoverByOrderTitle: isThai ? "กู้คืนบัญชีด้วยข้อมูลคำสั่งซื้อ" : isLao ? "ກູ້ຄືນບັນຊີດ້ວຍຂໍ້ມູນອໍເດີ" : "Recover Account by Order",
    recoverByOrderHint: isThai ? "กรอกเบอร์โทร 4 ตัวท้ายและเลขออเดอร์ล่าสุดของบัญชีนี้" : isLao ? "ກອກເບີໂທ 4 ຕົວທ້າຍ ແລະ ເລກອໍເດີຫຼ້າສຸດ" : "Enter your phone last 4 digits and your latest order number.",
    recoverByOrderPhoneLast4: isThai ? "เบอร์โทร 4 ตัวท้าย" : isLao ? "4 ຕົວທ້າຍເບີໂທ" : "Phone last 4 digits",
    recoverByOrderOrderNo: isThai ? "เลขออเดอร์ล่าสุด" : isLao ? "ເລກອໍເດີຫຼ້າສຸດ" : "Latest order number",
    recoverByOrderNeedPhone: isThai ? "กรุณากรอกเบอร์โทร 4 ตัวท้าย" : isLao ? "ກະລຸນາກອກເບີໂທ 4 ຕົວທ້າຍ" : "Please enter your phone last 4 digits.",
    recoverByOrderNeedOrderNo: isThai ? "กรุณากรอกเลขออเดอร์ล่าสุด" : isLao ? "ກະລຸນາກອກເລກອໍເດີຫຼ້າສຸດ" : "Please enter your latest order number.",
    recoverByOrderInvalidProof: isThai ? "ข้อมูลยืนยันไม่ตรงกับบัญชีนี้ กรุณาตรวจสอบอีกครั้ง" : isLao ? "ຂໍ້ມູນຢືນຢັນບໍ່ຕົງກັບບັນຊີນີ້" : "Recovery proof does not match this account.",
    recoverByOrderConfirm: isThai ? "ยืนยันกู้คืนด้วยข้อมูลออเดอร์" : isLao ? "ຢືນຢັນກູ້ຄືນດ້ວຍຂໍ້ມູນອໍເດີ" : "Confirm order recovery",
    recoverByOrderWorking: isThai ? "กำลังกู้คืน..." : isLao ? "ກຳລັງກູ້ຄືນ..." : "Recovering...",
    recoverByOrderRateLimit: isThai ? "พยายามกู้คืนบ่อยเกินไป กรุณารอแล้วลองใหม่" : isLao ? "ພະຍາຍາມກູ້ຄືນຫຼາຍເກີນໄປ ກະລຸນາລໍຖ້າ" : "Too many recovery attempts. Please try again later.",
  };
}

class CustomerAuthFlowError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "CustomerAuthFlowError";
    this.code = code;
  }
}

function mapAuthErrorMessage(message: string, locale: AppLocale, textCopy: ReturnType<typeof text>) {
  const lower = message.toLowerCase();

  if (
    lower.includes("unauthorized")
    || lower.includes("invalid login credentials")
    || lower.includes("invalid credentials")
  ) {
    return textCopy.unauthorized;
  }

  if (
    lower.includes("network unstable")
    || lower.includes("timed out")
    || lower.includes("fetch failed")
    || lower.includes("connect timeout")
    || lower.includes("und_err_connect_timeout")
  ) {
    return textCopy.networkUnstable;
  }

  if (lower.includes("account deletion is pending")) {
    return textCopy.accountDeletePending;
  }

  if (lower.includes("email rate limit exceeded") || lower.includes("rate limit")) {
    return textCopy.emailRateLimit;
  }

  if (locale === "th" && lower.includes("unable to resend confirmation email")) {
    return "ส่งอีเมลยืนยันไม่สำเร็จ กรุณาลองใหม่";
  }

  if (locale === "lo" && lower.includes("unable to resend confirmation email")) {
    return "ສົ່ງອີເມວຢືນຢັນບໍ່ສຳເລັດ ກະລຸນາລອງໃໝ່";
  }

  return message;
}

function isEmailRateLimitError(message: string) {
  const lower = message.toLowerCase();
  return lower.includes("email rate limit exceeded") || lower.includes("rate limit");
}

async function upsertProfile(input: { fullName?: string; phone?: string }) {
  const response = await fetch("/api/customer/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { code?: string; error?: string } | null;
    throw new CustomerAuthFlowError(payload?.code ?? "PROFILE_UPDATE_FAILED", payload?.error ?? "Failed to update profile");
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
  const kycPath = withLocale(locale, "/kyc/start", useLocalePrefix);
  const switchPath = withLocale(locale, mode === "register" ? "/auth/login" : "/auth/register", useLocalePrefix);
  const verifyEmailPath = withLocale(locale, "/auth/verify-email", useLocalePrefix);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendingConfirm, setResendingConfirm] = useState(false);
  const [sendingRecoveryLink, setSendingRecoveryLink] = useState(false);
  const [emailRecoveryOtp, setEmailRecoveryOtp] = useState("");
  const [emailRecoveryOtpSent, setEmailRecoveryOtpSent] = useState(false);
  const [recoveringByEmailOtp, setRecoveringByEmailOtp] = useState(false);
  const [pendingConfirmEmail, setPendingConfirmEmail] = useState<string | null>(null);
  const [pendingDeleteRecovery, setPendingDeleteRecovery] = useState(false);
  const [emailRateLimited, setEmailRateLimited] = useState(false);
  const [showFaceRecoveryModal, setShowFaceRecoveryModal] = useState(false);
  const [showOrderRecoveryModal, setShowOrderRecoveryModal] = useState(false);
  const [recoverPassword, setRecoverPassword] = useState("");
  const [recoverPhoneLast4, setRecoverPhoneLast4] = useState("");
  const [recoverOrderNo, setRecoverOrderNo] = useState("");
  const [faceScanPassed, setFaceScanPassed] = useState(false);
  const [faceScanMethod, setFaceScanMethod] = useState("");
  const [faceScanning, setFaceScanning] = useState(false);
  const [recoveringByFace, setRecoveringByFace] = useState(false);
  const [recoveringByOrder, setRecoveringByOrder] = useState(false);
  const [faceRecoveryError, setFaceRecoveryError] = useState<string | null>(null);
  const [orderRecoveryError, setOrderRecoveryError] = useState<string | null>(null);
  const [showGooglePendingModal, setShowGooglePendingModal] = useState(false);
  const [googlePendingClosing, setGooglePendingClosing] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorModalClosing, setErrorModalClosing] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const googlePendingCloseTimer = useRef<NodeJS.Timeout | null>(null);
  const errorModalCloseTimer = useRef<NodeJS.Timeout | null>(null);
  const forgotPasswordActionLabel = locale === "th" ? "ลืมรหัสผ่าน?" : locale === "lo" ? "ລືມລະຫັດຜ່ານ?" : "Forgot password?";

  const emailRecoveryOtpValue = normalizeOtpDigits(emailRecoveryOtp);
  const isEmailRecoveryOtpComplete = emailRecoveryOtpValue.length >= EMAIL_RECOVERY_OTP_MIN_LENGTH;

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

    if (params.get("account_recovered") === "1") {
      setMessage(t.accountRecovered);
    }

    const errorCode = params.get("error");
    if (!errorCode) return;

    if (errorCode === "network_unstable") {
      setError(t.networkUnstable);
      return;
    }
    if (errorCode === "oauth_failed") {
      setError(mode === "register" ? "สมัครสมาชิกด้วย Google ไม่สำเร็จ" : "เข้าสู่ระบบด้วย Google ไม่สำเร็จ");
      return;
    }
    if (errorCode === "profile_upsert_failed") {
      setError(locale === "th" ? "เข้าสู่ระบบสำเร็จ แต่บันทึกข้อมูลลูกค้าไม่สำเร็จ กรุณาลองใหม่" : "Profile update after sign-in failed. Please try again.");
      return;
    }
    if (errorCode === "oauth_code_missing") {
      setError(locale === "th" ? "ไม่พบโค้ดยืนยันจากระบบเข้าสู่ระบบ" : "Missing OAuth callback code.");
      return;
    }
    if (errorCode === "account_recovery_expired") {
      setError(t.recoveryExpired);
      return;
    }
    if (errorCode === "account_recovery_failed") {
      setError(t.recoveryFailed);
      return;
    }
    if (errorCode === "session_expired") {
      setError(t.sessionExpired);
    }
  }, [email, locale, mode, t.accountRecovered, t.networkUnstable, t.recoveryExpired, t.recoveryFailed, t.sessionExpired]);

  useEffect(() => {
    return () => {
      if (googlePendingCloseTimer.current) {
        clearTimeout(googlePendingCloseTimer.current);
      }
      if (errorModalCloseTimer.current) {
        clearTimeout(errorModalCloseTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!error) {
      setShowErrorModal(false);
      setErrorModalClosing(false);
      if (errorModalCloseTimer.current) {
        clearTimeout(errorModalCloseTimer.current);
        errorModalCloseTimer.current = null;
      }
      return;
    }
    if (errorModalCloseTimer.current) {
      clearTimeout(errorModalCloseTimer.current);
      errorModalCloseTimer.current = null;
    }
    setErrorModalClosing(false);
    setShowErrorModal(true);
  }, [error]);

  function openGooglePendingModal() {
    if (googlePendingCloseTimer.current) {
      clearTimeout(googlePendingCloseTimer.current);
      googlePendingCloseTimer.current = null;
    }
    setGooglePendingClosing(false);
    setShowGooglePendingModal(true);
  }

  function closeGooglePendingModal() {
    setGooglePendingClosing(true);
    googlePendingCloseTimer.current = setTimeout(() => {
      setShowGooglePendingModal(false);
      setGooglePendingClosing(false);
      googlePendingCloseTimer.current = null;
    }, 220);
  }

  function closeErrorModal() {
    setErrorModalClosing(true);
    errorModalCloseTimer.current = setTimeout(() => {
      setShowErrorModal(false);
      setErrorModalClosing(false);
      errorModalCloseTimer.current = null;
    }, 220);
  }

  async function resolveCustomerPostAuthPath() {
    try {
      const response = await fetch("/api/customer/kyc/session", { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as { ok?: boolean; data?: { kycStatus?: string } } | null;
      if (!response.ok || !payload?.ok) {
        return accountPath;
      }
      return String(payload.data?.kycStatus ?? "").trim().toLowerCase() === "approved" ? accountPath : kycPath;
    } catch {
      return accountPath;
    }
  }

  async function handlePasswordAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    setPendingConfirmEmail(null);
    setPendingDeleteRecovery(false);
    setEmailRateLimited(false);
    setEmailRecoveryOtp("");
    setEmailRecoveryOtpSent(false);

    try {
      const supabase = getSupabaseBrowserClient();

      if (mode === "register") {
        const emailRedirectTo = buildCustomerAuthCallbackUrl(locale);
        if (!emailRedirectTo) {
          setError(locale === "th" ? "ไม่พบโดเมนสำหรับยืนยันอีเมล" : "Missing callback redirect URL");
          return;
        }
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo,
            data: {
              role: "customer",
              full_name: fullName,
              phone,
            },
          },
        });

        if (signUpError) {
          setError(mapAuthErrorMessage(signUpError.message, locale, t));
          return;
        }

        if (!data.session) {
          setMessage(locale === "th"
            ? "สมัครสำเร็จ กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชี จากนั้นระบบจะพาไปทำ KYC สแกนใบหน้า"
            : "Registration complete. Please verify your email, then continue to face KYC.");
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
          } else if (signInError.message.toLowerCase().includes("account deletion is pending")) {
            setPendingDeleteRecovery(true);
            setError(t.accountDeletePending);
          } else if (isEmailRateLimitError(signInError.message)) {
            setPendingDeleteRecovery(true);
            setEmailRateLimited(true);
            setError(t.emailRateLimit);
          } else {
            setError(mapAuthErrorMessage(signInError.message, locale, t));
          }
          return;
        }
      }

      await upsertProfile({ fullName, phone });
      markCustomerSessionActive();
      setMessage(t.success);
      const targetPath = await resolveCustomerPostAuthPath();
      router.replace(targetPath);
      router.refresh();
    } catch (caught) {
      if (caught instanceof CustomerAuthFlowError && caught.code === "ACCOUNT_DELETE_PENDING") {
        setPendingDeleteRecovery(true);
        setError(t.accountDeletePending);
      } else {
        const fallback = caught instanceof Error ? caught.message : "Authentication failed";
        setError(mapAuthErrorMessage(fallback, locale, t));
      }
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
      const emailRedirectTo = buildCustomerAuthCallbackUrl(locale);
      if (!emailRedirectTo) {
        setError(locale === "th" ? "ไม่พบโดเมนสำหรับยืนยันอีเมล" : "Missing callback redirect URL");
        return;
      }

      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: normalizedEmail,
        options: {
          emailRedirectTo,
        },
      });

      if (resendError) {
        setError(mapAuthErrorMessage(resendError.message, locale, t));
        return;
      }

      setMessage(t.resendConfirmSuccess);
      setPendingConfirmEmail(normalizedEmail);
    } catch {
      setError(mapAuthErrorMessage("Unable to resend confirmation email", locale, t));
    } finally {
      setResendingConfirm(false);
    }
  }

  async function handleSendRecoveryLink() {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError(t.recoveryNeedEmail);
      return;
    }

    setSendingRecoveryLink(true);
    setError(null);
    setMessage(null);
    setEmailRateLimited(false);
    setEmailRecoveryOtp("");

    try {
      const emailRedirectTo = buildCustomerAuthCallbackUrl(locale, { recoverAccount: true });
      const response = await fetch("/api/customer/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail.toLowerCase(),
          purpose: "account_recovery",
          ...(emailRedirectTo ? { emailRedirectTo } : {}),
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; code?: string; error?: string; message?: string }
        | null;

      if (!response.ok || !payload?.ok) {
        if (payload?.code === "RATE_LIMITED") {
          setPendingDeleteRecovery(true);
          setEmailRateLimited(true);
          setError(t.emailRateLimit);
          return;
        }
        throw new Error(mapAuthErrorMessage(payload?.error ?? t.recoveryFailed, locale, t));
      }

      setPendingDeleteRecovery(true);
      setEmailRecoveryOtpSent(true);
      setMessage(t.recoveryLinkSent);
    } catch (caught) {
      const fallback = caught instanceof Error ? caught.message : t.recoveryFailed;
      setError(mapAuthErrorMessage(fallback, locale, t));
    } finally {
      setSendingRecoveryLink(false);
    }
  }

  async function handleRecoverByEmailOtp() {
    const normalizedEmail = email.trim();
    const normalizedOtp = emailRecoveryOtpValue;
    if (!normalizedEmail) {
      setError(t.recoveryNeedEmail);
      return;
    }
    if (normalizedOtp.length < EMAIL_RECOVERY_OTP_MIN_LENGTH) {
      setError(t.recoveryOtpNeed);
      return;
    }

    setRecoveringByEmailOtp(true);
    setError(null);
    setMessage(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: normalizedEmail,
        token: normalizedOtp,
        type: "email",
      });

      if (verifyError) {
        const lower = verifyError.message.toLowerCase();
        if (lower.includes("token") || lower.includes("otp") || lower.includes("expired")) {
          throw new Error(t.recoveryOtpInvalid);
        }
        throw new Error(mapAuthErrorMessage(verifyError.message, locale, t));
      }

      const response = await fetch("/api/customer/account-delete/recover-email-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const payload = (await response.json().catch(() => null)) as { ok?: boolean; code?: string; error?: string } | null;
      if (!response.ok || !payload?.ok) {
        if (payload?.code === "DELETION_RECOVERY_EXPIRED") {
          throw new Error(t.recoveryExpired);
        }
        if (payload?.code === "KYC_FACE_REQUIRED" || payload?.code === "KYC_SCHEMA_MISSING") {
          throw new Error(t.recoveryNeedKyc);
        }
        throw new Error(mapAuthErrorMessage(payload?.error ?? t.recoveryFailed, locale, t));
      }

      markCustomerSessionActive();
      setPendingDeleteRecovery(false);
      setEmailRateLimited(false);
      setEmailRecoveryOtpSent(false);
      setEmailRecoveryOtp("");
      setError(null);
      setMessage(t.accountRecovered);
      router.replace(accountPath);
      router.refresh();
    } catch (caught) {
      const fallback = caught instanceof Error ? caught.message : t.recoveryFailed;
      setError(mapAuthErrorMessage(fallback, locale, t));
    } finally {
      setRecoveringByEmailOtp(false);
    }
  }

  function openFaceRecoveryModal() {
    setRecoverPassword(password);
    setFaceScanPassed(false);
    setFaceScanMethod("");
    setFaceRecoveryError(null);
    setErrorModalClosing(false);
    setShowErrorModal(false);
    setShowFaceRecoveryModal(true);
  }

  function openOrderRecoveryModal() {
    setRecoverPhoneLast4("");
    setRecoverOrderNo("");
    setOrderRecoveryError(null);
    setErrorModalClosing(false);
    setShowErrorModal(false);
    setShowOrderRecoveryModal(true);
  }

  function closeFaceRecoveryModal() {
    if (recoveringByFace || faceScanning) {
      return;
    }
    setFaceRecoveryError(null);
    setShowFaceRecoveryModal(false);
  }

  function closeOrderRecoveryModal() {
    if (recoveringByOrder) {
      return;
    }
    setOrderRecoveryError(null);
    setShowOrderRecoveryModal(false);
  }

  function mapFaceScanError(caught: unknown) {
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
      return t.recoverByFacePermissionDenied;
    }

    if (name === "notfounderror" || name === "notreadableerror") {
      return t.recoverByFaceNoCamera;
    }

    if (lower.includes("could not start video") || lower.includes("could not access video stream")) {
      return t.recoverByFaceNoCamera;
    }

    return message || t.recoverByFaceFailed;
  }

  async function handleFaceScan() {
    if (faceScanning) {
      return;
    }
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setFaceRecoveryError(t.recoverByFaceNoCamera);
      return;
    }

    setFaceScanning(true);
    setFaceRecoveryError(null);
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

      await new Promise<void>((resolve) => {
        if (video.readyState >= 2) {
          resolve();
          return;
        }
        video.onloadeddata = () => resolve();
      });

      const width = video.videoWidth || 640;
      const height = video.videoHeight || 480;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error(t.recoverByFaceFailed);
      }
      context.drawImage(video, 0, 0, width, height);

      let scanMethod = "camera";
      let detected = true;

      const windowWithFaceDetector = window as Window & {
        FaceDetector?: new (options?: { fastMode?: boolean; maxDetectedFaces?: number }) => {
          detect: (input: HTMLCanvasElement) => Promise<Array<unknown>>;
        };
      };
      if (windowWithFaceDetector.FaceDetector) {
        scanMethod = "camera+facedetector";
        const detector = new windowWithFaceDetector.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
        const faces = await detector.detect(canvas);
        detected = Array.isArray(faces) && faces.length > 0;
      }

      if (!detected) {
        throw new Error(t.recoverByFaceFailed);
      }

      setFaceScanPassed(true);
      setFaceScanMethod(scanMethod);
      setMessage(t.recoverByFaceScanned);
    } catch (caught) {
      setFaceScanPassed(false);
      setFaceScanMethod("");
      setFaceRecoveryError(mapFaceScanError(caught));
    } finally {
      if (stream) {
        for (const track of stream.getTracks()) {
          track.stop();
        }
      }
      setFaceScanning(false);
    }
  }

  async function handleRecoverByFace() {
    const normalizedEmail = email.trim();
    const normalizedPassword = recoverPassword.trim();
    if (!normalizedEmail) {
      setFaceRecoveryError(t.recoveryNeedEmail);
      return;
    }
    if (!normalizedPassword) {
      setFaceRecoveryError(t.unauthorized);
      return;
    }
    if (!faceScanPassed) {
      setFaceRecoveryError(t.recoverByFaceNeedScan);
      return;
    }

    setRecoveringByFace(true);
    setFaceRecoveryError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/customer/account-delete/recover-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          password: normalizedPassword,
          faceScanPassed: true,
          faceScanMethod: faceScanMethod || "camera",
        }),
      });

      const payload = (await response.json().catch(() => null)) as { ok?: boolean; code?: string; error?: string } | null;
      if (!response.ok || !payload?.ok) {
        if (payload?.code === "DELETION_RECOVERY_EXPIRED") {
          throw new Error(t.recoveryExpired);
        }
        if (payload?.code === "KYC_FACE_REQUIRED" || payload?.code === "KYC_SCHEMA_MISSING") {
          throw new Error(t.recoveryNeedKyc);
        }
        if (payload?.code === "INVALID_PASSWORD") {
          throw new Error(t.unauthorized);
        }
        if (payload?.code === "FACE_SCAN_REQUIRED") {
          throw new Error(t.recoverByFaceNeedScan);
        }
        throw new Error(mapAuthErrorMessage(payload?.error ?? t.recoveryFailed, locale, t));
      }

      const supabase = getSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: normalizedPassword,
      });

      if (signInError) {
        setPendingDeleteRecovery(false);
        setEmailRateLimited(false);
        setEmailRecoveryOtpSent(false);
        setEmailRecoveryOtp("");
        setError(null);
        setMessage(t.accountRecovered);
        setShowFaceRecoveryModal(false);
        return;
      }

      markCustomerSessionActive();
      setPendingDeleteRecovery(false);
      setEmailRateLimited(false);
      setEmailRecoveryOtpSent(false);
      setEmailRecoveryOtp("");
      setError(null);
      setMessage(t.accountRecovered);
      setShowFaceRecoveryModal(false);
      router.replace(accountPath);
      router.refresh();
    } catch (caught) {
      const fallback = caught instanceof Error ? caught.message : t.recoveryFailed;
      setFaceRecoveryError(mapAuthErrorMessage(fallback, locale, t));
    } finally {
      setRecoveringByFace(false);
    }
  }

  async function handleRecoverByOrder() {
    const normalizedEmail = email.trim();
    const normalizedPhoneLast4 = recoverPhoneLast4.replace(/\D/g, "").slice(-4);
    const normalizedOrderNo = recoverOrderNo.trim().toUpperCase();

    if (!normalizedEmail) {
      setOrderRecoveryError(t.recoveryNeedEmail);
      return;
    }
    if (normalizedPhoneLast4.length !== 4) {
      setOrderRecoveryError(t.recoverByOrderNeedPhone);
      return;
    }
    if (!normalizedOrderNo) {
      setOrderRecoveryError(t.recoverByOrderNeedOrderNo);
      return;
    }

    setRecoveringByOrder(true);
    setOrderRecoveryError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/customer/account-delete/recover-order-proof", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          phoneLast4: normalizedPhoneLast4,
          lastOrderNo: normalizedOrderNo,
        }),
      });

      const payload = (await response.json().catch(() => null)) as { ok?: boolean; code?: string; error?: string } | null;
      if (!response.ok || !payload?.ok) {
        if (payload?.code === "DELETION_RECOVERY_EXPIRED") {
          throw new Error(t.recoveryExpired);
        }
        if (payload?.code === "KYC_FACE_REQUIRED" || payload?.code === "KYC_SCHEMA_MISSING") {
          throw new Error(t.recoveryNeedKyc);
        }
        if (payload?.code === "RECOVERY_PROOF_INVALID") {
          throw new Error(t.recoverByOrderInvalidProof);
        }
        if (payload?.code === "RATE_LIMITED") {
          throw new Error(t.recoverByOrderRateLimit);
        }
        throw new Error(mapAuthErrorMessage(payload?.error ?? t.recoveryFailed, locale, t));
      }

      setPendingDeleteRecovery(false);
      setEmailRateLimited(false);
      setEmailRecoveryOtpSent(false);
      setEmailRecoveryOtp("");
      setError(null);
      setMessage(t.accountRecovered);
      setShowOrderRecoveryModal(false);
    } catch (caught) {
      const fallback = caught instanceof Error ? caught.message : t.recoveryFailed;
      setOrderRecoveryError(mapAuthErrorMessage(fallback, locale, t));
    } finally {
      setRecoveringByOrder(false);
    }
  }

  async function handleGoogleAuth() {
    const googleAuthEnabled = process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH === "true";
    if (!googleAuthEnabled) {
      openGooglePendingModal();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const redirectTo = buildCustomerAuthCallbackUrl(locale);
      if (!redirectTo) {
        setError(locale === "th" ? "ไม่พบโดเมนสำหรับเข้าสู่ระบบ" : "Missing callback redirect URL");
        return;
      }

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
        },
      });

      if (oauthError) {
        setError(mapAuthErrorMessage(oauthError.message, locale, t));
      }
    } catch {
      setError(locale === "th" ? "ไม่สามารถใช้งาน Google เพื่อเข้าสู่ระบบได้ในขณะนี้" : "Unable to continue with Google");
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
        {pendingDeleteRecovery || emailRateLimited ? (
          <div className="mt-3 space-y-2">
            <div className="grid gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={handleSendRecoveryLink}
                disabled={sendingRecoveryLink || loading || recoveringByEmailOtp}
                className="inline-flex w-full items-center justify-center rounded-xl border border-sky-400/55 bg-sky-500/10 px-3 py-2 text-sm font-semibold text-sky-200 transition hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sendingRecoveryLink ? t.recoveryLinkSending : t.recoveryLinkAction}
              </button>
              <button
                type="button"
                onClick={openFaceRecoveryModal}
                disabled={loading || recoveringByEmailOtp}
                className="inline-flex w-full items-center justify-center rounded-xl border border-emerald-400/55 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {t.recoverByFaceAction}
              </button>
              <button
                type="button"
                onClick={openOrderRecoveryModal}
                disabled={loading || recoveringByEmailOtp}
                className="inline-flex w-full items-center justify-center rounded-xl border border-amber-400/55 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-200 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {t.recoverByOrderAction}
              </button>
            </div>
            {emailRecoveryOtpSent ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={emailRecoveryOtp}
                  onChange={(event) => setEmailRecoveryOtp(normalizeOtpDigits(event.target.value))}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="one-time-code"
                  placeholder={t.recoveryOtpPlaceholder}
                  aria-label={t.recoveryOtpPlaceholder}
                  className="h-12 w-full rounded-xl border border-sky-300/40 bg-black/45 px-4 text-center text-base font-semibold tracking-[0.18em] text-sky-100 outline-none transition focus:border-sky-200 focus:ring-2 focus:ring-sky-200/20 sm:h-12 sm:text-lg"
                />
                <button
                  type="button"
                  onClick={() => void handleRecoverByEmailOtp()}
                  disabled={recoveringByEmailOtp || !isEmailRecoveryOtpComplete}
                  className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-cyan-300/60 bg-gradient-to-r from-cyan-400 to-sky-300 px-4 text-sm font-semibold text-zinc-900 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {recoveringByEmailOtp ? t.recoveryOtpWorking : t.recoveryOtpAction}
                </button>
              </div>
            ) : null}
          </div>
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
          {mode === "login" ? (
            <button
              type="button"
              onClick={() => setShowForgotPasswordModal(true)}
              className="inline-flex text-sm font-semibold text-cyan-200 transition hover:text-cyan-100"
            >
              {forgotPasswordActionLabel}
            </button>
          ) : null}

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

      <ForgotPasswordModal
        open={showForgotPasswordModal}
        locale={locale}
        initialEmail={email}
        onClose={() => setShowForgotPasswordModal(false)}
        onSuccess={(successMessage) => {
          setShowForgotPasswordModal(false);
          setError(null);
          setMessage(successMessage);
          setPassword("");
          setPendingDeleteRecovery(false);
          setEmailRateLimited(false);
          setEmailRecoveryOtpSent(false);
          setEmailRecoveryOtp("");
          markCustomerSessionActive();
          router.replace(accountPath);
          router.refresh();
        }}
      />

      {showGooglePendingModal ? (
        <div
          className={`fixed inset-0 z-[120] flex items-center justify-center px-4 transition-opacity duration-200 ${googlePendingClosing ? "bg-black/0 opacity-0" : "bg-black/60 opacity-100"}`}
          onClick={closeGooglePendingModal}
          role="dialog"
          aria-modal="true"
        >
          <div
            className={`w-full max-w-md rounded-2xl border border-amber-500/45 bg-[radial-gradient(circle_at_top,_#312004_0%,_#130f08_42%,_#090909_100%)] p-5 text-amber-50 shadow-[0_24px_80px_rgba(0,0,0,0.56)] transition duration-200 ${googlePendingClosing ? "scale-95 opacity-0" : "scale-100 opacity-100"}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-amber-400/40 bg-amber-500/15 text-lg">
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                  <path fill="#EA4335" d="M12 10.2v4h5.65c-.24 1.29-.97 2.39-2.06 3.12l3.33 2.58c1.94-1.79 3.08-4.43 3.08-7.58 0-.73-.07-1.43-.19-2.1H12z" />
                  <path fill="#4285F4" d="M12 22c2.78 0 5.1-.92 6.8-2.5l-3.33-2.58c-.92.62-2.1.98-3.47.98-2.67 0-4.92-1.8-5.73-4.22H2.84v2.65A9.99 9.99 0 0 0 12 22z" />
                  <path fill="#FBBC05" d="M6.27 13.68a6 6 0 0 1 0-3.36V7.67H2.84a9.99 9.99 0 0 0 0 8.66l3.43-2.65z" />
                  <path fill="#34A853" d="M12 6.1c1.51 0 2.87.52 3.94 1.53l2.95-2.95C17.09 2.98 14.77 2 12 2a9.99 9.99 0 0 0-9.16 5.67l3.43 2.65C7.08 7.9 9.33 6.1 12 6.1z" />
                </svg>
              </span>
              <div>
                <h2 className="text-lg font-semibold text-amber-300">{t.googlePendingTitle}</h2>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-amber-200/60">Google Auth</p>
              </div>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-amber-100/80">{t.googlePendingDescription}</p>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={closeGooglePendingModal}
                className="inline-flex h-10 items-center justify-center rounded-full border border-amber-400/75 bg-gradient-to-r from-amber-500 to-yellow-400 px-5 text-sm font-semibold text-zinc-900 transition hover:brightness-105 active:scale-95"
              >
                {t.googlePendingClose}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showFaceRecoveryModal ? (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/65 px-4"
          onClick={closeFaceRecoveryModal}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md rounded-2xl border border-emerald-400/40 bg-[radial-gradient(circle_at_top,_rgba(52,211,153,0.18)_0%,_rgba(8,20,18,0.94)_48%,_#070a09_100%)] p-5 text-emerald-50 shadow-[0_24px_80px_rgba(0,0,0,0.56)]"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-emerald-200">{t.recoverByFaceTitle}</h2>
            <p className="mt-2 text-sm text-emerald-100/85">{t.accountDeletePending}</p>
            {faceRecoveryError ? (
              <p className="mt-3 rounded-xl border border-rose-300/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
                {faceRecoveryError}
              </p>
            ) : null}
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-emerald-100/90">{t.emailPlaceholder}</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-11 w-full rounded-xl border border-emerald-300/35 bg-black/35 px-3 text-sm text-emerald-50 outline-none transition focus:border-emerald-200 focus:ring-2 focus:ring-emerald-200/20"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-emerald-100/90">{t.recoverByFacePassword}</span>
                <input
                  type="password"
                  value={recoverPassword}
                  onChange={(event) => setRecoverPassword(event.target.value)}
                  className="h-11 w-full rounded-xl border border-emerald-300/35 bg-black/35 px-3 text-sm text-emerald-50 outline-none transition focus:border-emerald-200 focus:ring-2 focus:ring-emerald-200/20"
                />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleFaceScan()}
                disabled={faceScanning || recoveringByFace}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-emerald-300/55 bg-emerald-500/20 px-4 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {faceScanning ? t.recoverByFaceScanning : t.recoverByFaceScan}
              </button>
              {faceScanPassed ? <span className="text-sm font-semibold text-emerald-200">{t.recoverByFaceScanned}</span> : null}
            </div>
            <button
              type="button"
              onClick={() => {
                setShowFaceRecoveryModal(false);
                openOrderRecoveryModal();
              }}
              disabled={faceScanning || recoveringByFace}
              className="mt-3 inline-flex h-9 items-center justify-center rounded-lg border border-amber-300/55 bg-amber-500/10 px-3 text-xs font-semibold text-amber-100 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t.recoverByOrderAction}
            </button>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={closeFaceRecoveryModal}
                disabled={recoveringByFace || faceScanning}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-500/45 bg-slate-800/70 px-4 text-sm font-semibold text-slate-100 transition hover:bg-slate-700/80 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {t.recoverByFaceCancel}
              </button>
              <button
                type="button"
                onClick={() => void handleRecoverByFace()}
                disabled={recoveringByFace || !recoverPassword.trim() || !faceScanPassed}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-emerald-300/65 bg-gradient-to-r from-emerald-400 to-teal-300 px-4 text-sm font-semibold text-zinc-900 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {recoveringByFace ? t.recoverByFaceWorking : t.recoverByFaceConfirm}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showOrderRecoveryModal ? (
        <div
          className="fixed inset-0 z-[151] flex items-center justify-center bg-black/65 px-4"
          onClick={closeOrderRecoveryModal}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md rounded-2xl border border-amber-400/40 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.18)_0%,_rgba(22,14,4,0.94)_48%,_#080807_100%)] p-5 text-amber-50 shadow-[0_24px_80px_rgba(0,0,0,0.56)]"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-amber-200">{t.recoverByOrderTitle}</h2>
            <p className="mt-2 text-sm text-amber-100/85">{t.recoverByOrderHint}</p>
            {orderRecoveryError ? (
              <p className="mt-3 rounded-xl border border-rose-300/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
                {orderRecoveryError}
              </p>
            ) : null}
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-amber-100/90">{t.emailPlaceholder}</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-11 w-full rounded-xl border border-amber-300/35 bg-black/35 px-3 text-sm text-amber-50 outline-none transition focus:border-amber-200 focus:ring-2 focus:ring-amber-200/20"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-amber-100/90">{t.recoverByOrderPhoneLast4}</span>
                <input
                  value={recoverPhoneLast4}
                  onChange={(event) => setRecoverPhoneLast4(event.target.value.replace(/\D/g, "").slice(-4))}
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="1234"
                  className="h-11 w-full rounded-xl border border-amber-300/35 bg-black/35 px-3 text-sm text-amber-50 outline-none transition focus:border-amber-200 focus:ring-2 focus:ring-amber-200/20"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-amber-100/90">{t.recoverByOrderOrderNo}</span>
                <input
                  value={recoverOrderNo}
                  onChange={(event) => setRecoverOrderNo(event.target.value)}
                  placeholder="ORD-20260308-1234"
                  className="h-11 w-full rounded-xl border border-amber-300/35 bg-black/35 px-3 text-sm text-amber-50 outline-none transition focus:border-amber-200 focus:ring-2 focus:ring-amber-200/20"
                />
              </label>
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={closeOrderRecoveryModal}
                disabled={recoveringByOrder}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-500/45 bg-slate-800/70 px-4 text-sm font-semibold text-slate-100 transition hover:bg-slate-700/80 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {t.recoverByFaceCancel}
              </button>
              <button
                type="button"
                onClick={() => void handleRecoverByOrder()}
                disabled={recoveringByOrder}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-amber-300/65 bg-gradient-to-r from-amber-400 to-yellow-300 px-4 text-sm font-semibold text-zinc-900 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {recoveringByOrder ? t.recoverByOrderWorking : t.recoverByOrderConfirm}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showErrorModal && error ? (
        <div
          className={`fixed inset-0 z-[140] flex items-center justify-center px-4 transition-opacity duration-200 ${errorModalClosing ? "bg-black/0 opacity-0" : "bg-black/65 opacity-100"}`}
          onClick={closeErrorModal}
          role="alertdialog"
          aria-modal="true"
          aria-live="assertive"
        >
          <div
            className={`w-full max-w-md overflow-hidden rounded-2xl border border-rose-400/45 bg-[radial-gradient(circle_at_top,_rgba(255,120,120,0.2)_0%,_rgba(35,10,12,0.94)_48%,_#08080a_100%)] text-rose-50 shadow-[0_24px_80px_rgba(0,0,0,0.56)] transition duration-200 ${errorModalClosing ? "scale-95 opacity-0" : "scale-100 opacity-100"}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative p-5">
              <button
                type="button"
                onClick={closeErrorModal}
                className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-rose-300/40 bg-rose-500/10 text-rose-100 transition hover:bg-rose-500/20"
                aria-label={t.errorPopupClose}
              >
                ×
              </button>
              <div className="mb-3 flex items-center gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-rose-300/45 bg-rose-500/20 text-lg shadow-[0_0_25px_rgba(244,63,94,0.35)]">
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
                    <path d="M12 9v4m0 4h.01" />
                    <path d="M10.3 3.84 1.82 18a2 2 0 0 0 1.72 3h16.92a2 2 0 0 0 1.72-3L13.7 3.84a2 2 0 0 0-3.4 0Z" />
                  </svg>
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-rose-100">{t.errorPopupTitle}</h2>
                  <p className="text-xs uppercase tracking-[0.16em] text-rose-100/60">Authentication</p>
                </div>
              </div>
              <p className="rounded-xl border border-rose-300/30 bg-rose-500/12 px-3 py-3 text-sm leading-relaxed text-rose-100">{error}</p>
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                {pendingDeleteRecovery || emailRateLimited ? (
                  <>
                    <button
                      type="button"
                      onClick={handleSendRecoveryLink}
                      disabled={sendingRecoveryLink || loading}
                      className="inline-flex h-10 items-center justify-center rounded-full border border-sky-300/65 bg-gradient-to-r from-sky-400 to-cyan-300 px-5 text-sm font-semibold text-zinc-900 transition hover:brightness-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {sendingRecoveryLink ? t.recoveryLinkSending : t.recoveryLinkAction}
                    </button>
                    <button
                      type="button"
                      onClick={openFaceRecoveryModal}
                      disabled={loading}
                      className="inline-flex h-10 items-center justify-center rounded-full border border-emerald-300/65 bg-gradient-to-r from-emerald-400 to-teal-300 px-5 text-sm font-semibold text-zinc-900 transition hover:brightness-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {t.recoverByFaceAction}
                    </button>
                    <button
                      type="button"
                      onClick={openOrderRecoveryModal}
                      disabled={loading}
                      className="inline-flex h-10 items-center justify-center rounded-full border border-amber-300/65 bg-gradient-to-r from-amber-400 to-yellow-300 px-5 text-sm font-semibold text-zinc-900 transition hover:brightness-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {t.recoverByOrderAction}
                    </button>
                  </>
                ) : null}
                <button
                  type="button"
                  onClick={closeErrorModal}
                  className="inline-flex h-10 items-center justify-center rounded-full border border-rose-300/65 bg-gradient-to-r from-rose-400 to-amber-300 px-5 text-sm font-semibold text-zinc-900 transition hover:brightness-105 active:scale-95"
                >
                  {t.errorPopupClose}
                </button>
              </div>
            </div>
            <div className="h-1.5 w-full animate-pulse bg-[linear-gradient(90deg,rgba(251,113,133,0.9),rgba(251,191,36,0.9),rgba(251,113,133,0.9))]" />
          </div>
        </div>
      ) : null}
    </main>
  );
}
