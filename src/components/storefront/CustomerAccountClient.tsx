"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { clearCustomerSessionActivity } from "../../../lib/storefront/customer-session";
import { getSupabaseBrowserClient } from "../../../lib/supabase/client";
import { ForgotPasswordModal } from "./ForgotPasswordModal";

type ProfileDto = {
  id: string;
  full_name: string;
  phone: string;
  address?: string | null;
  avatar_url?: string | null;
  profile_image_url?: string | null;
  image_url?: string | null;
  deletion_status?: string | null;
  deletion_requested_at?: string | null;
  deletion_scheduled_for?: string | null;
  deletion_reason?: string | null;
  recovered_at?: string | null;
  line_id?: string | null;
  is_active?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

type OrderDto = {
  id: string;
  order_no: string;
  status: string;
  payment_status: string;
  grand_total: number;
  created_at?: string | null;
};

type KycProfileDto = {
  kycStatus?: string | null;
};

type PasswordModalIntent = "forgot" | "change";

type AccountLocale = "th" | "en" | "lo";

type FaceDetectorBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

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
      title: "Customer Account",
      subtitle: "Manage your profile and review order activity in one place.",
      quickLinksTitle: "Quick Navigation",
      popupActionTitle: "Open Account Panels",
      openProfilePopup: "Profile Details",
      openOrdersPopup: "Order History",
      openStatsPopup: "Order Summary",
      statsPopupTitle: "Order Summary",
      popupClose: "Close",
      profileTitle: "Profile Details",
      profileSubtitle: "Keep your contact data updated for delivery and support.",
      ordersTitle: "Order History",
      ordersSubtitle: "Latest purchases and payment status",
      navHome: "Home",
      navProducts: "Products",
      navCart: "Cart",
      navPromotions: "Promotions",
      navPricing: "Pricing",
      navContact: "Contact",
      navHomeHint: "Back to landing page",
      navProductsHint: "Browse all products",
      navCartHint: "Open your cart",
      navPromotionsHint: "Check offers and coupons",
      navPricingHint: "View price table",
      navContactHint: "Call or chat with us",
      fullName: "Full Name",
      phone: "Phone",
      address: "Address",
      uploadAvatar: "Upload Photo",
      uploadingAvatar: "Uploading...",
      removeAvatar: "Remove Photo",
      removingAvatar: "Removing...",
      avatarHint: "JPG, PNG, WEBP up to 5MB",
      save: "Save Profile",
      saving: "Saving...",
      logout: "Log out",
      changePasswordAction: "Change Password",
      forgotPasswordAction: "Forgot password",
      loggingOut: "Signing out...",
      logoutConfirmTitle: "Confirm sign out",
      logoutConfirmDescription: "Do you want to sign out of your customer account now?",
      logoutConfirmAction: "Confirm",
      logoutCancelAction: "Cancel",
      deleteAccount: "Delete Account",
      deleteAccountTitle: "Schedule account deletion",
      deleteAccountDescription: "Enter password to confirm. Your account will be deleted in 3 days and can be recovered before deadline.",
      deletePasswordLabel: "Confirm Password",
      deleteReasonLabel: "Reason (optional)",
      deleteReasonPlaceholder: "Tell us why you want to delete this account",
      deleteAccountAction: "Confirm Delete",
      deletingAccount: "Scheduling...",
      deletePendingBlocked: "You still have pending orders. Contact admin for deletion.",
      deleteSuccessLogout: "Deletion requested. Signing out now...",
      deletePendingTitle: "Account deletion is pending",
      deletePendingDescription: "Your account is scheduled for permanent deletion in 3 days. You can recover before deadline.",
      deleteScheduledFor: "Scheduled deletion",
      recoverAccount: "Recover Account",
      recoverPasswordLabel: "Password for recovery",
      recoverFaceScan: "Scan Face",
      faceScanHint: "This only checks face presence from your camera browser-side, not biometric face matching.",
      faceScanning: "Scanning...",
      faceScanReady: "Face scan verified.",
      faceScanFailed: "Face scan failed. Try again with better lighting.",
      faceScanNotSupported: "Camera is not available on this device.",
      faceScanPermissionDenied: "Camera permission denied. Please allow camera access in your browser.",
      faceScanRequired: "Please scan your face before recovering.",
      recoverAction: "Confirm Recover",
      recovering: "Recovering...",
      recoverSuccess: "Account recovered successfully.",
      recoverExpired: "Recovery window has expired. Account may be deleted already.",
      kycRequiredTitle: "Face KYC Required",
      kycRequiredDescription: "Complete face KYC first to enable forgot/reset password, account deletion, and recovery actions.",
      kycRequiredAction: "Complete Face KYC",
      kycRequiredError: "Please complete face KYC before continuing this secure action.",
      loading: "Loading profile...",
      loadingOrders: "Loading orders...",
      createdAt: "Created",
      updatedAt: "Updated",
      emptyOrders: "No orders yet",
      totalOrders: "Total Orders",
      pendingOrders: "Pending",
      paidOrders: "Paid",
      totalAmount: "Total Amount",
      successSaved: "Profile updated successfully.",
      failedLoadProfile: "Failed to load profile",
      failedLoadOrders: "Failed to load orders",
      failedSaveProfile: "Failed to save profile",
      successAvatarUploaded: "Profile photo updated.",
      failedUploadAvatar: "Failed to upload profile photo",
      successAvatarRemoved: "Profile photo removed.",
      failedRemoveAvatar: "Failed to remove profile photo",
      statusPendingReview: "Pending review",
      statusPendingPayment: "Pending payment",
      statusCancelled: "Cancelled",
      statusPaid: "Paid",
      receiptLabel: "Receipt",
      receiptTitle: "Open receipt",
    };
  }

  if (locale === "lo") {
    return {
      title: "ບັນຊີລູກຄ້າ",
      subtitle: "ຈັດການຂໍ້ມູນໂປຣໄຟລ໌ ແລະ ກວດສອບປະຫວັດຄຳສັ່ງຊື້ໄດ້ໃນຫນ້າດຽວ.",
      quickLinksTitle: "ເຂົ້າເຖິງດ່ວນ",
      popupActionTitle: "ເປີດພາແນວຂໍ້ມູນ",
      openProfilePopup: "ຂໍ້ມູນໂປຣໄຟລ໌",
      openOrdersPopup: "ປະຫວັດຄຳສັ່ງຊື້",
      openStatsPopup: "ສະຫຼຸບຕົວເລກ",
      statsPopupTitle: "ສະຫຼຸບຕົວເລກ",
      popupClose: "ປິດ",
      profileTitle: "ຂໍ້ມູນໂປຣໄຟລ໌",
      profileSubtitle: "ອັບເດດຂໍ້ມູນຕິດຕໍ່ໃຫ້ຖືກຕ້ອງເພື່ອຈັດສົ່ງ ແລະ ບໍລິການ.",
      ordersTitle: "ປະຫວັດຄຳສັ່ງຊື້",
      ordersSubtitle: "ລາຍການສັ່ງຊື້ຫຼ້າສຸດ ແລະ ສະຖານະການຊຳລະ",
      navHome: "ໜ້າຫຼັກ",
      navProducts: "ສິນຄ້າ",
      navCart: "ກະຕ່າ",
      navPromotions: "ໂປຣໂມຊັນ",
      navPricing: "ລາຄາ",
      navContact: "ຕິດຕໍ່",
      navHomeHint: "ກັບໄປໜ້າຫຼັກ",
      navProductsHint: "ເລືອກເບິ່ງສິນຄ້າທັງໝົດ",
      navCartHint: "ເປີດກະຕ່າຂອງທ່ານ",
      navPromotionsHint: "ເບິ່ງຂໍ້ສະເໜີ ແລະ ຄູປອງ",
      navPricingHint: "ເບິ່ງຕາຕະລາງລາຄາ",
      navContactHint: "ໂທ ຫຼື ແຊດກັບພວກເຮົາ",
      fullName: "ຊື່-ນາມສະກຸນ",
      phone: "ເບີໂທ",
      address: "ທີ່ຢູ່",
      uploadAvatar: "ອັບໂຫຼດຮູບ",
      uploadingAvatar: "ກຳລັງອັບໂຫຼດ...",
      removeAvatar: "ລົບຮູບ",
      removingAvatar: "ກຳລັງລົບ...",
      avatarHint: "JPG, PNG, WEBP ບໍ່ເກີນ 5MB",
      save: "ບັນທຶກຂໍ້ມູນ",
      saving: "ກຳລັງບັນທຶກ...",
      logout: "ອອກຈາກລະບົບ",
      changePasswordAction: "ປ່ຽນລະຫັດຜ່ານ",
      forgotPasswordAction: "ລືມລະຫັດຜ່ານ",
      loggingOut: "ກຳລັງອອກຈາກລະບົບ...",
      logoutConfirmTitle: "ຢືນຢັນອອກຈາກລະບົບ",
      logoutConfirmDescription: "ທ່ານຕ້ອງການອອກຈາກລະບົບລູກຄ້າຕອນນີ້ບໍ?",
      logoutConfirmAction: "ຢືນຢັນ",
      logoutCancelAction: "ຍົກເລີກ",
      deleteAccount: "ລົບບັນຊີ",
      deleteAccountTitle: "ກຳນົດການລົບບັນຊີ",
      deleteAccountDescription: "ກອກລະຫັດຜ່ານເພື່ອຢືນຢັນ. ລະບົບຈະລົບຖາວອນໃນ 3 ມື້ ແລະ ສາມາດກູ້ຄືນໄດ້ກ່ອນກຳນົດ.",
      deletePasswordLabel: "ຢືນຢັນລະຫັດຜ່ານ",
      deleteReasonLabel: "ເຫດຜົນ (ທາງເລືອກ)",
      deleteReasonPlaceholder: "ແຈ້ງເຫດຜົນການລົບບັນຊີ",
      deleteAccountAction: "ຢືນຢັນລົບ",
      deletingAccount: "ກຳລັງຈັດຄິວ...",
      deletePendingBlocked: "ທ່ານຍັງມີຄຳສັ່ງຊື້ທີ່ຄ້າງ. ກະລຸນາຕິດຕໍ່ແອດມິນ.",
      deleteSuccessLogout: "ຮັບຄຳຂໍລົບແລ້ວ. ກຳລັງອອກຈາກລະບົບ...",
      deletePendingTitle: "ບັນຊີກຳລັງລໍການລົບ",
      deletePendingDescription: "ບັນຊີຂອງທ່ານຈະຖືກລົບຖາວອນໃນ 3 ມື້. ສາມາດກູ້ຄືນໄດ້ກ່ອນເວລານັ້ນ.",
      deleteScheduledFor: "ເວລາລົບຖາວອນ",
      recoverAccount: "ກູ້ບັນຊີ",
      recoverPasswordLabel: "ລະຫັດຜ່ານເພື່ອກູ້",
      recoverFaceScan: "ສະແກນໃບໜ້າ",
      faceScanHint: "ການສະແກນນີ້ເປັນພຽງການກວດພົບໃບໜ້າຜ່ານກ້ອງໃນເບຣາວເຊີ, ບໍ່ແມ່ນການທຽບໄບໂອເມຕຣິກ.",
      faceScanning: "ກຳລັງສະແກນ...",
      faceScanReady: "ຢືນຢັນໃບໜ້າແລ້ວ",
      faceScanFailed: "ສະແກນໃບໜ້າບໍ່ສຳເລັດ ກະລຸນາລອງໃໝ່",
      faceScanNotSupported: "ອຸປະກອນນີ້ບໍ່ຮອງຮັບກ້ອງ",
      faceScanPermissionDenied: "ບໍ່ໄດ້ຮັບອະນຸຍາດໃຊ້ກ້ອງ ກະລຸນາອະນຸຍາດກ້ອງໃນເບຣາວເຊີ",
      faceScanRequired: "ກະລຸນາສະແກນໃບໜ້າກ່ອນກູ້ບັນຊີ",
      recoverAction: "ຢືນຢັນກູ້",
      recovering: "ກຳລັງກູ້...",
      recoverSuccess: "ກູ້ບັນຊີສຳເລັດແລ້ວ",
      recoverExpired: "ໝົດເວລາກູ້ຄືນແລ້ວ",
      kycRequiredTitle: "ຕ້ອງຜ່ານ KYC ໃບໜ້າ",
      kycRequiredDescription: "ກະລຸນາເຮັດ KYC ໃບໜ້າກ່ອນ ເພື່ອໃຊ້ງານລືມລະຫັດ, ປ່ຽນລະຫັດ, ລົບບັນຊີ ແລະ ກູ້ບັນຊີ.",
      kycRequiredAction: "ໄປທຳ Face KYC",
      kycRequiredError: "ກະລຸນາເຮັດ KYC ໃບໜ້າກ່ອນດຳເນີນການທີ່ປອດໄພນີ້.",
      loading: "ກຳລັງໂຫຼດໂປຣໄຟລ໌...",
      loadingOrders: "ກຳລັງໂຫຼດຄຳສັ່ງຊື້...",
      createdAt: "ສ້າງເມື່ອ",
      updatedAt: "ອັບເດດຫຼ້າສຸດ",
      emptyOrders: "ຍັງບໍ່ມີລາຍການສັ່ງຊື້",
      totalOrders: "ຄຳສັ່ງຊື້ທັງໝົດ",
      pendingOrders: "ລໍຖ້າດຳເນີນການ",
      paidOrders: "ຊຳລະແລ້ວ",
      totalAmount: "ມູນຄ່າລວມ",
      successSaved: "ບັນທຶກຂໍ້ມູນສຳເລັດແລ້ວ",
      failedLoadProfile: "ໂຫຼດໂປຣໄຟລ໌ບໍ່ສຳເລັດ",
      failedLoadOrders: "ໂຫຼດຄຳສັ່ງຊື້ບໍ່ສຳເລັດ",
      failedSaveProfile: "ບັນທຶກໂປຣໄຟລ໌ບໍ່ສຳເລັດ",
      successAvatarUploaded: "ອັບເດດຮູບໂປຣໄຟລ໌ແລ້ວ",
      failedUploadAvatar: "ອັບໂຫຼດຮູບໂປຣໄຟລ໌ບໍ່ສຳເລັດ",
      successAvatarRemoved: "ລົບຮູບໂປຣໄຟລ໌ແລ້ວ",
      failedRemoveAvatar: "ລົບຮູບໂປຣໄຟລ໌ບໍ່ສຳເລັດ",
      statusPendingReview: "ລໍກວດສອບ",
      statusPendingPayment: "ລໍຊຳລະເງິນ",
      statusCancelled: "ຍົກເລີກ",
      statusPaid: "ຊຳລະແລ້ວ",
      receiptLabel: "ໃບຮັບເງິນ",
      receiptTitle: "ເປີດໃບຮັບເງິນ",
    };
  }

  return {
    title: "บัญชีลูกค้า",
    subtitle: "จัดการข้อมูลโปรไฟล์และตรวจสอบคำสั่งซื้อได้ในหน้าเดียว",
    quickLinksTitle: "ทางลัดไปยังหน้าต่างๆ",
    popupActionTitle: "เปิดข้อมูลแต่ละส่วนแบบป๊อปอัป",
    openProfilePopup: "ข้อมูลโปรไฟล์",
    openOrdersPopup: "ประวัติคำสั่งซื้อ",
    openStatsPopup: "สรุปตัวเลข",
    statsPopupTitle: "สรุปตัวเลข",
    popupClose: "ปิด",
    profileTitle: "ข้อมูลโปรไฟล์",
    profileSubtitle: "อัปเดตข้อมูลติดต่อให้พร้อมสำหรับการจัดส่งและบริการหลังการขาย",
    ordersTitle: "ประวัติคำสั่งซื้อ",
    ordersSubtitle: "รายการสั่งซื้อและสถานะการชำระล่าสุด",
    navHome: "หน้าแรก",
    navProducts: "สินค้า",
    navCart: "ตะกร้า",
    navPromotions: "โปรโมชัน",
    navPricing: "ตารางราคา",
    navContact: "ติดต่อ",
    navHomeHint: "กลับไปหน้าเว็บไซต์หลัก",
    navProductsHint: "เลือกดูสินค้าทั้งหมด",
    navCartHint: "เปิดตะกร้าสินค้าของคุณ",
    navPromotionsHint: "ดูส่วนลดและคูปองล่าสุด",
    navPricingHint: "เช็กราคาแต่ละรุ่น",
    navContactHint: "โทรหรือแชตกับทีมงาน",
    fullName: "ชื่อ-นามสกุล",
    phone: "เบอร์โทร",
    address: "ที่อยู่",
    uploadAvatar: "อัปโหลดรูป",
    uploadingAvatar: "กำลังอัปโหลด...",
    removeAvatar: "ลบรูป",
    removingAvatar: "กำลังลบ...",
    avatarHint: "รองรับ JPG, PNG, WEBP ไม่เกิน 5MB",
    save: "บันทึกข้อมูล",
    saving: "กำลังบันทึก...",
    logout: "ออกจากระบบ",
    changePasswordAction: "เปลี่ยนรหัสผ่าน",
    forgotPasswordAction: "ลืมรหัสผ่าน",
    loggingOut: "กำลังออกจากระบบ...",
    logoutConfirmTitle: "ยืนยันออกจากระบบ",
    logoutConfirmDescription: "ต้องการออกจากระบบลูกค้าตอนนี้หรือไม่?",
    logoutConfirmAction: "ยืนยัน",
    logoutCancelAction: "ยกเลิก",
    deleteAccount: "ลบบัญชี",
    deleteAccountTitle: "ยืนยันคำขอลบบัญชี",
    deleteAccountDescription: "กรอกรหัสผ่านเพื่อยืนยัน ระบบจะลบบัญชีถาวรใน 3 วัน และกู้คืนได้ก่อนครบกำหนด",
    deletePasswordLabel: "รหัสผ่านยืนยัน",
    deleteReasonLabel: "เหตุผล (ไม่บังคับ)",
    deleteReasonPlaceholder: "แจ้งเหตุผลการลบบัญชี",
    deleteAccountAction: "ยืนยันลบบัญชี",
    deletingAccount: "กำลังตั้งคิวลบ...",
    deletePendingBlocked: "คุณมีออเดอร์ค้างอยู่ ต้องให้แอดมินลบให้เท่านั้น",
    deleteSuccessLogout: "รับคำขอลบบัญชีแล้ว กำลังออกจากระบบ...",
    deletePendingTitle: "บัญชีอยู่ระหว่างดำเนินการลบ",
    deletePendingDescription: "ระบบกำลังรอลบบัญชีถาวรภายใน 3 วัน คุณสามารถกู้คืนได้ก่อนครบกำหนด",
    deleteScheduledFor: "กำหนดลบถาวร",
    recoverAccount: "กู้คืนบัญชี",
    recoverPasswordLabel: "รหัสผ่านเพื่อกู้คืน",
    recoverFaceScan: "สแกนใบหน้า",
    faceScanHint: "การสแกนนี้ตรวจเพียงว่ามีใบหน้าหน้ากล้องในเบราว์เซอร์ ยังไม่ใช่การเทียบใบหน้าแบบไบโอเมตริกซ์",
    faceScanning: "กำลังสแกน...",
    faceScanReady: "ยืนยันใบหน้าแล้ว",
    faceScanFailed: "สแกนใบหน้าไม่สำเร็จ กรุณาลองใหม่ในที่แสงพอ",
    faceScanNotSupported: "อุปกรณ์นี้ไม่รองรับการเปิดกล้อง",
    faceScanPermissionDenied: "ไม่ได้รับสิทธิ์ใช้งานกล้อง กรุณาอนุญาตกล้องในเบราว์เซอร์",
    faceScanRequired: "กรุณาสแกนใบหน้าก่อนกู้คืนบัญชี",
    recoverAction: "ยืนยันกู้คืน",
    recovering: "กำลังกู้คืน...",
    recoverSuccess: "กู้คืนบัญชีสำเร็จแล้ว",
    recoverExpired: "หมดเวลาการกู้คืนแล้ว บัญชีอาจถูกลบถาวรไปแล้ว",
    kycRequiredTitle: "ต้องผ่าน KYC ใบหน้าก่อนใช้งาน",
    kycRequiredDescription: "กรุณาทำ KYC ใบหน้าก่อน เพื่อเปิดใช้งานลืม/เปลี่ยนรหัสผ่าน, ลบบัญชี และกู้คืนบัญชีแบบยืนยัน 2 ชั้น",
    kycRequiredAction: "ไปทำ Face KYC",
    kycRequiredError: "กรุณาทำ KYC ใบหน้าก่อนดำเนินการด้านความปลอดภัยนี้",
    loading: "กำลังโหลดข้อมูลโปรไฟล์...",
    loadingOrders: "กำลังโหลดรายการสั่งซื้อ...",
    createdAt: "สร้างเมื่อ",
    updatedAt: "อัปเดตล่าสุด",
    emptyOrders: "ยังไม่มีรายการสั่งซื้อ",
    totalOrders: "ออเดอร์ทั้งหมด",
    pendingOrders: "รอดำเนินการ",
    paidOrders: "ชำระแล้ว",
    totalAmount: "ยอดรวมทั้งหมด",
    successSaved: "บันทึกข้อมูลเรียบร้อย",
    failedLoadProfile: "โหลดโปรไฟล์ไม่สำเร็จ",
    failedLoadOrders: "โหลดรายการสั่งซื้อไม่สำเร็จ",
    failedSaveProfile: "บันทึกข้อมูลไม่สำเร็จ",
    successAvatarUploaded: "อัปเดตรูปโปรไฟล์เรียบร้อย",
    failedUploadAvatar: "อัปโหลดรูปโปรไฟล์ไม่สำเร็จ",
    successAvatarRemoved: "ลบรูปโปรไฟล์เรียบร้อย",
    failedRemoveAvatar: "ลบรูปโปรไฟล์ไม่สำเร็จ",
    statusPendingReview: "รอตรวจสอบ",
    statusPendingPayment: "รอชำระเงิน",
    statusCancelled: "ยกเลิกแล้ว",
    statusPaid: "ชำระแล้ว",
    receiptLabel: "ใบเสร็จ",
    receiptTitle: "พิมพ์ใบเสร็จ",
  };
}

