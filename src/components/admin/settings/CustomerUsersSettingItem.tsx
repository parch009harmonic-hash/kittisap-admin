"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { parseAdminApiError } from "../api-error";
import { ConfirmModal } from "../ConfirmModal";

type CustomerDeletionStatus = "active" | "pending_delete" | "purged" | "unknown";
type CustomerKycStatus = "not_started" | "in_progress" | "pending_review" | "approved" | "rejected" | "blocked" | "unknown";
type AdminOtpPurpose = "forgot_password" | "change_password" | "account_delete" | "account_recovery" | "other";

type AdminCustomerUserRecord = {
  id: string;
  email: string;
  displayName: string;
  role: "customer";
  createdAt: string | null;
  phone: string;
  address: string;
  deletionStatus: CustomerDeletionStatus;
  deletionRequestedAt: string | null;
  deletionScheduledFor: string | null;
  deletionReason: string | null;
  recoveredAt: string | null;
  isActive: boolean | null;
  kycStatus: CustomerKycStatus;
  kycApprovedAt: string | null;
  kycRejectedReason: string | null;
};

type AdminCustomerUserLogRecord = {
  id: string;
  action: "request" | "recover" | "finalize" | "blocked_pending_orders" | "unknown";
  reason: string | null;
  actorUserId: string | null;
  createdAt: string | null;
  metadata: Record<string, unknown>;
};

type AdminCustomerKycAccessGrant = {
  accessToken: string;
  expiresAt: string;
};

type AdminCustomerKycViewData = {
  customerId: string;
  displayName: string;
  email: string;
  phone: string;
  kycStatus: string;
  kycApprovedAt: string | null;
  kycRejectedReason: string | null;
  provider: string;
  faceImagePath: string | null;
  faceCapturedAt: string | null;
  faceImageSignedUrl: string | null;
};

type StatusFilter = "all" | "normal" | "pending_delete" | "purged" | "other";
type KycFilter = "all" | "kyc_done" | "not_kyc";
type DateFieldFilter = "createdAt" | "deletionScheduledFor" | "recoveredAt";

type RequestError = Error & {
  code?: string;
};

type Props = {
  locale: "th" | "en";
  isMobileMode: boolean;
  nameLabel: string;
  emailLabel: string;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
};

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit, timeoutMs = 12000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort("REQUEST_TIMEOUT"), timeoutMs);
  try {
    return await fetch(input, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function toRequestErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

function getStatusLabel(locale: "th" | "en", status: CustomerDeletionStatus, isActive: boolean | null) {
  if (status === "pending_delete" || isActive === false) {
    return locale === "th" ? "ดำเนินการลบ" : "Pending Delete";
  }
  if (status === "purged") {
    return locale === "th" ? "ลบถาวร" : "Purged";
  }
  if (status === "active") {
    return locale === "th" ? "user ปกติ" : "Normal";
  }
  return locale === "th" ? "อื่น ๆ" : "Other";
}

function getStatusClass(status: CustomerDeletionStatus, isActive: boolean | null) {
  if (status === "pending_delete" || isActive === false) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (status === "purged") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (status === "active") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function isKycDone(status: CustomerKycStatus) {
  return status === "approved";
}

function getKycStatusLabel(locale: "th" | "en", status: CustomerKycStatus) {
  if (status === "approved") {
    return locale === "th" ? "KYC แล้ว" : "KYC Done";
  }
  if (status === "not_started") {
    return locale === "th" ? "ยังไม่ KYC" : "Not KYC";
  }
  if (status === "in_progress") {
    return locale === "th" ? "KYC ระหว่างดำเนินการ" : "KYC In Progress";
  }
  if (status === "pending_review") {
    return locale === "th" ? "KYC รอตรวจสอบ" : "KYC Pending Review";
  }
  if (status === "rejected") {
    return locale === "th" ? "KYC ไม่ผ่าน" : "KYC Rejected";
  }
  if (status === "blocked") {
    return locale === "th" ? "KYC ถูกระงับ" : "KYC Blocked";
  }
  return locale === "th" ? "KYC อื่น ๆ" : "KYC Other";
}

function getKycStatusClass(status: CustomerKycStatus) {
  if (status === "approved") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === "not_started") {
    return "border-slate-200 bg-slate-50 text-slate-700";
  }
  if (status === "in_progress" || status === "pending_review") {
    return "border-cyan-200 bg-cyan-50 text-cyan-700";
  }
  if (status === "rejected" || status === "blocked") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function normalizeKycStatus(value: string): CustomerKycStatus {
  if (value === "approved" || value === "not_started" || value === "in_progress" || value === "pending_review" || value === "rejected" || value === "blocked") {
    return value;
  }
  return "unknown";
}

function isSixDigitPin(value: string) {
  return /^\d{6}$/.test(value);
}

function isTokenExpired(expiresAt: string) {
  const expiresMs = Date.parse(expiresAt);
  if (Number.isNaN(expiresMs)) {
    return true;
  }
  return expiresMs <= Date.now();
}

function matchesKycFilter(user: AdminCustomerUserRecord, filter: KycFilter) {
  if (filter === "all") {
    return true;
  }
  if (filter === "kyc_done") {
    return isKycDone(user.kycStatus);
  }
  return !isKycDone(user.kycStatus);
}

function toOtpPurposeLabel(locale: "th" | "en", purpose: AdminOtpPurpose) {
  if (purpose === "forgot_password") {
    return locale === "th" ? "ลืมรหัสผ่าน" : "Forgot Password";
  }
  if (purpose === "change_password") {
    return locale === "th" ? "เปลี่ยนรหัสผ่าน" : "Change Password";
  }
  if (purpose === "account_delete") {
    return locale === "th" ? "ลบบัญชี" : "Account Delete";
  }
  if (purpose === "account_recovery") {
    return locale === "th" ? "กู้คืนบัญชี" : "Account Recovery";
  }
  return locale === "th" ? "อื่น ๆ" : "Other";
}

function toActionLabel(locale: "th" | "en", action: AdminCustomerUserLogRecord["action"]) {
  if (action === "request") {
    return locale === "th" ? "คำขอลบ" : "Delete Requested";
  }
  if (action === "recover") {
    return locale === "th" ? "กู้คืน" : "Recovered";
  }
  if (action === "finalize") {
    return locale === "th" ? "ลบถาวร" : "Permanently Deleted";
  }
  if (action === "blocked_pending_orders") {
    return locale === "th" ? "บล็อกการลบ (มีออเดอร์ค้าง)" : "Delete Blocked (Pending Orders)";
  }
  return locale === "th" ? "อื่น ๆ" : "Other";
}

function matchesStatusFilter(user: AdminCustomerUserRecord, filter: StatusFilter) {
  if (filter === "all") {
    return true;
  }
  if (filter === "normal") {
    return user.deletionStatus === "active" && user.isActive !== false;
  }
  if (filter === "pending_delete") {
    return user.deletionStatus === "pending_delete" || user.isActive === false;
  }
  if (filter === "purged") {
    return user.deletionStatus === "purged";
  }
  return user.deletionStatus === "unknown";
}

function toDateStartMs(dateInput: string) {
  const clean = dateInput.trim();
  if (!clean) {
    return null;
  }
  const date = new Date(`${clean}T00:00:00`);
  const ms = date.getTime();
  return Number.isNaN(ms) ? null : ms;
}

function toDateEndMs(dateInput: string) {
  const clean = dateInput.trim();
  if (!clean) {
    return null;
  }
  const date = new Date(`${clean}T23:59:59.999`);
  const ms = date.getTime();
  return Number.isNaN(ms) ? null : ms;
}

function matchesDateRange(value: string | null, fromInput: string, toInput: string) {
  const from = toDateStartMs(fromInput);
  const to = toDateEndMs(toInput);
  if (from === null && to === null) {
    return true;
  }
  if (!value) {
    return false;
  }
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) {
    return false;
  }
  if (from !== null && ms < from) {
    return false;
  }
  if (to !== null && ms > to) {
    return false;
  }
  return true;
}

function csvSafe(value: unknown) {
  const normalized = String(value ?? "").replace(/\r?\n/g, " ").trim();
  if (normalized.includes(",") || normalized.includes('"')) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}

function toCsvDate(value: string | null) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toISOString();
}

export function CustomerUsersSettingItem({
  locale,
  isMobileMode,
  nameLabel,
  emailLabel,
  onSuccess,
  onError,
}: Props) {
  const t = {
    viewKycButton: locale === "th" ? "ดู KYC" : "View KYC",
    viewKycLoading: locale === "th" ? "กำลังโหลด KYC..." : "Loading KYC...",
    kycPinTitle: locale === "th" ? "ยืนยัน PIN เพื่อดู KYC" : "Confirm PIN to view KYC",
    kycPinLabel: locale === "th" ? "PIN 6 หลัก" : "6-digit PIN",
    kycPinHint: locale === "th" ? "กรอก PIN ของบัญชีทีมงานนี้" : "Enter this team user's PIN.",
    kycPinSubmit: locale === "th" ? "ยืนยัน PIN" : "Confirm PIN",
    kycPinRequired: locale === "th" ? "กรุณากรอก PIN 6 หลักก่อนดำเนินการ" : "Please enter a 6-digit PIN before continuing.",
    kycPinInvalid: locale === "th" ? "PIN ต้องเป็นตัวเลข 6 หลัก" : "PIN must be exactly 6 digits.",
    kycAccessFailed: locale === "th" ? "ยืนยัน PIN เพื่อดู KYC ไม่สำเร็จ" : "Failed to verify PIN for KYC access.",
    kycViewFailed: locale === "th" ? "โหลดข้อมูล KYC ไม่สำเร็จ" : "Failed to load KYC details.",
    kycViewTokenExpired: locale === "th" ? "โทเคนหมดอายุ กรุณายืนยัน PIN อีกครั้ง" : "Access token expired. Please confirm PIN again.",
    kycModalTitle: locale === "th" ? "ข้อมูล KYC ลูกค้า" : "Customer KYC Data",
    kycProvider: locale === "th" ? "ผู้ให้บริการ KYC" : "KYC Provider",
    kycFaceCapturedAt: locale === "th" ? "เวลาสแกนใบหน้า" : "Face Captured At",
    kycFaceImage: locale === "th" ? "ภาพใบหน้า" : "Face Image",
    kycNoFaceImage: locale === "th" ? "ไม่พบภาพใบหน้า" : "No face image available.",
    listTitle: locale === "th" ? "จัดการผู้ใช้ลูกค้า" : "Customer User Management",
    listSubtitle:
      locale === "th"
        ? "แยกจากบัญชีแอดมิน/พนักงาน/นักพัฒนา พร้อมสถานะการลบจากระบบลูกค้า"
        : "Separated from admin/staff/developer with storefront account-deletion status.",
    noData: locale === "th" ? "ไม่พบผู้ใช้ลูกค้าตามเงื่อนไขที่ค้นหา" : "No customer users match your filters.",
    resetButton: locale === "th" ? "รีเซ็ต" : "Reset",
    exportCsvButton: locale === "th" ? "ส่งออก CSV" : "Export CSV",
    exportCsvWorking: locale === "th" ? "กำลังส่งออก..." : "Exporting...",
    editButton: locale === "th" ? "ดู/แก้ไข" : "View/Edit",
    detailButton: locale === "th" ? "รายละเอียด" : "Details",
    recoverButton: locale === "th" ? "ปลดล็อค/กู้" : "Unlock/Recover",
    deleteButton: locale === "th" ? "ลบ" : "Delete",
    closeButton: locale === "th" ? "ปิด" : "Close",
    saveButton: locale === "th" ? "บันทึก" : "Save",
    loading: locale === "th" ? "กำลังโหลด..." : "Loading...",
    searchPlaceholder: locale === "th" ? "ค้นหาชื่อ อีเมล เบอร์โทร หรือ UUID" : "Search name, email, phone, or UUID",
    filterLabel: locale === "th" ? "ตัวกรองสถานะ" : "Status Filter",
    filterAll: locale === "th" ? "ทั้งหมด" : "All",
    filterNormal: locale === "th" ? "ปกติ" : "Normal",
    filterPendingDelete: locale === "th" ? "ดำเนินการลบ" : "Pending Delete",
    filterPurged: locale === "th" ? "ลบถาวร" : "Purged",
    filterOther: locale === "th" ? "อื่น ๆ" : "Other",
    kycFilterLabel: locale === "th" ? "ตัวกรอง KYC" : "KYC Filter",
    kycFilterAll: locale === "th" ? "ทั้งหมด" : "All",
    kycFilterDone: locale === "th" ? "KYC แล้ว" : "KYC Done",
    kycFilterNotDone: locale === "th" ? "ยังไม่ KYC" : "Not KYC",
    dateFilterTitle: locale === "th" ? "ตัวกรองช่วงวันที่" : "Date Range Filters",
    createdDateRange: locale === "th" ? "สร้างบัญชี" : "Created",
    scheduledDateRange: locale === "th" ? "กำหนดลบ" : "Scheduled Delete",
    recoveredDateRange: locale === "th" ? "กู้คืน" : "Recovered",
    dateFrom: locale === "th" ? "จาก" : "From",
    dateTo: locale === "th" ? "ถึง" : "To",
    pageSizeLabel: locale === "th" ? "ต่อหน้า" : "Per Page",
    pageInfo: locale === "th" ? "หน้า" : "Page",
    pageOf: locale === "th" ? "จาก" : "of",
    prevPage: locale === "th" ? "ก่อนหน้า" : "Prev",
    nextPage: locale === "th" ? "ถัดไป" : "Next",
    resultSummary: locale === "th" ? "รายการที่แสดง" : "Showing",
    resultSuffix: locale === "th" ? "รายการ" : "records",
    status: locale === "th" ? "สถานะลูกค้า" : "Customer Status",
    kycStatus: locale === "th" ? "สถานะ KYC" : "KYC Status",
    kycApprovedAt: locale === "th" ? "KYC อนุมัติเมื่อ" : "KYC Approved At",
    kycRejectedReasonLabel: locale === "th" ? "เหตุผล KYC ไม่ผ่าน" : "KYC Rejected Reason",
    createdAt: locale === "th" ? "สร้างเมื่อ" : "Created At",
    action: locale === "th" ? "จัดการ" : "Actions",
    editTitle: locale === "th" ? "แก้ไข user ลูกค้า" : "Edit Customer User",
    detailTitle: locale === "th" ? "รายละเอียดผู้ใช้ลูกค้า" : "Customer User Details",
    detailLogTitle: locale === "th" ? "ประวัติการดำเนินการลบ/กู้" : "Deletion/Recovery Activity Log",
    detailLogEmpty: locale === "th" ? "ไม่พบประวัติการดำเนินการ" : "No activity logs found.",
    detailLogLoading: locale === "th" ? "กำลังโหลดประวัติ..." : "Loading activity logs...",
    detailRequestedAt: locale === "th" ? "เริ่มคำขอลบ" : "Deletion Requested At",
    detailRecoveredAt: locale === "th" ? "กู้คืนล่าสุด" : "Recovered At",
    detailActor: locale === "th" ? "ผู้ดำเนินการ" : "Actor",
    phoneLabel: locale === "th" ? "เบอร์โทร" : "Phone",
    addressLabel: locale === "th" ? "ที่อยู่" : "Address",
    newPassword: locale === "th" ? "รหัสผ่านใหม่" : "New Password",
    newPasswordHint:
      locale === "th" ? "เว้นว่างไว้หากไม่ต้องการเปลี่ยนรหัสผ่าน" : "Leave blank to keep current password.",
    statusPendingAt: locale === "th" ? "กำหนดลบ" : "Scheduled",
    statusReason: locale === "th" ? "เหตุผล" : "Reason",
    updateSuccess: locale === "th" ? "อัปเดต user ลูกค้าสำเร็จ" : "Customer user updated successfully.",
    updateFailed: locale === "th" ? "อัปเดต user ลูกค้าไม่สำเร็จ" : "Failed to update customer user.",
    recoverSuccess: locale === "th" ? "ปลดล็อค/กู้ user ลูกค้าสำเร็จ" : "Customer user recovered successfully.",
    recoverFailed: locale === "th" ? "ปลดล็อค/กู้ user ลูกค้าไม่สำเร็จ" : "Failed to recover customer user.",
    otpButton: locale === "th" ? "ส่ง OTP" : "Send OTP",
    otpPurposeLabel: locale === "th" ? "ประเภท OTP" : "OTP Purpose",
    otpPurposeForgot: locale === "th" ? "ลืมรหัสผ่าน" : "Forgot Password",
    otpPurposeChange: locale === "th" ? "เปลี่ยนรหัสผ่าน" : "Change Password",
    otpPurposeDelete: locale === "th" ? "ลบบัญชี" : "Account Delete",
    otpPurposeRecovery: locale === "th" ? "กู้คืนบัญชี" : "Account Recovery",
    otpPurposeOther: locale === "th" ? "อื่น ๆ" : "Other",
    otpSentSuccess: locale === "th" ? "ส่ง OTP ให้ผู้ใช้เรียบร้อย" : "OTP sent to user successfully.",
    otpSentFailed: locale === "th" ? "ส่ง OTP ไม่สำเร็จ" : "Failed to send OTP.",
    deleteSuccess: locale === "th" ? "ลบ user ลูกค้าสำเร็จ" : "Customer user deleted successfully.",
    deleteFailed: locale === "th" ? "ลบ user ลูกค้าไม่สำเร็จ" : "Failed to delete customer user.",
    confirmDeleteTitle: locale === "th" ? "ยืนยันการลบ user ลูกค้า" : "Confirm Delete Customer User",
    confirmDeleteMessage:
      locale === "th" ? "คุณต้องการลบ user ลูกค้านี้ใช่หรือไม่" : "Are you sure you want to delete this customer user?",
    invalidForm: locale === "th" ? "กรอกชื่อและอีเมลให้ครบก่อนบันทึก" : "Please provide display name and email.",
    invalidPassword: locale === "th" ? "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" : "Password must be at least 6 characters.",
    detailsFailed: locale === "th" ? "โหลดรายละเอียดผู้ใช้ลูกค้าไม่สำเร็จ" : "Failed to load customer user details.",
    exportFailed: locale === "th" ? "ส่งออก CSV ไม่สำเร็จ" : "Failed to export CSV.",
    exportSuccess: locale === "th" ? "ส่งออก CSV สำเร็จ" : "CSV exported successfully.",
  };

  const refreshFailedText = locale === "th" ? "โหลดรายการ user ลูกค้าไม่สำเร็จ" : "Failed to load customer users.";

  const [users, setUsers] = useState<AdminCustomerUserRecord[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [editingUser, setEditingUser] = useState<AdminCustomerUserRecord | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState<AdminCustomerUserRecord | null>(null);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [kycFilter, setKycFilter] = useState<KycFilter>("all");
  const [createdDateFrom, setCreatedDateFrom] = useState("");
  const [createdDateTo, setCreatedDateTo] = useState("");
  const [scheduledDateFrom, setScheduledDateFrom] = useState("");
  const [scheduledDateTo, setScheduledDateTo] = useState("");
  const [recoveredDateFrom, setRecoveredDateFrom] = useState("");
  const [recoveredDateTo, setRecoveredDateTo] = useState("");
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [detailUser, setDetailUser] = useState<AdminCustomerUserRecord | null>(null);
  const [detailLogs, setDetailLogs] = useState<AdminCustomerUserLogRecord[]>([]);
  const [loadingDetailLogs, setLoadingDetailLogs] = useState(false);
  const [kycPinUser, setKycPinUser] = useState<AdminCustomerUserRecord | null>(null);
  const [kycPinInput, setKycPinInput] = useState("");
  const [submittingKycPin, setSubmittingKycPin] = useState(false);
  const [loadingKycViewUserId, setLoadingKycViewUserId] = useState<string | null>(null);
  const [kycViewData, setKycViewData] = useState<AdminCustomerKycViewData | null>(null);
  const [kycAccessByUserId, setKycAccessByUserId] = useState<Record<string, AdminCustomerKycAccessGrant>>({});

  const [editDisplayName, setEditDisplayName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editKycStatus, setEditKycStatus] = useState<CustomerKycStatus>("not_started");
  const [editKycRejectedReason, setEditKycRejectedReason] = useState("");
  const [editOtpPurpose, setEditOtpPurpose] = useState<AdminOtpPurpose>("forgot_password");

  const fetchUsersSnapshot = useCallback(async () => {
    const response = await fetchWithTimeout("/api/admin/customer-users", { method: "GET" }, 20000);
    const result = (await response.json()) as { code?: string; error?: string; users?: AdminCustomerUserRecord[] };
    if (!response.ok || !result.users) {
      const parsedError = parseAdminApiError(result, refreshFailedText, locale);
      throw new Error(parsedError.message);
    }
    return result.users;
  }, [locale, refreshFailedText]);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const nextUsers = await fetchUsersSnapshot();
      setUsers(nextUsers);
      setDetailUser((prev) => {
        if (!prev) return prev;
        return nextUsers.find((item) => item.id === prev.id) ?? prev;
      });
      setDeletingUser((prev) => {
        if (!prev) return prev;
        return nextUsers.find((item) => item.id === prev.id) ?? prev;
      });
    } catch (error) {
      onError(toRequestErrorMessage(error, refreshFailedText));
    } finally {
      setLoadingUsers(false);
    }
  }, [fetchUsersSnapshot, onError, refreshFailedText]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let disposed = false;
    let inFlight = false;

    const refreshSilently = async () => {
      if (disposed || inFlight || Boolean(savingUserId)) {
        return;
      }
      inFlight = true;
      try {
        const nextUsers = await fetchUsersSnapshot();
        if (disposed) {
          return;
        }
        setUsers(nextUsers);
        setDetailUser((prev) => {
          if (!prev) return prev;
          return nextUsers.find((item) => item.id === prev.id) ?? prev;
        });
        setDeletingUser((prev) => {
          if (!prev) return prev;
          return nextUsers.find((item) => item.id === prev.id) ?? prev;
        });
      } catch {
        // Ignore transient auto-refresh errors; manual actions still show errors.
      } finally {
        inFlight = false;
      }
    };

    const intervalId = window.setInterval(() => {
      void refreshSilently();
    }, 8000);
    const handleFocus = () => {
      void refreshSilently();
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void refreshSilently();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      disposed = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchUsersSnapshot, savingUserId]);

  const resetPanel = () => {
    setEditingUser(null);
    setDeletingUserId(null);
    setDeletingUser(null);
    setSavingUserId(null);
    setDetailUser(null);
    setDetailLogs([]);
    setLoadingDetailLogs(false);
    setKycPinUser(null);
    setKycPinInput("");
    setSubmittingKycPin(false);
    setLoadingKycViewUserId(null);
    setKycViewData(null);
    setKycAccessByUserId({});
    setSearchKeyword("");
    setStatusFilter("all");
    setKycFilter("all");
    setCreatedDateFrom("");
    setCreatedDateTo("");
    setScheduledDateFrom("");
    setScheduledDateTo("");
    setRecoveredDateFrom("");
    setRecoveredDateTo("");
    setPageSize(20);
    setCurrentPage(1);
    setExportingCsv(false);
    setEditDisplayName("");
    setEditEmail("");
    setEditPhone("");
    setEditAddress("");
    setEditPassword("");
    setEditKycStatus("not_started");
    setEditKycRejectedReason("");
    setEditOtpPurpose("forgot_password");
    void loadUsers();
  };

  const openEdit = (user: AdminCustomerUserRecord) => {
    setEditingUser(user);
    setEditDisplayName(user.displayName);
    setEditEmail(user.email);
    setEditPhone(user.phone);
    setEditAddress(user.address);
    setEditPassword("");
    setEditKycStatus(user.kycStatus === "unknown" ? "not_started" : user.kycStatus);
    setEditKycRejectedReason(user.kycRejectedReason ?? "");
    setEditOtpPurpose("forgot_password");
  };

  const updateUser = async () => {
    if (!editingUser) {
      return;
    }
    if (!editDisplayName.trim() || !editEmail.trim()) {
      onError(t.invalidForm);
      return;
    }
    if (editPassword.trim() && editPassword.trim().length < 6) {
      onError(t.invalidPassword);
      return;
    }

    setSavingUserId(editingUser.id);
    try {
      const response = await fetchWithTimeout("/api/admin/customer-users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: editingUser.id,
          action: "update",
          displayName: editDisplayName.trim(),
          email: editEmail.trim(),
          phone: editPhone.trim(),
          address: editAddress.trim(),
          password: editPassword.trim() || undefined,
          kycStatus: editKycStatus,
          kycRejectedReason: editKycStatus === "rejected" ? (editKycRejectedReason.trim() || undefined) : undefined,
        }),
      });
      const result = (await response.json()) as { code?: string; error?: string };
      if (!response.ok) {
        const parsedError = parseAdminApiError(result, t.updateFailed, locale);
        throw new Error(parsedError.message);
      }
      setEditingUser(null);
      onSuccess(t.updateSuccess);
      void loadUsers();
    } catch (error) {
      onError(toRequestErrorMessage(error, t.updateFailed));
    } finally {
      setSavingUserId(null);
    }
  };

  const recoverUser = async (user: AdminCustomerUserRecord) => {
    setSavingUserId(user.id);
    try {
      const response = await fetchWithTimeout("/api/admin/customer-users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          action: "recover",
        }),
      });
      const result = (await response.json()) as { code?: string; error?: string };
      if (!response.ok) {
        const parsedError = parseAdminApiError(result, t.recoverFailed, locale);
        throw new Error(parsedError.message);
      }
      if (editingUser?.id === user.id) {
        setEditingUser(null);
      }
      onSuccess(t.recoverSuccess);
      void loadUsers();
    } catch (error) {
      onError(toRequestErrorMessage(error, t.recoverFailed));
    } finally {
      setSavingUserId(null);
    }
  };

  const sendOtpToUser = async (user: AdminCustomerUserRecord, otpPurpose: AdminOtpPurpose) => {
    setSavingUserId(user.id);
    try {
      const response = await fetchWithTimeout("/api/admin/customer-users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          action: "send_otp",
          otpPurpose,
        }),
      });
      const result = (await response.json()) as { code?: string; error?: string };
      if (!response.ok) {
        const parsedError = parseAdminApiError(result, t.otpSentFailed, locale);
        throw new Error(parsedError.message);
      }
      onSuccess(`${t.otpSentSuccess} (${toOtpPurposeLabel(locale, otpPurpose)})`);
    } catch (error) {
      onError(toRequestErrorMessage(error, t.otpSentFailed));
    } finally {
      setSavingUserId(null);
    }
  };

  const deleteUser = async (user: AdminCustomerUserRecord) => {
    setSavingUserId(user.id);
    try {
      const response = await fetchWithTimeout("/api/admin/customer-users", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
        }),
      });
      const result = (await response.json()) as { code?: string; error?: string };
      if (!response.ok) {
        const parsedError = parseAdminApiError(result, t.deleteFailed, locale);
        throw new Error(parsedError.message);
      }
      setDeletingUserId(null);
      setDeletingUser(null);
      if (editingUser?.id === user.id) {
        setEditingUser(null);
      }
      onSuccess(t.deleteSuccess);
      void loadUsers();
    } catch (error) {
      onError(toRequestErrorMessage(error, t.deleteFailed));
    } finally {
      setSavingUserId(null);
    }
  };

  const formatDate = (value: string | null) => {
    if (!value) {
      return "-";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "-";
    }
    return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  };

  const needsRecover = (user: AdminCustomerUserRecord) =>
    user.deletionStatus === "pending_delete" || user.deletionStatus === "purged" || user.isActive === false;

  const filteredUsers = useMemo(() => {
    const q = searchKeyword.trim().toLowerCase();
    return users.filter((user) => {
      if (!matchesStatusFilter(user, statusFilter)) {
        return false;
      }
      if (!matchesKycFilter(user, kycFilter)) {
        return false;
      }
      if (!matchesDateRange(user.createdAt, createdDateFrom, createdDateTo)) {
        return false;
      }
      if (!matchesDateRange(user.deletionScheduledFor, scheduledDateFrom, scheduledDateTo)) {
        return false;
      }
      if (!matchesDateRange(user.recoveredAt, recoveredDateFrom, recoveredDateTo)) {
        return false;
      }
      if (!q) {
        return true;
      }
      const haystack = [user.displayName, user.email, user.phone, user.id, user.address]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [
    createdDateFrom,
    createdDateTo,
    recoveredDateFrom,
    recoveredDateTo,
    scheduledDateFrom,
    scheduledDateTo,
    searchKeyword,
    statusFilter,
    kycFilter,
    users,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    createdDateFrom,
    createdDateTo,
    recoveredDateFrom,
    recoveredDateTo,
    scheduledDateFrom,
    scheduledDateTo,
    searchKeyword,
    statusFilter,
    kycFilter,
    pageSize,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const pagedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [currentPage, filteredUsers, pageSize]);

  const loadLogsByUserId = useCallback(
    async (userId: string, fallbackError: string) => {
      const response = await fetchWithTimeout(`/api/admin/customer-users?userId=${encodeURIComponent(userId)}`, { method: "GET" }, 20000);
      const result = (await response.json()) as { code?: string; error?: string; logs?: AdminCustomerUserLogRecord[] };
      if (!response.ok || !result.logs) {
        const parsedError = parseAdminApiError(result, fallbackError, locale);
        throw new Error(parsedError.message);
      }
      return result.logs;
    },
    [locale],
  );

  const openDetails = async (user: AdminCustomerUserRecord) => {
    setDetailUser(user);
    setDetailLogs([]);
    setLoadingDetailLogs(true);
    try {
      const logs = await loadLogsByUserId(user.id, t.detailsFailed);
      setDetailLogs(logs);
    } catch (error) {
      onError(toRequestErrorMessage(error, t.detailsFailed));
    } finally {
      setLoadingDetailLogs(false);
    }
  };

  const createRequestError = (code: string | undefined, message: string) => {
    const error = new Error(message) as RequestError;
    error.code = code;
    return error;
  };

  const requestKycAccess = useCallback(
    async (customerId: string, pin: string) => {
      const response = await fetchWithTimeout(
        "/api/admin/customer-users/kyc-access",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            customerId,
            pin,
          }),
        },
        20000,
      );

      const result = (await response.json()) as {
        code?: string;
        error?: string;
        data?: AdminCustomerKycAccessGrant;
      };

      if (!response.ok || !result.data?.accessToken) {
        const parsedError = parseAdminApiError(result, t.kycAccessFailed, locale);
        throw createRequestError(result.code, parsedError.message);
      }

      return result.data;
    },
    [locale, t.kycAccessFailed],
  );

  const fetchKycView = useCallback(
    async (customerId: string, accessToken: string) => {
      const response = await fetchWithTimeout(
        `/api/admin/customer-users/${encodeURIComponent(customerId)}/kyc-view`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
        20000,
      );

      const result = (await response.json()) as {
        code?: string;
        error?: string;
        data?: AdminCustomerKycViewData;
      };

      if (!response.ok || !result.data) {
        const parsedError = parseAdminApiError(result, t.kycViewFailed, locale);
        throw createRequestError(result.code, parsedError.message);
      }

      return result.data;
    },
    [locale, t.kycViewFailed],
  );

  const openKycViewWithToken = useCallback(
    async (user: AdminCustomerUserRecord, accessToken: string) => {
      setLoadingKycViewUserId(user.id);
      try {
        const data = await fetchKycView(user.id, accessToken);
        setKycViewData(data);
      } catch (error) {
        const errorWithCode = error as RequestError;
        if (errorWithCode.code === "TOKEN_INVALID" || errorWithCode.code === "TOKEN_REQUIRED") {
          setKycAccessByUserId((prev) => {
            const next = { ...prev };
            delete next[user.id];
            return next;
          });
          setKycPinUser(user);
          setKycPinInput("");
          onError(t.kycViewTokenExpired);
          return;
        }
        onError(toRequestErrorMessage(error, t.kycViewFailed));
      } finally {
        setLoadingKycViewUserId(null);
      }
    },
    [fetchKycView, onError, t.kycViewFailed, t.kycViewTokenExpired],
  );

  const openKycView = async (user: AdminCustomerUserRecord) => {
    const activeGrant = kycAccessByUserId[user.id];
    if (activeGrant && !isTokenExpired(activeGrant.expiresAt)) {
      await openKycViewWithToken(user, activeGrant.accessToken);
      return;
    }
    setKycPinUser(user);
    setKycPinInput("");
  };

  const submitKycPin = async () => {
    if (!kycPinUser) {
      return;
    }

    const pin = kycPinInput.trim();
    if (!pin) {
      onError(t.kycPinRequired);
      return;
    }
    if (!isSixDigitPin(pin)) {
      onError(t.kycPinInvalid);
      return;
    }

    setSubmittingKycPin(true);
    try {
      const grant = await requestKycAccess(kycPinUser.id, pin);
      setKycAccessByUserId((prev) => ({
        ...prev,
        [kycPinUser.id]: grant,
      }));
      const selectedUser = kycPinUser;
      setKycPinUser(null);
      setKycPinInput("");
      await openKycViewWithToken(selectedUser, grant.accessToken);
    } catch (error) {
      onError(toRequestErrorMessage(error, t.kycAccessFailed));
    } finally {
      setSubmittingKycPin(false);
    }
  };

  const exportCsv = async () => {
    if (filteredUsers.length === 0) {
      onError(t.noData);
      return;
    }

    setExportingCsv(true);
    try {
      const header = [
        "display_name",
        "email",
        "phone",
        "status",
        "kyc_status",
        "kyc_approved_at",
        "kyc_rejected_reason",
        "created_at",
        "deletion_requested_at",
        "deletion_scheduled_for",
        "recovered_at",
        "is_active",
        "deletion_reason",
        "log_total",
        "log_request",
        "log_recover",
        "log_finalize",
        "log_blocked_pending_orders",
        "latest_log_action",
        "latest_log_at",
        "user_id",
        "address",
      ];

      const lines = [header.join(",")];

      for (const user of filteredUsers) {
        let logs: AdminCustomerUserLogRecord[] = [];
        try {
          logs = await loadLogsByUserId(user.id, t.detailsFailed);
        } catch {
          logs = [];
        }

        const logRequest = logs.filter((log) => log.action === "request").length;
        const logRecover = logs.filter((log) => log.action === "recover").length;
        const logFinalize = logs.filter((log) => log.action === "finalize").length;
        const logBlocked = logs.filter((log) => log.action === "blocked_pending_orders").length;
        const latestLog = logs[0] ?? null;

        const row = [
          csvSafe(user.displayName),
          csvSafe(user.email),
          csvSafe(user.phone),
          csvSafe(getStatusLabel(locale, user.deletionStatus, user.isActive)),
          csvSafe(getKycStatusLabel(locale, user.kycStatus)),
          csvSafe(toCsvDate(user.kycApprovedAt)),
          csvSafe(user.kycRejectedReason ?? ""),
          csvSafe(toCsvDate(user.createdAt)),
          csvSafe(toCsvDate(user.deletionRequestedAt)),
          csvSafe(toCsvDate(user.deletionScheduledFor)),
          csvSafe(toCsvDate(user.recoveredAt)),
          csvSafe(user.isActive === null ? "" : String(user.isActive)),
          csvSafe(user.deletionReason ?? ""),
          csvSafe(logs.length),
          csvSafe(logRequest),
          csvSafe(logRecover),
          csvSafe(logFinalize),
          csvSafe(logBlocked),
          csvSafe(latestLog ? toActionLabel(locale, latestLog.action) : ""),
          csvSafe(latestLog ? toCsvDate(latestLog.createdAt) : ""),
          csvSafe(user.id),
          csvSafe(user.address),
        ];
        lines.push(row.join(","));
      }

      const csvContent = `\uFEFF${lines.join("\r\n")}`;
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      anchor.href = url;
      anchor.download = `customer-users-${stamp}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      onSuccess(t.exportSuccess);
    } catch (error) {
      onError(toRequestErrorMessage(error, t.exportFailed));
    } finally {
      setExportingCsv(false);
    }
  };

  return (
    <li className="px-4 py-4">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-800">{t.listTitle}</p>
            <p className="text-xs text-slate-500">{t.listSubtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void exportCsv()}
              disabled={exportingCsv || loadingUsers || filteredUsers.length === 0}
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
            >
              {exportingCsv ? t.exportCsvWorking : t.exportCsvButton}
            </button>
            <button
              type="button"
              onClick={() => void resetPanel()}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {t.resetButton}
            </button>
          </div>
        </div>

        <div className={`grid gap-3 ${isMobileMode ? "grid-cols-1" : "grid-cols-1 md:grid-cols-[1fr_220px_220px] md:items-end"}`}>
          <label className="space-y-1">
            <span className="text-xs font-semibold text-slate-600">{t.searchPlaceholder}</span>
            <input
              type="text"
              value={searchKeyword}
              onChange={(event) => setSearchKeyword(event.target.value)}
              placeholder={t.searchPlaceholder}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold text-slate-600">{t.filterLabel}</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">{t.filterAll}</option>
              <option value="normal">{t.filterNormal}</option>
              <option value="pending_delete">{t.filterPendingDelete}</option>
              <option value="purged">{t.filterPurged}</option>
              <option value="other">{t.filterOther}</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold text-slate-600">{t.kycFilterLabel}</span>
            <select
              value={kycFilter}
              onChange={(event) => setKycFilter(event.target.value as KycFilter)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">{t.kycFilterAll}</option>
              <option value="kyc_done">{t.kycFilterDone}</option>
              <option value="not_kyc">{t.kycFilterNotDone}</option>
            </select>
          </label>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold text-slate-700">{t.dateFilterTitle}</p>
          <div className="mt-2 grid gap-3 md:grid-cols-3">
            {([
              { key: "createdAt", label: t.createdDateRange, from: createdDateFrom, to: createdDateTo },
              { key: "deletionScheduledFor", label: t.scheduledDateRange, from: scheduledDateFrom, to: scheduledDateTo },
              { key: "recoveredAt", label: t.recoveredDateRange, from: recoveredDateFrom, to: recoveredDateTo },
            ] as Array<{ key: DateFieldFilter; label: string; from: string; to: string }>).map((item) => (
              <div key={item.key} className="rounded-lg border border-slate-200 bg-white p-2">
                <p className="text-xs font-semibold text-slate-600">{item.label}</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <label className="space-y-1">
                    <span className="text-[11px] text-slate-500">{t.dateFrom}</span>
                    <input
                      type="date"
                      value={item.from}
                      onChange={(event) => {
                        if (item.key === "createdAt") setCreatedDateFrom(event.target.value);
                        if (item.key === "deletionScheduledFor") setScheduledDateFrom(event.target.value);
                        if (item.key === "recoveredAt") setRecoveredDateFrom(event.target.value);
                      }}
                      className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[11px] text-slate-500">{t.dateTo}</span>
                    <input
                      type="date"
                      value={item.to}
                      onChange={(event) => {
                        if (item.key === "createdAt") setCreatedDateTo(event.target.value);
                        if (item.key === "deletionScheduledFor") setScheduledDateTo(event.target.value);
                        if (item.key === "recoveredAt") setRecoveredDateTo(event.target.value);
                      }}
                      className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-500">
            {t.resultSummary} {filteredUsers.length} {t.resultSuffix} | {t.pageInfo} {currentPage} {t.pageOf} {totalPages}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1 text-xs text-slate-600">
              <span>{t.pageSizeLabel}</span>
              <select
                value={String(pageSize)}
                onChange={(event) => setPageSize(Number(event.target.value))}
                className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </label>
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage <= 1}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {t.prevPage}
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage >= totalPages}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {t.nextPage}
            </button>
          </div>
        </div>

        {isMobileMode ? (
          <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-2">
            {loadingUsers ? (
              <p className="px-2 py-4 text-center text-sm text-slate-500">{t.loading}</p>
            ) : filteredUsers.length === 0 ? (
              <p className="px-2 py-4 text-center text-sm text-slate-500">{t.noData}</p>
            ) : (
              pagedUsers.map((user) => (
                <article key={user.id} className="rounded-xl border border-slate-200 p-3">
                  <p className="text-sm font-semibold text-slate-900">{user.displayName}</p>
                  <p className="mt-1 break-all text-xs text-slate-600">{user.email}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className={`inline-flex rounded-full border px-2 py-1 font-semibold ${getStatusClass(user.deletionStatus, user.isActive)}`}>
                      {getStatusLabel(locale, user.deletionStatus, user.isActive)}
                    </span>
                    <span className={`inline-flex rounded-full border px-2 py-1 font-semibold ${getKycStatusClass(user.kycStatus)}`}>
                      {getKycStatusLabel(locale, user.kycStatus)}
                    </span>
                    <span className="text-slate-500">{formatDate(user.createdAt)}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => void openDetails(user)}
                      disabled={savingUserId === user.id}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
                    >
                      {t.detailButton}
                    </button>
                    <button
                      type="button"
                      onClick={() => void openKycView(user)}
                      disabled={savingUserId === user.id || loadingKycViewUserId === user.id || user.kycStatus !== "approved"}
                      className="rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-100 disabled:opacity-60"
                    >
                      {loadingKycViewUserId === user.id ? t.viewKycLoading : t.viewKycButton}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(user)}
                      disabled={savingUserId === user.id}
                      className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-60"
                    >
                      {t.editButton}
                    </button>
                    <button
                      type="button"
                      onClick={() => void sendOtpToUser(user, "forgot_password")}
                      disabled={savingUserId === user.id}
                      className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-60"
                    >
                      {t.otpButton}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeletingUserId(user.id);
                        setDeletingUser(user);
                      }}
                      disabled={savingUserId === user.id}
                      className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
                    >
                      {t.deleteButton}
                    </button>
                  </div>
                  {needsRecover(user) ? (
                    <button
                      type="button"
                      onClick={() => void recoverUser(user)}
                      disabled={savingUserId === user.id}
                      className="mt-2 w-full rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
                    >
                      {t.recoverButton}
                    </button>
                  ) : null}
                </article>
              ))
            )}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[920px] bg-white text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">{nameLabel}</th>
                  <th className="px-3 py-2 text-left font-semibold">{emailLabel}</th>
                  <th className="px-3 py-2 text-left font-semibold">{t.status}</th>
                  <th className="px-3 py-2 text-left font-semibold">{t.kycStatus}</th>
                  <th className="px-3 py-2 text-left font-semibold">{t.createdAt}</th>
                  <th className="px-3 py-2 text-left font-semibold">{t.action}</th>
                </tr>
              </thead>
              <tbody>
                {loadingUsers ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-4 text-center text-slate-500">
                      {t.loading}
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-4 text-center text-slate-500">
                      {t.noData}
                    </td>
                  </tr>
                ) : (
                  pagedUsers.map((user) => (
                    <tr key={user.id} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-medium text-slate-800">{user.displayName}</td>
                      <td className="px-3 py-2 text-slate-700">{user.email}</td>
                      <td className="px-3 py-2 text-slate-700">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex w-fit rounded-full border px-2 py-0.5 text-xs font-semibold ${getStatusClass(user.deletionStatus, user.isActive)}`}>
                            {getStatusLabel(locale, user.deletionStatus, user.isActive)}
                          </span>
                          {user.deletionScheduledFor ? (
                            <span className="text-[11px] text-slate-500">
                              {t.statusPendingAt}: {formatDate(user.deletionScheduledFor)}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${getKycStatusClass(user.kycStatus)}`}>
                          {getKycStatusLabel(locale, user.kycStatus)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-600">{formatDate(user.createdAt)}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void openDetails(user)}
                            disabled={savingUserId === user.id}
                            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
                          >
                            {t.detailButton}
                          </button>
                          <button
                            type="button"
                            onClick={() => void openKycView(user)}
                            disabled={savingUserId === user.id || loadingKycViewUserId === user.id || user.kycStatus !== "approved"}
                            className="rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-100 disabled:opacity-60"
                          >
                            {loadingKycViewUserId === user.id ? t.viewKycLoading : t.viewKycButton}
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(user)}
                            disabled={savingUserId === user.id}
                            className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-60"
                          >
                            {t.editButton}
                          </button>
                          <button
                            type="button"
                            onClick={() => void sendOtpToUser(user, "forgot_password")}
                            disabled={savingUserId === user.id}
                            className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-60"
                          >
                            {t.otpButton}
                          </button>
                          {needsRecover(user) ? (
                            <button
                              type="button"
                              onClick={() => void recoverUser(user)}
                              disabled={savingUserId === user.id}
                              className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
                            >
                              {t.recoverButton}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => {
                              setDeletingUserId(user.id);
                              setDeletingUser(user);
                            }}
                            disabled={savingUserId === user.id}
                            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
                          >
                            {t.deleteButton}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editingUser ? (
        <div className="fixed inset-0 z-[110] overflow-y-auto bg-slate-900/25 p-3 backdrop-blur-sm sm:p-4">
          <div className="flex min-h-full items-start justify-center py-2 sm:items-center sm:py-4">
            <div className={`flex max-h-[calc(100vh-2rem)] w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl ${isMobileMode ? "max-w-lg" : "max-w-2xl"}`}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold text-slate-900">{t.editTitle}</p>
                <p className="text-xs text-slate-500">{editingUser.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                {t.closeButton}
              </button>
            </div>

            <div className="overflow-y-auto pr-1">
              <div className={`grid gap-3 ${isMobileMode ? "grid-cols-1" : "md:grid-cols-2"}`}>
              <label className="space-y-1">
                <span className="text-xs font-semibold text-slate-600">{nameLabel}</span>
                <input
                  type="text"
                  value={editDisplayName}
                  onChange={(event) => setEditDisplayName(event.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-semibold text-slate-600">{emailLabel}</span>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(event) => setEditEmail(event.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-semibold text-slate-600">{t.phoneLabel}</span>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(event) => setEditPhone(event.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-semibold text-slate-600">{t.newPassword}</span>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(event) => setEditPassword(event.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
                <p className="text-xs text-slate-500">{t.newPasswordHint}</p>
              </label>

              <label className="space-y-1 md:col-span-2">
                <span className="text-xs font-semibold text-slate-600">{t.addressLabel}</span>
                <textarea
                  value={editAddress}
                  onChange={(event) => setEditAddress(event.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-semibold text-slate-600">{t.kycStatus}</span>
                <select
                  value={editKycStatus}
                  onChange={(event) => setEditKycStatus(event.target.value as CustomerKycStatus)}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="not_started">{getKycStatusLabel(locale, "not_started")}</option>
                  <option value="in_progress">{getKycStatusLabel(locale, "in_progress")}</option>
                  <option value="pending_review">{getKycStatusLabel(locale, "pending_review")}</option>
                  <option value="approved">{getKycStatusLabel(locale, "approved")}</option>
                  <option value="rejected">{getKycStatusLabel(locale, "rejected")}</option>
                  <option value="blocked">{getKycStatusLabel(locale, "blocked")}</option>
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-xs font-semibold text-slate-600">{t.statusReason}</span>
                <textarea
                  value={editKycRejectedReason}
                  onChange={(event) => setEditKycRejectedReason(event.target.value)}
                  rows={3}
                  disabled={editKycStatus !== "rejected"}
                  placeholder={editKycStatus === "rejected" ? t.statusReason : "-"}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                />
              </label>

              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 md:col-span-2">
                <p className="text-xs font-semibold text-slate-600">{t.status}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${getStatusClass(editingUser.deletionStatus, editingUser.isActive)}`}>
                    {getStatusLabel(locale, editingUser.deletionStatus, editingUser.isActive)}
                  </span>
                  {editingUser.deletionScheduledFor ? (
                    <span className="text-xs text-slate-500">
                      {t.statusPendingAt}: {formatDate(editingUser.deletionScheduledFor)}
                    </span>
                  ) : null}
                  {editingUser.deletionReason ? (
                    <span className="text-xs text-slate-500">
                      {t.statusReason}: {editingUser.deletionReason}
                    </span>
                  ) : null}
                  <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${getKycStatusClass(editKycStatus)}`}>
                    {getKycStatusLabel(locale, editKycStatus)}
                  </span>
                </div>
              </div>
            </div>
            </div>

            <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-3">
              {needsRecover(editingUser) ? (
                <button
                  type="button"
                  onClick={() => void recoverUser(editingUser)}
                  disabled={savingUserId === editingUser.id}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                >
                  {t.recoverButton}
                </button>
              ) : null}
              <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1">
                <span className="text-xs font-semibold text-slate-600">{t.otpPurposeLabel}</span>
                <select
                  value={editOtpPurpose}
                  onChange={(event) => setEditOtpPurpose(event.target.value as AdminOtpPurpose)}
                  className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="forgot_password">{t.otpPurposeForgot}</option>
                  <option value="change_password">{t.otpPurposeChange}</option>
                  <option value="account_delete">{t.otpPurposeDelete}</option>
                  <option value="account_recovery">{t.otpPurposeRecovery}</option>
                  <option value="other">{t.otpPurposeOther}</option>
                </select>
              </label>
              <button
                type="button"
                onClick={() => void sendOtpToUser(editingUser, editOtpPurpose)}
                disabled={savingUserId === editingUser.id}
                className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
              >
                {t.otpButton}
              </button>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                {t.closeButton}
              </button>
              <button
                type="button"
                onClick={() => void updateUser()}
                disabled={savingUserId === editingUser.id}
                className="btn-primary rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60"
              >
                {t.saveButton}
              </button>
            </div>
          </div>
        </div>
        </div>
      ) : null}

      {detailUser ? (
        <div className="fixed inset-0 z-[110] overflow-y-auto bg-slate-900/25 p-3 backdrop-blur-sm sm:p-4">
          <div className="flex min-h-full items-start justify-center py-2 sm:items-center sm:py-4">
            <div className={`flex max-h-[calc(100vh-2rem)] w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl ${isMobileMode ? "max-w-lg" : "max-w-3xl"}`}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold text-slate-900">{t.detailTitle}</p>
                <p className="text-xs text-slate-500">{detailUser.id}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDetailUser(null);
                  setDetailLogs([]);
                }}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                {t.closeButton}
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto pr-1">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs font-semibold text-slate-600">{nameLabel}</p>
                <p className="mt-1 text-sm text-slate-900">{detailUser.displayName || "-"}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs font-semibold text-slate-600">{emailLabel}</p>
                <p className="mt-1 text-sm text-slate-900 break-all">{detailUser.email || "-"}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs font-semibold text-slate-600">{t.phoneLabel}</p>
                <p className="mt-1 text-sm text-slate-900">{detailUser.phone || "-"}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs font-semibold text-slate-600">{t.status}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${getStatusClass(detailUser.deletionStatus, detailUser.isActive)}`}>
                    {getStatusLabel(locale, detailUser.deletionStatus, detailUser.isActive)}
                  </span>
                  <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${getKycStatusClass(detailUser.kycStatus)}`}>
                    {getKycStatusLabel(locale, detailUser.kycStatus)}
                  </span>
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs font-semibold text-slate-600">{t.createdAt}</p>
                <p className="mt-1 text-sm text-slate-900">{formatDate(detailUser.createdAt)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs font-semibold text-slate-600">{t.detailRequestedAt}</p>
                <p className="mt-1 text-sm text-slate-900">{formatDate(detailUser.deletionRequestedAt)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs font-semibold text-slate-600">{t.statusPendingAt}</p>
                <p className="mt-1 text-sm text-slate-900">{formatDate(detailUser.deletionScheduledFor)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs font-semibold text-slate-600">{t.kycStatus}</p>
                <p className="mt-1 text-sm text-slate-900">{getKycStatusLabel(locale, detailUser.kycStatus)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs font-semibold text-slate-600">{t.detailRecoveredAt}</p>
                <p className="mt-1 text-sm text-slate-900">{formatDate(detailUser.recoveredAt)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs font-semibold text-slate-600">{t.kycApprovedAt}</p>
                <p className="mt-1 text-sm text-slate-900">{formatDate(detailUser.kycApprovedAt)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 md:col-span-2">
                <p className="text-xs font-semibold text-slate-600">{t.addressLabel}</p>
                <p className="mt-1 text-sm text-slate-900 whitespace-pre-wrap">{detailUser.address || "-"}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 md:col-span-2">
                <p className="text-xs font-semibold text-slate-600">{t.kycRejectedReasonLabel}</p>
                <p className="mt-1 text-sm text-slate-900 whitespace-pre-wrap">{detailUser.kycRejectedReason || "-"}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 md:col-span-2">
                <p className="text-xs font-semibold text-slate-600">{t.statusReason}</p>
                <p className="mt-1 text-sm text-slate-900 whitespace-pre-wrap">{detailUser.deletionReason || "-"}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1">
                <span className="text-xs font-semibold text-slate-600">{t.otpPurposeLabel}</span>
                <select
                  value={editOtpPurpose}
                  onChange={(event) => setEditOtpPurpose(event.target.value as AdminOtpPurpose)}
                  className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="forgot_password">{t.otpPurposeForgot}</option>
                  <option value="change_password">{t.otpPurposeChange}</option>
                  <option value="account_delete">{t.otpPurposeDelete}</option>
                  <option value="account_recovery">{t.otpPurposeRecovery}</option>
                  <option value="other">{t.otpPurposeOther}</option>
                </select>
              </label>
              <button
                type="button"
                onClick={() => void sendOtpToUser(detailUser, editOtpPurpose)}
                disabled={savingUserId === detailUser.id}
                className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
              >
                {t.otpButton}
              </button>
              <button
                type="button"
                onClick={() => void openKycView(detailUser)}
                disabled={savingUserId === detailUser.id || loadingKycViewUserId === detailUser.id || detailUser.kycStatus !== "approved"}
                className="rounded-lg border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-700 hover:bg-cyan-100 disabled:opacity-60"
              >
                {loadingKycViewUserId === detailUser.id ? t.viewKycLoading : t.viewKycButton}
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200">
              <div className="border-b border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs font-semibold text-slate-700">{t.detailLogTitle}</p>
              </div>
              <div className="max-h-56 overflow-y-auto p-2">
                {loadingDetailLogs ? (
                  <p className="px-2 py-3 text-sm text-slate-500">{t.detailLogLoading}</p>
                ) : detailLogs.length === 0 ? (
                  <p className="px-2 py-3 text-sm text-slate-500">{t.detailLogEmpty}</p>
                ) : (
                  <div className="space-y-2">
                    {detailLogs.map((log) => (
                      <article key={log.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-slate-900">{toActionLabel(locale, log.action)}</p>
                          <p className="text-[11px] text-slate-500">{formatDate(log.createdAt)}</p>
                        </div>
                        <p className="mt-1 text-xs text-slate-600">
                          {t.detailActor}: {log.actorUserId || "-"}
                        </p>
                        <p className="mt-1 text-xs text-slate-600">
                          {t.statusReason}: {log.reason || "-"}
                        </p>
                        {Object.keys(log.metadata).length > 0 ? (
                          <pre className="mt-2 overflow-x-auto rounded bg-slate-50 px-2 py-1 text-[11px] text-slate-600">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        ) : null}
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>
            </div>
          </div>
        </div>
        </div>
      ) : null}

      {kycPinUser ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-sm">
          <div className={`w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl ${isMobileMode ? "max-w-md" : "max-w-lg"}`}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-slate-900">{t.kycPinTitle}</p>
                <p className="text-xs text-slate-500">{kycPinUser.displayName || kycPinUser.email}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setKycPinUser(null);
                  setKycPinInput("");
                }}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                {t.closeButton}
              </button>
            </div>

            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-600">{t.kycPinLabel}</span>
              <input
                type="password"
                value={kycPinInput}
                inputMode="numeric"
                maxLength={6}
                onChange={(event) => setKycPinInput(event.target.value.replace(/\D/g, "").slice(0, 6))}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
              />
              <p className="text-xs text-slate-500">{t.kycPinHint}</p>
            </label>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setKycPinUser(null);
                  setKycPinInput("");
                }}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                {t.closeButton}
              </button>
              <button
                type="button"
                onClick={() => void submitKycPin()}
                disabled={submittingKycPin}
                className="rounded-lg border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-700 hover:bg-cyan-100 disabled:opacity-60"
              >
                {submittingKycPin ? t.viewKycLoading : t.kycPinSubmit}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {kycViewData ? (
        <div className="fixed inset-0 z-[120] overflow-y-auto bg-slate-900/35 p-3 backdrop-blur-sm sm:p-4">
          <div className="flex min-h-full items-start justify-center py-2 sm:items-center sm:py-4">
            <div className={`w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl ${isMobileMode ? "max-w-lg" : "max-w-3xl"}`}>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold text-slate-900">{t.kycModalTitle}</p>
                  <p className="text-xs text-slate-500">{kycViewData.customerId}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setKycViewData(null)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {t.closeButton}
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-xs font-semibold text-slate-600">{nameLabel}</p>
                  <p className="mt-1 text-sm text-slate-900">{kycViewData.displayName || "-"}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-xs font-semibold text-slate-600">{emailLabel}</p>
                  <p className="mt-1 break-all text-sm text-slate-900">{kycViewData.email || "-"}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-xs font-semibold text-slate-600">{t.phoneLabel}</p>
                  <p className="mt-1 text-sm text-slate-900">{kycViewData.phone || "-"}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-xs font-semibold text-slate-600">{t.kycStatus}</p>
                  <div className="mt-1">
                    <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${getKycStatusClass(normalizeKycStatus(kycViewData.kycStatus))}`}>
                      {getKycStatusLabel(locale, normalizeKycStatus(kycViewData.kycStatus))}
                    </span>
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-xs font-semibold text-slate-600">{t.kycApprovedAt}</p>
                  <p className="mt-1 text-sm text-slate-900">{formatDate(kycViewData.kycApprovedAt)}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-xs font-semibold text-slate-600">{t.kycProvider}</p>
                  <p className="mt-1 text-sm text-slate-900">{kycViewData.provider || "-"}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-xs font-semibold text-slate-600">{t.kycFaceCapturedAt}</p>
                  <p className="mt-1 text-sm text-slate-900">{formatDate(kycViewData.faceCapturedAt)}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 md:col-span-2">
                  <p className="text-xs font-semibold text-slate-600">{t.kycRejectedReasonLabel}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-900">{kycViewData.kycRejectedReason || "-"}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 md:col-span-2">
                  <p className="text-xs font-semibold text-slate-600">{t.kycFaceImage}</p>
                  {kycViewData.faceImageSignedUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={kycViewData.faceImageSignedUrl}
                      alt={`kyc-face-${kycViewData.customerId}`}
                      className="mt-2 max-h-96 w-auto rounded-lg border border-slate-200 object-contain"
                    />
                  ) : (
                    <p className="mt-1 text-sm text-slate-900">{t.kycNoFaceImage}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmModal
        open={Boolean(deletingUserId)}
        title={t.confirmDeleteTitle}
        message={t.confirmDeleteMessage}
        confirmText={t.deleteButton}
        cancelText={t.closeButton}
        onCancel={() => {
          setDeletingUserId(null);
          setDeletingUser(null);
        }}
        onConfirm={() => {
          if (!deletingUser) {
            return;
          }
          void deleteUser(deletingUser);
        }}
      />
    </li>
  );
}