function statusLabel(locale: AccountLocale, status: string, paymentStatus: string) {
  const t = copy(locale);
  if (status === "pending_review" || paymentStatus === "pending_verify") return t.statusPendingReview;
  if (status === "pending_payment") return t.statusPendingPayment;
  if (status === "cancelled") return t.statusCancelled;
  if (status === "completed" || paymentStatus === "paid") return t.statusPaid;
  return status || paymentStatus || "-";
}

function canOpenReceipt(status: string, paymentStatus: string) {
  const normalizedStatus = status.trim().toLowerCase();
  const normalizedPaymentStatus = paymentStatus.trim().toLowerCase();
  return (
    normalizedPaymentStatus === "paid"
    || normalizedStatus === "paid"
    || normalizedStatus === "processing"
    || normalizedStatus === "shipped"
    || normalizedStatus === "completed"
  );
}

function statusBadgeClass(status: string, paymentStatus: string) {
  if (status === "pending_review" || paymentStatus === "pending_verify") {
    return "border-emerald-400/40 bg-emerald-500/15 text-emerald-200";
  }
  if (status === "pending_payment") {
    return "border-amber-400/40 bg-amber-500/15 text-amber-200";
  }
  if (status === "cancelled") {
    return "border-rose-400/40 bg-rose-500/15 text-rose-200";
  }
  if (status === "completed" || paymentStatus === "paid") {
    return "border-sky-400/40 bg-sky-500/15 text-sky-200";
  }
  return "border-slate-400/40 bg-slate-500/15 text-slate-200";
}

function localeToIntl(locale: AccountLocale) {
  if (locale === "en") return "en-US";
  if (locale === "lo") return "lo-LA";
  return "th-TH";
}

function formatDateTime(value: string | null | undefined, locale: AccountLocale) {
  if (!value) return "-";
  return new Date(value).toLocaleString(localeToIntl(locale));
}

function formatTHB(value: number, locale: AccountLocale) {
  return new Intl.NumberFormat(localeToIntl(locale), { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(
    Number(value ?? 0),
  );
}

function firstText(...values: Array<string | null | undefined>) {
  for (const value of values) {
    const normalized = typeof value === "string" ? value.trim() : "";
    if (normalized) {
      return normalized;
    }
  }
  return "";
}

function nameInitials(fullName: string) {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return "U";
  }
  const first = words[0]?.[0] ?? "";
  const second = words[1]?.[0] ?? "";
  return `${first}${second}`.toUpperCase();
}

export function CustomerAccountClient() {
  const router = useRouter();
  const pathname = usePathname() ?? "/account";
  const locale = useMemo(() => localeFromPath(pathname), [pathname]);
  const t = useMemo(() => copy(locale), [locale]);
  const loginPath = withLocale(locale, "/auth/login");
  const homePath = withLocale(locale, "/");
  const kycStartPath = withLocale(locale, "/kyc/start");
  const quickLinks = useMemo(
    () => [
      {
        href: withLocale(locale, "/"),
        label: t.navHome,
        hint: t.navHomeHint,
        className: "border-amber-300/35 bg-gradient-to-br from-amber-500/18 via-amber-400/8 to-transparent text-amber-100",
      },
      {
        href: withLocale(locale, "/products"),
        label: t.navProducts,
        hint: t.navProductsHint,
        className: "border-sky-300/35 bg-gradient-to-br from-sky-500/18 via-sky-400/8 to-transparent text-sky-100",
      },
      {
        href: withLocale(locale, "/cart"),
        label: t.navCart,
        hint: t.navCartHint,
        className: "border-emerald-300/35 bg-gradient-to-br from-emerald-500/18 via-emerald-400/8 to-transparent text-emerald-100",
      },
      {
        href: withLocale(locale, "/pricing"),
        label: t.navPricing,
        hint: t.navPricingHint,
        className: "border-indigo-300/35 bg-gradient-to-br from-indigo-500/18 via-indigo-400/8 to-transparent text-indigo-100",
      },
      {
        href: withLocale(locale, "/contact"),
        label: t.navContact,
        hint: t.navContactHint,
        className: "border-cyan-300/35 bg-gradient-to-br from-cyan-500/18 via-cyan-400/8 to-transparent text-cyan-100",
      },
    ],
    [
      locale,
      t.navCart,
      t.navCartHint,
      t.navContact,
      t.navContactHint,
      t.navHome,
      t.navHomeHint,
      t.navPricing,
      t.navPricingHint,
      t.navProducts,
      t.navProductsHint,
    ],
  );

  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [recoverPassword, setRecoverPassword] = useState("");
  const [recoveringAccount, setRecoveringAccount] = useState(false);
  const [faceScanning, setFaceScanning] = useState(false);
  const [faceScanPassed, setFaceScanPassed] = useState(false);
  const [faceScanMethod, setFaceScanMethod] = useState("");
  const [faceScanUiOpen, setFaceScanUiOpen] = useState(false);
  const [faceScanProgress, setFaceScanProgress] = useState(0);
  const [faceScanDetail, setFaceScanDetail] = useState("");
  const [activePopup, setActivePopup] = useState<"profile" | "orders" | "stats" | null>(null);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [removingAvatar, setRemovingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileDto | null>(null);
  const [orders, setOrders] = useState<OrderDto[]>([]);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [avatarUrlOverride, setAvatarUrlOverride] = useState("");
  const [passwordModalIntent, setPasswordModalIntent] = useState<PasswordModalIntent | null>(null);
  const [customerEmail, setCustomerEmail] = useState("");
  const [kycStatus, setKycStatus] = useState("not_started");
  const faceScanPreviewRef = useRef<HTMLVideoElement | null>(null);
  const faceScanStreamRef = useRef<MediaStream | null>(null);

  const paidOrders = useMemo(
    () => orders.filter((item) => item.status === "completed" || item.payment_status === "paid").length,
    [orders],
  );
  const pendingOrders = useMemo(
    () =>
      orders.filter(
        (item) => item.status === "pending_payment" || item.status === "pending_review" || item.payment_status === "pending_verify",
      ).length,
    [orders],
  );
  const totalAmount = useMemo(() => orders.reduce((sum, item) => sum + Number(item.grand_total ?? 0), 0), [orders]);
  const profileName = firstText(fullName, profile?.full_name);
  const profilePhone = firstText(phone, profile?.phone);
  const profileAddress = firstText(address, profile?.address);
  const hasProfileDraftChanges = useMemo(() => {
    const currentName = String(fullName ?? "").trim();
    const currentPhone = String(phone ?? "").trim();
    const currentAddress = String(address ?? "").trim();
    const savedName = String(profile?.full_name ?? "").trim();
    const savedPhone = String(profile?.phone ?? "").trim();
    const savedAddress = String(profile?.address ?? "").trim();
    return currentName !== savedName || currentPhone !== savedPhone || currentAddress !== savedAddress;
  }, [address, fullName, phone, profile?.address, profile?.full_name, profile?.phone]);
  const profileAddressPreview = useMemo(() => {
    const normalized = String(profileAddress ?? "").replace(/\s+/g, " ").trim();
    if (!normalized) return "-";
    return normalized.length > 30 ? `${normalized.slice(0, 30)}...` : normalized;
  }, [profileAddress]);
  const profileTagline = useMemo(() => {
    const left = String(profilePhone ?? "").trim() || "-";
    const right = profileAddressPreview || "-";
    return `${left} • ${right}`;
  }, [profilePhone, profileAddressPreview]);
  const profileAvatarUrl = firstText(avatarUrlOverride, profile?.avatar_url, profile?.profile_image_url, profile?.image_url);
  const profileInitials = useMemo(() => nameInitials(profileName), [profileName]);
  const deletionPending = String(profile?.deletion_status ?? "").trim().toLowerCase() === "pending_delete";
  const isKycApproved = kycStatus === "approved";
  const deletionScheduledFor = profile?.deletion_scheduled_for ? formatDateTime(profile.deletion_scheduled_for, locale) : "-";
  const activePopupTitle = activePopup === "profile" ? t.profileTitle : activePopup === "orders" ? t.ordersTitle : t.statsPopupTitle;
  const notificationText = error ?? message;
  const notificationType = error ? "error" : message ? "success" : null;
  const schemaFixMessage =
    locale === "en"
      ? "Account deletion setup is incomplete. Please run sql/ensure-customer-account-deletion.sql and try again."
      : locale === "lo"
        ? "ການຕັ້ງຄ່າລົບບັນຊີຍັງບໍ່ຄົບ. ກະລຸນາຮັນ sql/ensure-customer-account-deletion.sql ແລ້ວລອງໃໝ່."
        : "การตั้งค่าระบบลบบัญชียังไม่ครบ กรุณารัน sql/ensure-customer-account-deletion.sql แล้วลองใหม่";
  const networkUnstableMessage =
    locale === "en"
      ? "Network is unstable. Please try again in a moment."
      : locale === "lo"
        ? "ເຄືອຂ່າຍບໍ່ສະຖຽນ. ກະລຸນາລອງໃໝ່ອີກຄັ້ງ."
        : "เครือข่ายไม่เสถียร กรุณาลองใหม่อีกครั้ง";
  const kycSchemaFixMessage =
    locale === "en"
      ? "KYC schema is incomplete. Please run sql/ensure-customer-kyc.sql and try again."
      : locale === "lo"
        ? "ໂຄງສ້າງ KYC ຍັງບໍ່ຄົບ. ກະລຸນາຮັນ sql/ensure-customer-kyc.sql ແລ້ວລອງໃໝ່."
        : "โครงสร้าง KYC ยังไม่ครบ กรุณารัน sql/ensure-customer-kyc.sql แล้วลองใหม่";
  const faceDetectorRequiredMessage =
    locale === "en"
      ? "This browser cannot run human-face validation. Please use Chrome or Edge."
      : locale === "lo"
        ? "ເບຣາວເຊີນີ້ບໍ່ຮອງຮັບການກວດໃບໜ້າ. ກະລຸນາໃຊ້ Chrome ຫຼື Edge."
        : "เบราว์เซอร์นี้ไม่รองรับการตรวจใบหน้ามนุษย์ กรุณาใช้ Chrome หรือ Edge";

  useEffect(() => {
    if (!activePopup) {
      return;
    }
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActivePopup(null);
      }
    };
    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("keydown", onEscape);
    };
  }, [activePopup]);

  useEffect(() => {
    if (!notificationText) {
      return;
    }

    const timeoutMs = notificationType === "error" ? 6000 : 3500;
    const timerId = window.setTimeout(() => {
      setError(null);
      setMessage(null);
    }, timeoutMs);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [notificationText, notificationType]);

  useEffect(() => {
    let mounted = true;
    async function loadCustomerEmail() {
      try {
        const { data } = await getSupabaseBrowserClient().auth.getUser();
        if (!mounted) {
          return;
        }
        setCustomerEmail(String(data.user?.email ?? ""));
      } catch {
        if (mounted) {
          setCustomerEmail("");
        }
      }
    }
    void loadCustomerEmail();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadKycStatus() {
      try {
        const response = await fetch("/api/customer/kyc/session", { cache: "no-store" });
        if (response.status === 401) {
          window.location.href = loginPath;
          return;
        }

        const payload = (await response.json().catch(() => null)) as
          | { ok?: boolean; data?: KycProfileDto; code?: string; error?: string }
          | null;
        if (!mounted) {
          return;
        }
        if (!response.ok || !payload?.ok) {
          setKycStatus("not_started");
          return;
        }

        const normalizedStatus = String(payload.data?.kycStatus ?? "").trim().toLowerCase();
        setKycStatus(normalizedStatus || "not_started");
      } catch {
        if (mounted) {
          setKycStatus("not_started");
        }
      }
    }

    void loadKycStatus();
    return () => {
      mounted = false;
    };
  }, [loginPath]);

  const stopFaceScanStream = useCallback(() => {
    const stream = faceScanStreamRef.current;
    if (stream) {
      for (const track of stream.getTracks()) {
        track.stop();
      }
    }
    faceScanStreamRef.current = null;
    const preview = faceScanPreviewRef.current;
    if (preview) {
      preview.srcObject = null;
    }
  }, []);

  useEffect(() => () => {
    stopFaceScanStream();
  }, [stopFaceScanStream]);

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      try {
        const response = await fetch("/api/customer/profile", { cache: "no-store" });
        if (response.status === 401) {
          window.location.href = loginPath;
          return;
        }

        const payload = (await response.json()) as { ok?: boolean; error?: string; data?: ProfileDto | null };
        if (!response.ok || !payload.ok) {
          if ((payload as { code?: string } | null)?.code === "NETWORK_UNSTABLE") {
            throw new Error(networkUnstableMessage);
          }
          throw new Error(payload.error ?? t.failedLoadProfile);
        }

        if (!mounted) return;
        setProfile(payload.data ?? null);
        setFullName(payload.data?.full_name ?? "");
        setPhone(payload.data?.phone ?? "");
        setAddress(payload.data?.address ?? "");
        setAvatarUrlOverride(firstText(payload.data?.avatar_url, payload.data?.profile_image_url, payload.data?.image_url));
      } catch (caught) {
        if (!mounted) return;
        setError(caught instanceof Error ? caught.message : t.failedLoadProfile);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadProfile();
    return () => {
      mounted = false;
    };
  }, [loginPath, networkUnstableMessage, t.failedLoadProfile]);

  useEffect(() => {
    let mounted = true;

    async function loadOrders() {
      try {
        const response = await fetch("/api/customer/orders", { cache: "no-store" });
        if (response.status === 401) {
          window.location.href = loginPath;
          return;
        }
        const payload = (await response.json()) as { ok?: boolean; error?: string; data?: OrderDto[] };
        if (!response.ok || !payload.ok) {
          if ((payload as { code?: string } | null)?.code === "NETWORK_UNSTABLE") {
            throw new Error(networkUnstableMessage);
          }
          throw new Error(payload.error ?? t.failedLoadOrders);
        }
        if (!mounted) return;
        setOrders(payload.data ?? []);
      } catch (caught) {
        if (!mounted) return;
        setError(caught instanceof Error ? caught.message : t.failedLoadOrders);
      } finally {
        if (mounted) setOrdersLoading(false);
      }
    }

    void loadOrders();
    return () => {
      mounted = false;
    };
  }, [loginPath, networkUnstableMessage, t.failedLoadOrders]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let disposed = false;
    let inFlight = false;

    const refreshSilently = async () => {
      if (
        disposed
        || inFlight
        || saving
        || uploadingAvatar
        || removingAvatar
        || deletingAccount
        || recoveringAccount
        || faceScanning
      ) {
        return;
      }

      inFlight = true;
      try {
        const [profileResponse, ordersResponse, kycResponse] = await Promise.all([
          fetch("/api/customer/profile", { cache: "no-store" }),
          fetch("/api/customer/orders", { cache: "no-store" }),
          fetch("/api/customer/kyc/session", { cache: "no-store" }),
        ]);

        if (disposed) {
          return;
        }

        if (profileResponse.status === 401 || ordersResponse.status === 401 || kycResponse.status === 401) {
          window.location.href = loginPath;
          return;
        }

        const [profilePayload, ordersPayload, kycPayload] = await Promise.all([
          profileResponse.json().catch(() => null),
          ordersResponse.json().catch(() => null),
          kycResponse.json().catch(() => null),
        ]) as [
          { ok?: boolean; data?: ProfileDto | null } | null,
          { ok?: boolean; data?: OrderDto[] } | null,
          { ok?: boolean; data?: KycProfileDto } | null,
        ];

        if (profileResponse.ok && profilePayload?.ok) {
          const nextProfile = profilePayload.data ?? null;
          setProfile(nextProfile);
          setAvatarUrlOverride(firstText(nextProfile?.avatar_url, nextProfile?.profile_image_url, nextProfile?.image_url));
          if (!hasProfileDraftChanges) {
            setFullName(nextProfile?.full_name ?? "");
            setPhone(nextProfile?.phone ?? "");
            setAddress(nextProfile?.address ?? "");
          }
        }

        if (ordersResponse.ok && ordersPayload?.ok && Array.isArray(ordersPayload.data)) {
          setOrders(ordersPayload.data);
        }

        if (kycResponse.ok && kycPayload?.ok) {
          const normalizedStatus = String(kycPayload.data?.kycStatus ?? "").trim().toLowerCase();
          setKycStatus(normalizedStatus || "not_started");
        }
      } catch {
        // Auto-refresh should be quiet to avoid noisy UX on transient network errors.
      } finally {
        inFlight = false;
      }
    };

    const intervalId = window.setInterval(() => {
      void refreshSilently();
    }, 10000);
    const onFocus = () => {
      void refreshSilently();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void refreshSilently();
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      disposed = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [
    deletingAccount,
    faceScanning,
    hasProfileDraftChanges,
    loginPath,
    recoveringAccount,
    removingAvatar,
    saving,
    uploadingAvatar,
  ]);

  async function onAvatarFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file || uploadingAvatar || removingAvatar) {
      return;
    }

    setUploadingAvatar(true);
    setError(null);
    setMessage(null);

    try {
      const form = new FormData();
      form.append("file", file);

      const response = await fetch("/api/customer/profile/avatar", {
        method: "POST",
        body: form,
      });

      if (response.status === 401) {
        window.location.href = loginPath;
        return;
      }

      const payload = (await response.json()) as { ok?: boolean; error?: string; data?: { avatar_url?: string } };
      if (!response.ok || !payload.ok || !payload.data?.avatar_url) {
        throw new Error(payload.error ?? t.failedUploadAvatar);
      }

      const avatarUrl = String(payload.data.avatar_url);
      setAvatarUrlOverride(avatarUrl);
      setProfile((prev) => (prev ? { ...prev, avatar_url: avatarUrl } : prev));
      setMessage(t.successAvatarUploaded);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t.failedUploadAvatar);
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function onDeleteAvatar() {
    if (!profileAvatarUrl || uploadingAvatar || removingAvatar) {
      return;
    }

    setRemovingAvatar(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/customer/profile/avatar", { method: "DELETE" });
      if (response.status === 401) {
        window.location.href = loginPath;
        return;
      }

      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? t.failedRemoveAvatar);
      }

      setAvatarUrlOverride("");
      setProfile((prev) => (prev ? { ...prev, avatar_url: "", profile_image_url: "", image_url: "" } : prev));
      setMessage(t.successAvatarRemoved);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t.failedRemoveAvatar);
    } finally {
      setRemovingAvatar(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/customer/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, phone, address }),
      });

      const payload = (await response.json()) as { ok?: boolean; error?: string; data?: ProfileDto };
      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error ?? t.failedSaveProfile);
      }

      setProfile(payload.data);
      setMessage(t.successSaved);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t.failedSaveProfile);
    } finally {
      setSaving(false);
    }
  }

  async function onLogout() {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);
    setError(null);
    setMessage(null);

    try {
      await getSupabaseBrowserClient().auth.signOut();
    } catch {
      // Continue cleanup and redirect even if remote signout fails.
    } finally {
      clearCustomerSessionActivity();
      router.replace(loginPath);
      router.refresh();
      setLoggingOut(false);
    }
  }

  function requireFaceKycForSecureAction() {
    if (isKycApproved) {
      return true;
    }
    setMessage(null);
    setError(t.kycRequiredError);
    return false;
  }

  function openForgotPasswordModal() {
    if (!requireFaceKycForSecureAction()) {
      return;
    }
    setPasswordModalIntent("forgot");
  }

  function openChangePasswordModal() {
    if (!requireFaceKycForSecureAction()) {
      return;
    }
    setPasswordModalIntent("change");
  }

  function openDeleteConfirmModal() {
    if (!requireFaceKycForSecureAction()) {
      return;
    }
    setDeleteConfirmOpen(true);
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
      return t.faceScanPermissionDenied;
    }

    if (name === "notfounderror" || name === "notreadableerror") {
      return t.faceScanNotSupported;
    }

    if (lower.includes("could not start video") || lower.includes("could not access video stream")) {
      return t.faceScanNotSupported;
    }

    return message || t.faceScanFailed;
  }

  async function performFaceScan() {
    if (faceScanning) {
      return;
    }
    if (!requireFaceKycForSecureAction()) {
      return;
    }

    setFaceScanning(true);
    setError(null);
    setMessage(null);
    setFaceScanPassed(false);
    setFaceScanMethod("");
    setFaceScanUiOpen(true);
    setFaceScanProgress(0);
    setFaceScanDetail(t.faceScanning);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(t.faceScanNotSupported);
      }

      const windowWithFaceDetector = window as Window & {
        FaceDetector?: new (options?: { fastMode?: boolean; maxDetectedFaces?: number }) => {
          detect: (input: HTMLCanvasElement) => Promise<Array<unknown>>;
        };
      };
      if (!windowWithFaceDetector.FaceDetector) {
        throw new Error(faceDetectorRequiredMessage);
      }

      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      faceScanStreamRef.current = stream;

      const preview = faceScanPreviewRef.current ?? document.createElement("video");
      preview.srcObject = stream;
      preview.muted = true;
      preview.playsInline = true;
      await preview.play();
      await new Promise((resolve) => setTimeout(resolve, 500));

      const width = preview.videoWidth || 640;
      const height = preview.videoHeight || 480;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error(t.faceScanFailed);
      }

      const detector = new windowWithFaceDetector.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
      const frameCount = 10;
      let validFrames = 0;
      let movingFrames = 0;
      let areaRatioTotal = 0;
      let previousCenter: { x: number; y: number } | null = null;

      for (let index = 0; index < frameCount; index += 1) {
        context.drawImage(preview, 0, 0, width, height);
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

        setFaceScanProgress(Math.round(((index + 1) / frameCount) * 100));
        setFaceScanDetail(t.faceScanning);
        if (index < frameCount - 1) {
          await new Promise((resolve) => setTimeout(resolve, 140));
        }
      }

      const averageAreaRatio = validFrames > 0 ? areaRatioTotal / validFrames : 0;
      if (validFrames < 6 || movingFrames < 2 || averageAreaRatio < 0.08 || averageAreaRatio > 0.5) {
        throw new Error(t.faceScanFailed);
      }

      setFaceScanPassed(true);
      setFaceScanMethod("camera+facedetector-live");
      setMessage(t.faceScanReady);
    } catch (caught) {
      setFaceScanPassed(false);
      setFaceScanMethod("");
      setError(mapFaceScanError(caught));
    } finally {
      stopFaceScanStream();
      setFaceScanUiOpen(false);
      setFaceScanProgress(0);
      setFaceScanDetail("");
      setFaceScanning(false);
    }
  }

  async function onRequestDeleteAccount() {
    if (deletingAccount) {
      return;
    }
    if (!requireFaceKycForSecureAction()) {
      return;
    }
    if (!deletePassword.trim()) {
      setError(t.deletePasswordLabel);
      return;
    }

    setDeletingAccount(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/customer/account-delete/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: deletePassword,
          reason: deleteReason,
        }),
      });

      const payload = (await response.json().catch(() => null)) as { ok?: boolean; code?: string; error?: string } | null;
      if (!response.ok || !payload?.ok) {
        if (payload?.code === "NETWORK_UNSTABLE") {
          throw new Error(networkUnstableMessage);
        }
        if (payload?.code === "PENDING_ORDERS_BLOCK_DELETE") {
          throw new Error(t.deletePendingBlocked);
        }
        if (payload?.code === "DELETION_SCHEMA_MISSING" || payload?.code === "DELETION_LOG_TABLE_MISSING") {
          throw new Error(schemaFixMessage);
        }
        if (payload?.code === "KYC_SCHEMA_MISSING") {
          throw new Error(kycSchemaFixMessage);
        }
        if (payload?.code === "KYC_FACE_REQUIRED") {
          throw new Error(t.kycRequiredError);
        }
        throw new Error(payload?.error ?? "Failed to request account deletion");
      }

      setMessage(t.deleteSuccessLogout);
      setDeleteConfirmOpen(false);
      setDeletePassword("");
      setDeleteReason("");

      await getSupabaseBrowserClient().auth.signOut();
      clearCustomerSessionActivity();
      router.replace(homePath);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to request account deletion");
    } finally {
      setDeletingAccount(false);
    }
  }

  async function onRecoverAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (recoveringAccount) {
      return;
    }
    if (!requireFaceKycForSecureAction()) {
      return;
    }
    if (!faceScanPassed) {
      setError(t.faceScanRequired);
      return;
    }

    setRecoveringAccount(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/customer/account-delete/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: recoverPassword,
          faceScanPassed: true,
          faceScanMethod,
        }),
      });

      const payload = (await response.json().catch(() => null)) as { ok?: boolean; code?: string; error?: string } | null;
      if (!response.ok || !payload?.ok) {
        if (payload?.code === "NETWORK_UNSTABLE") {
          throw new Error(networkUnstableMessage);
        }
        if (payload?.code === "DELETION_RECOVERY_EXPIRED") {
          throw new Error(t.recoverExpired);
        }
        if (payload?.code === "DELETION_SCHEMA_MISSING" || payload?.code === "DELETION_LOG_TABLE_MISSING") {
          throw new Error(schemaFixMessage);
        }
        if (payload?.code === "KYC_SCHEMA_MISSING") {
          throw new Error(kycSchemaFixMessage);
        }
        if (payload?.code === "KYC_FACE_REQUIRED") {
          throw new Error(t.kycRequiredError);
        }
        throw new Error(payload?.error ?? "Failed to recover account");
      }

      setProfile((prev) => (
        prev
          ? {
            ...prev,
            deletion_status: "active",
            deletion_requested_at: null,
            deletion_scheduled_for: null,
            deletion_reason: null,
          }
          : prev
      ));
      setRecoverPassword("");
      setFaceScanPassed(false);
      setFaceScanMethod("");
      setMessage(t.recoverSuccess);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to recover account");
    } finally {
      setRecoveringAccount(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#06090f] text-amber-50">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_500px_at_20%_-10%,rgba(245,158,11,0.22),transparent_60%),radial-gradient(850px_520px_at_100%_0%,rgba(234,179,8,0.18),transparent_58%),radial-gradient(1000px_650px_at_50%_120%,rgba(56,189,248,0.1),transparent_62%)]" />
      <div className="pointer-events-none absolute -left-20 top-40 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-24 h-72 w-72 rounded-full bg-sky-400/10 blur-3xl" />

      <section className="relative mx-auto w-full max-w-6xl px-4 py-8 md:px-6 md:py-12">
        <header className="rounded-3xl border border-amber-300/30 bg-[linear-gradient(130deg,rgba(11,13,18,0.86),rgba(17,10,2,0.88))] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.4)] backdrop-blur-xl md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-amber-300/80">Kittisap Account</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-amber-200 md:text-4xl">{t.title}</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-200/80 md:text-base">{t.subtitle}</p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={openChangePasswordModal}
                disabled={!isKycApproved}
                className="inline-flex h-11 items-center justify-center rounded-full border border-emerald-300/70 bg-emerald-500/15 px-5 text-sm font-semibold text-emerald-100 shadow-[0_10px_30px_rgba(16,185,129,0.2)] transition hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {t.changePasswordAction}
              </button>
              <button
                type="button"
                onClick={openForgotPasswordModal}
                disabled={!isKycApproved}
                className="inline-flex h-11 items-center justify-center rounded-full border border-cyan-300/70 bg-cyan-500/15 px-5 text-sm font-semibold text-cyan-100 shadow-[0_10px_30px_rgba(34,211,238,0.2)] transition hover:bg-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {t.forgotPasswordAction}
              </button>
              {!deletionPending ? (
                <button
                  type="button"
                  onClick={openDeleteConfirmModal}
                  disabled={deletingAccount || !isKycApproved}
                  className="inline-flex h-11 items-center justify-center rounded-full border border-rose-300/70 bg-rose-500/15 px-5 text-sm font-semibold text-rose-100 shadow-[0_10px_30px_rgba(244,63,94,0.2)] transition hover:bg-rose-500/30 disabled:cursor-not-allowed disabled:opacity-65"
                >
                  {deletingAccount ? t.deletingAccount : t.deleteAccount}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setLogoutConfirmOpen(true)}
                disabled={loggingOut}
                className="inline-flex h-11 items-center justify-center rounded-full border border-rose-300/70 bg-gradient-to-r from-rose-500/90 to-orange-500/90 px-5 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(244,63,94,0.28)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-65"
              >
                {loggingOut ? t.loggingOut : t.logout}
              </button>
            </div>
          </div>

          {!isKycApproved ? (
            <div className="mt-5 rounded-2xl border border-amber-300/45 bg-amber-500/10 p-4">
              <h2 className="text-base font-semibold text-amber-100">{t.kycRequiredTitle}</h2>
              <p className="mt-1 text-sm leading-6 text-amber-100/90">{t.kycRequiredDescription}</p>
              <Link
                href={kycStartPath}
                className="mt-3 inline-flex h-10 items-center justify-center rounded-full border border-amber-300/65 bg-amber-400/20 px-4 text-sm font-semibold text-amber-50 transition hover:bg-amber-400/30"
              >
                {t.kycRequiredAction}
              </Link>
            </div>
          ) : null}

          {deletionPending ? (
            <div className="mt-5 rounded-2xl border border-rose-300/35 bg-rose-500/10 p-4 md:p-5">
              <h2 className="text-xl font-semibold text-rose-100">{t.deletePendingTitle}</h2>
              <p className="mt-2 text-sm leading-6 text-rose-100/85">{t.deletePendingDescription}</p>
              <p className="mt-3 text-sm font-semibold text-amber-100">
                {t.deleteScheduledFor}: {deletionScheduledFor}
              </p>

              <form onSubmit={onRecoverAccount} className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-100">{t.recoverPasswordLabel}</span>
                  <input
                    type="password"
                    value={recoverPassword}
                    onChange={(event) => setRecoverPassword(event.target.value)}
                    className="h-11 w-full rounded-xl border border-rose-300/35 bg-black/35 px-3 text-sm text-slate-50 outline-none transition focus:border-rose-200 focus:ring-2 focus:ring-rose-200/20"
                  />
                </label>

                <div className="flex flex-col justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => void performFaceScan()}
                    disabled={faceScanning || !isKycApproved}
                    className="inline-flex h-11 items-center justify-center rounded-full border border-cyan-300/45 bg-cyan-500/15 px-4 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-65"
                  >
                    {faceScanning ? t.faceScanning : t.recoverFaceScan}
                  </button>
                  <button
                    type="submit"
                    disabled={recoveringAccount || !recoverPassword.trim() || !isKycApproved}
                    className="inline-flex h-11 items-center justify-center rounded-full border border-emerald-300/45 bg-emerald-500/20 px-4 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-65"
                  >
                    {recoveringAccount ? t.recovering : t.recoverAction}
                  </button>
                  <p className="text-xs leading-5 text-slate-300/80">
                    {isKycApproved ? t.faceScanHint : t.kycRequiredError}
                  </p>
                </div>

                {faceScanUiOpen ? (
                  <div className="sm:col-span-2 rounded-2xl border border-cyan-300/35 bg-black/25 p-3">
                    <div className="overflow-hidden rounded-xl border border-cyan-300/25 bg-black/45">
                      <video
                        ref={faceScanPreviewRef}
                        autoPlay
                        muted
                        playsInline
                        className="aspect-video w-full object-cover"
                      />
                    </div>
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-medium text-cyan-100/90">{faceScanDetail || t.faceScanning}</p>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-cyan-950/65">
                        <div
                          className="h-full rounded-full bg-cyan-300 transition-[width] duration-150"
                          style={{ width: `${Math.max(0, Math.min(100, faceScanProgress))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ) : null}
              </form>
            </div>
          ) : (
            <>
            <div className="mt-5 rounded-3xl border border-indigo-200/30 bg-gradient-to-b from-indigo-100/95 via-slate-100/90 to-slate-100/85 p-4 text-slate-900 shadow-[0_20px_60px_rgba(0,0,0,0.25)] md:p-6">
              <div className="mx-auto max-w-xl">
                <div className="flex items-center justify-between text-indigo-700/80">
                  <button
                    type="button"
                    onClick={() => setActivePopup("stats")}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-indigo-300/70 bg-white/75 transition hover:bg-white"
                    aria-label={t.openStatsPopup}
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M4 6h16M7 12h10M10 18h4" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePopup("orders")}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-indigo-300/70 bg-white/75 transition hover:bg-white"
                    aria-label={t.openOrdersPopup}
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="m9 6 6 6-6 6" />
                    </svg>
                  </button>
                </div>

                <div className="mt-3 flex flex-col items-center text-center">
                  <div className="relative h-24 w-24 overflow-hidden rounded-full border-4 border-white shadow-[0_12px_30px_rgba(15,23,42,0.22)]">
                    {loading ? (
                      <div className="shimmer-skeleton h-full w-full bg-slate-200/70" />
                    ) : profileAvatarUrl ? (
                      <div
                        className="h-full w-full bg-cover bg-center"
                        style={{ backgroundImage: `url(${profileAvatarUrl})` }}
                        aria-label={`${profileName || "Customer"} avatar`}
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center bg-gradient-to-br from-indigo-500 to-blue-500 text-2xl font-bold text-white">
                        {profileInitials}
                      </div>
                    )}
                  </div>
                  <h2 className="mt-3 text-2xl font-semibold text-slate-900">{profileName || "-"}</h2>
                  <p className="mt-1 text-sm text-slate-500">{profileTagline}</p>

                  <button
                    type="button"
                    onClick={() => setActivePopup("profile")}
                    className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-indigo-900 px-5 text-sm font-semibold text-white shadow-[0_12px_25px_rgba(30,27,75,0.3)] transition hover:bg-indigo-800"
                  >
                    {t.openProfilePopup}
                  </button>

                  <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                    <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-indigo-300/70 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50">
                      {uploadingAvatar ? t.uploadingAvatar : t.uploadAvatar}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        disabled={uploadingAvatar || removingAvatar}
                        onChange={onAvatarFileChange}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={onDeleteAvatar}
                      disabled={!profileAvatarUrl || uploadingAvatar || removingAvatar}
                      className="inline-flex items-center justify-center rounded-full border border-rose-300/60 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      {removingAvatar ? t.removingAvatar : t.removeAvatar}
                    </button>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500">{t.avatarHint}</p>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-2 text-center">
                  <button
                    type="button"
                    onClick={() => setActivePopup("stats")}
                    className="rounded-2xl bg-white/80 px-2 py-3 transition hover:bg-white"
                  >
                    <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M4 12h16M4 6h16M4 18h16" />
                      </svg>
                    </span>
                    <span className="mt-1.5 block text-[11px] font-semibold text-slate-700">{t.openStatsPopup}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePopup("profile")}
                    className="rounded-2xl bg-white/80 px-2 py-3 transition hover:bg-white"
                  >
                    <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
                        <path d="M4 20a8 8 0 0 1 16 0" />
                      </svg>
                    </span>
                    <span className="mt-1.5 block text-[11px] font-semibold text-slate-700">{t.openProfilePopup}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePopup("orders")}
                    className="rounded-2xl bg-white/80 px-2 py-3 transition hover:bg-white"
                  >
                    <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6Z" />
                        <circle cx="12" cy="12" r="2.5" />
                      </svg>
                    </span>
                    <span className="mt-1.5 block text-[11px] font-semibold text-slate-700">{t.openOrdersPopup}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-5">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-300/70">{t.quickLinksTitle}</p>
            <div className="mt-3 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
              {quickLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group relative overflow-hidden rounded-2xl border px-4 py-3 shadow-[0_10px_30px_rgba(2,6,23,0.26)] transition duration-300 hover:-translate-y-0.5 hover:brightness-110 ${item.className}`}
                >
                  <span className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-white/10 blur-2xl transition duration-300 group-hover:scale-110" />
                  <span className="relative flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{item.label}</span>
                      <span className="mt-0.5 block truncate text-[11px] text-slate-200/70">{item.hint}</span>
                    </span>
                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-xs font-bold text-white/90 transition group-hover:translate-x-0.5">
                      &gt;
                    </span>
                  </span>
                </Link>
              ))}
            </div>
            </div>
            </>
          )}
        </header>

      </section>
      {notificationText ? (
        <div className="pointer-events-none fixed right-4 top-4 z-[160] w-[min(92vw,420px)]">
          <div
            className={`pointer-events-auto rounded-2xl border px-4 py-3 shadow-[0_20px_50px_rgba(0,0,0,0.45)] backdrop-blur-sm ${
              notificationType === "error"
                ? "border-rose-400/45 bg-rose-500/15 text-rose-100"
                : "border-emerald-400/45 bg-emerald-500/15 text-emerald-100"
            }`}
            role="status"
            aria-live="polite"
          >
            <div className="flex items-start gap-3">
              <p className="min-w-0 flex-1 text-sm font-semibold leading-6">{notificationText}</p>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setMessage(null);
                }}
                className="inline-flex h-7 items-center justify-center rounded-md border border-white/20 bg-black/20 px-2 text-xs font-semibold text-white/90 transition hover:bg-black/35"
              >
                {t.popupClose}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {activePopup ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label={t.popupClose}
            onClick={() => setActivePopup(null)}
            className="absolute inset-0 bg-slate-900/65 backdrop-blur-[2px]"
          />
          <div role="dialog" aria-modal="true" className="relative w-full max-w-3xl rounded-3xl border border-amber-300/35 bg-[#0b0f18] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.62)] md:p-6">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-semibold text-amber-200 md:text-2xl">{activePopupTitle}</h2>
              <button
                type="button"
                onClick={() => setActivePopup(null)}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-500/40 bg-slate-800/70 px-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-700/80"
              >
                {t.popupClose}
              </button>
            </div>

            <div className="mt-4 max-h-[74vh] overflow-y-auto pr-1">
              {activePopup === "stats" ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <article className="rounded-2xl border border-amber-300/20 bg-black/35 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-amber-200/70">{t.totalOrders}</p>
                    <p className="mt-1 text-xl font-semibold text-amber-100">{orders.length}</p>
                  </article>
                  <article className="rounded-2xl border border-emerald-300/25 bg-emerald-500/10 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-emerald-200/80">{t.paidOrders}</p>
                    <p className="mt-1 text-xl font-semibold text-emerald-100">{paidOrders}</p>
                  </article>
                  <article className="rounded-2xl border border-amber-300/25 bg-amber-500/10 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-amber-200/80">{t.pendingOrders}</p>
                    <p className="mt-1 text-xl font-semibold text-amber-100">{pendingOrders}</p>
                  </article>
                  <article className="rounded-2xl border border-sky-300/25 bg-sky-500/10 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-sky-200/80">{t.totalAmount}</p>
                    <p className="mt-1 text-xl font-semibold text-sky-100">{formatTHB(totalAmount, locale)}</p>
                  </article>
                </div>
              ) : null}

              {activePopup === "profile" ? (
                <div>
                  <p className="text-sm text-slate-300/75">{t.profileSubtitle}</p>
                  {loading ? (
                    <p className="mt-5 text-sm text-amber-100/70">{t.loading}</p>
                  ) : (
                    <form onSubmit={onSubmit} className="mt-5 space-y-4">
                      <label className="block">
                        <span className="mb-1.5 block text-sm font-medium text-slate-200/90">{t.fullName}</span>
                        <input
                          value={fullName}
                          onChange={(event) => setFullName(event.target.value)}
                          className="h-11 w-full rounded-xl border border-amber-300/35 bg-black/35 px-3 text-sm text-slate-50 outline-none transition focus:border-amber-200 focus:ring-2 focus:ring-amber-200/20"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block text-sm font-medium text-slate-200/90">{t.phone}</span>
                        <input
                          value={phone}
                          onChange={(event) => setPhone(event.target.value)}
                          className="h-11 w-full rounded-xl border border-amber-300/35 bg-black/35 px-3 text-sm text-slate-50 outline-none transition focus:border-amber-200 focus:ring-2 focus:ring-amber-200/20"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block text-sm font-medium text-slate-200/90">{t.address}</span>
                        <textarea
                          value={address}
                          onChange={(event) => setAddress(event.target.value)}
                          rows={4}
                          className="w-full rounded-xl border border-amber-300/35 bg-black/35 px-3 py-2 text-sm text-slate-50 outline-none transition focus:border-amber-200 focus:ring-2 focus:ring-amber-200/20"
                        />
                      </label>

                      <div className="flex flex-wrap items-center gap-3 pt-1">
                        <button
                          type="submit"
                          disabled={saving}
                          className="inline-flex h-11 items-center justify-center rounded-full border border-amber-300/70 bg-gradient-to-r from-amber-400 to-yellow-300 px-6 text-sm font-semibold text-zinc-900 shadow-[0_10px_30px_rgba(250,204,21,0.28)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {saving ? t.saving : t.save}
                        </button>
                        {profile?.created_at ? (
                          <p className="text-xs text-slate-300/70">
                            {t.createdAt}: {formatDateTime(profile.created_at, locale)}
                          </p>
                        ) : null}
                      </div>
                      {profile?.updated_at ? (
                        <p className="text-xs text-slate-400/70">
                          {t.updatedAt}: {formatDateTime(profile.updated_at, locale)}
                        </p>
                      ) : null}
                    </form>
                  )}
                </div>
              ) : null}

              {activePopup === "orders" ? (
                <div>
                  <p className="text-sm text-slate-300/75">{t.ordersSubtitle}</p>
                  {ordersLoading ? <p className="mt-5 text-sm text-amber-100/70">{t.loadingOrders}</p> : null}
                  {!ordersLoading && orders.length === 0 ? <p className="mt-5 text-sm text-slate-300/75">{t.emptyOrders}</p> : null}

                  {!ordersLoading && orders.length > 0 ? (
                    <div className="mt-4 max-h-[520px] space-y-3 overflow-y-auto pr-1">
                      {orders.map((order) => {
                        const showReceipt = canOpenReceipt(order.status, order.payment_status);
                        const receiptUrl = `/api/customer/orders/${encodeURIComponent(order.order_no)}/receipt?locale=${encodeURIComponent(locale)}`;

                        return (
                          <article key={order.id} className="rounded-2xl border border-amber-300/20 bg-black/35 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-amber-100 md:text-base">{order.order_no}</p>
                              <div className="flex items-center gap-2">
                                <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(order.status, order.payment_status)}`}>
                                  {statusLabel(locale, order.status, order.payment_status)}
                                </span>
                                {showReceipt ? (
                                  <a
                                    href={receiptUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    title={t.receiptTitle}
                                    aria-label={`${t.receiptTitle} ${order.order_no}`}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-sky-300/40 bg-sky-500/15 text-sky-100 transition hover:bg-sky-500/25"
                                  >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden>
                                      <path d="M7 3h8l4 4v13a1 1 0 0 1-1 1h-3v-3H9v3H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
                                      <path d="M15 3v5h5" />
                                      <path d="M9 12h6M9 15h6" />
                                    </svg>
                                  </a>
                                ) : null}
                              </div>
                            </div>
                            <p className="mt-2 text-base font-semibold text-sky-200">{formatTHB(order.grand_total ?? 0, locale)}</p>
                            <p className="mt-1 text-xs text-slate-300/65">{formatDateTime(order.created_at, locale)}</p>
                          </article>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
      <ForgotPasswordModal
        open={passwordModalIntent !== null}
        intent={passwordModalIntent === "change" ? "change" : "forgot"}
        locale={locale}
        initialEmail={customerEmail}
        lockEmail
        onClose={() => setPasswordModalIntent(null)}
        onSuccess={(successMessage) => {
          setPasswordModalIntent(null);
          setError(null);
          setMessage(successMessage);
        }}
      />
      {deleteConfirmOpen ? (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label={t.popupClose}
            onClick={() => setDeleteConfirmOpen(false)}
            className="absolute inset-0 bg-slate-900/70 backdrop-blur-[2px]"
          />
          <div role="dialog" aria-modal="true" className="relative w-full max-w-lg rounded-2xl border border-rose-300/35 bg-[#0b0f18] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.6)]">
            <h2 className="text-lg font-semibold text-rose-100">{t.deleteAccountTitle}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-200/85">{t.deleteAccountDescription}</p>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-200/90">{t.deletePasswordLabel}</span>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(event) => setDeletePassword(event.target.value)}
                  className="h-11 w-full rounded-xl border border-rose-300/35 bg-black/35 px-3 text-sm text-slate-50 outline-none transition focus:border-rose-200 focus:ring-2 focus:ring-rose-200/20"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-200/90">{t.deleteReasonLabel}</span>
                <textarea
                  value={deleteReason}
                  onChange={(event) => setDeleteReason(event.target.value)}
                  rows={3}
                  placeholder={t.deleteReasonPlaceholder}
                  className="w-full rounded-xl border border-rose-300/35 bg-black/35 px-3 py-2 text-sm text-slate-50 outline-none transition focus:border-rose-200 focus:ring-2 focus:ring-rose-200/20"
                />
              </label>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                disabled={deletingAccount}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-500/40 bg-slate-800/70 px-4 text-sm font-semibold text-slate-100 transition hover:bg-slate-700/80 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {t.popupClose}
              </button>
              <button
                type="button"
                onClick={() => void onRequestDeleteAccount()}
                disabled={deletingAccount || !deletePassword.trim()}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-rose-300/50 bg-rose-500/90 px-4 text-sm font-semibold text-white transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deletingAccount ? t.deletingAccount : t.deleteAccountAction}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {logoutConfirmOpen ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label={t.logoutCancelAction}
            onClick={() => setLogoutConfirmOpen(false)}
            className="absolute inset-0 bg-slate-900/65 backdrop-blur-[2px]"
          />
          <div role="dialog" aria-modal="true" className="relative w-full max-w-sm rounded-2xl border border-amber-300/35 bg-[#0b0f18] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
            <h2 className="text-lg font-semibold text-amber-200">{t.logoutConfirmTitle}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-200/85">{t.logoutConfirmDescription}</p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setLogoutConfirmOpen(false)}
                disabled={loggingOut}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-500/40 bg-slate-800/70 px-4 text-sm font-semibold text-slate-100 transition hover:bg-slate-700/80 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {t.logoutCancelAction}
              </button>
              <button
                type="button"
                onClick={() => {
                  setLogoutConfirmOpen(false);
                  void onLogout();
                }}
                disabled={loggingOut}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-rose-300/50 bg-rose-500/90 px-4 text-sm font-semibold text-white transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loggingOut ? t.loggingOut : t.logoutConfirmAction}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
