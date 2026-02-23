import { getAdminActor } from "../../../../lib/auth/admin";
import { getAdminSettings } from "../../../../lib/db/admin-settings";
import { getAdminLocale } from "../../../../lib/i18n/admin";
import { getDefaultAdminSettings } from "../../../../lib/types/admin-settings";
import SettingsClient from "../../../components/admin/settings/SettingsClient";

export default async function AdminSettingsPage() {
  const locale = await getAdminLocale();
  const actor = await getAdminActor();
  const isDeveloperMode = actor?.role === "admin";
  let initialSettings = getDefaultAdminSettings();
  let bootstrapError: string | null = null;

  try {
    initialSettings = await getAdminSettings();
  } catch (error) {
    bootstrapError = error instanceof Error ? error.message : "Failed to load settings";
  }

  const text = {
    section: locale === "th" ? "ตั้งค่า" : "Settings",
    title: locale === "th" ? "ตั้งค่าระบบ" : "System Settings",
    subtitle:
      locale === "th"
        ? "เลือกเมนูลัดด้านซ้ายเพื่อเข้าไปตั้งค่าแต่ละหัวข้ออย่างรวดเร็ว"
        : "Use the quick menu on the left to jump into each settings section.",
    save: locale === "th" ? "บันทึกการตั้งค่า" : "Save Settings",
    quickMenu: locale === "th" ? "เมนูลัด" : "Quick Menu",
    display: locale === "th" ? "การแสดงผล" : "Display",
    profile: locale === "th" ? "โปรไฟล์ผู้ดูแล" : "Admin Profile",
    store: locale === "th" ? "ข้อมูลร้านค้า" : "Store Information",
    security: locale === "th" ? "ความปลอดภัย" : "Security",
    notify: locale === "th" ? "การแจ้งเตือน" : "Notifications",
    configure: locale === "th" ? "ตั้งค่า" : "Configure",
    displayName: locale === "th" ? "ชื่อผู้ดูแล" : "Display Name",
    email: locale === "th" ? "อีเมลติดต่อ" : "Contact Email",
    language: locale === "th" ? "ภาษาเริ่มต้น" : "Default Language",
    storeName: locale === "th" ? "ชื่อร้าน" : "Store Name",
    supportPhone: locale === "th" ? "เบอร์ซัพพอร์ต" : "Support Phone",
    currency: locale === "th" ? "สกุลเงิน" : "Currency",
    twoFa: locale === "th" ? "เปิดใช้ 2FA" : "Enable 2FA",
    session: locale === "th" ? "นโยบาย Session" : "Session Policy",
    emailNotify: locale === "th" ? "แจ้งเตือนผ่านอีเมล" : "Email Notifications",
    pushNotify: locale === "th" ? "แจ้งเตือนบนเบราว์เซอร์" : "Browser Notifications",
    orderNotify: locale === "th" ? "แจ้งเตือนคำสั่งซื้อใหม่" : "New Order Alerts",
    enabled: locale === "th" ? "เปิดใช้งาน" : "Enabled",
    disabled: locale === "th" ? "ปิดใช้งาน" : "Disabled",
    every7days: locale === "th" ? "หมดอายุทุก 7 วัน" : "Expire every 7 days",
    uiMode: locale === "th" ? "โหมด UI" : "UI Mode",
    uiAuto: locale === "th" ? "อัตโนมัติ" : "Auto",
    uiWindows: locale === "th" ? "Windows" : "Windows",
    uiMobile: locale === "th" ? "Mobile" : "Mobile",
    themePreset: locale === "th" ? "ธีมสีพื้นหลัง" : "Theme Preset",
    themePresetHint:
      locale === "th" ? "เลือกโทนสีพื้นหลังของระบบ" : "Choose a background color theme for the app.",
    themeDefault: locale === "th" ? "ค่าเริ่มต้น" : "Default",
    themeOcean: locale === "th" ? "น้ำทะเล" : "Ocean",
    themeMint: locale === "th" ? "มิ้นต์" : "Mint",
    themeSunset: locale === "th" ? "ซันเซ็ต" : "Sunset",
    createUser: locale === "th" ? "สร้าง user" : "Create User",
    createUserTitle: locale === "th" ? "สร้างผู้ใช้ใหม่" : "Create a New User",
    createUserSubtitle:
      locale === "th"
        ? "ระบบจะสร้างบัญชีใน Supabase Auth และกำหนด role ใน profiles"
        : "Creates account in Supabase Auth and sets role in profiles.",
    createUserName: locale === "th" ? "ชื่อผู้ใช้" : "Display Name",
    createUserEmail: locale === "th" ? "อีเมล" : "Email",
    createUserPassword: locale === "th" ? "รหัสผ่าน" : "Password",
    createUserPasswordHint:
      locale === "th" ? "อย่างน้อย 6 ตัวอักษร" : "At least 6 characters.",
    createUserRole: locale === "th" ? "สิทธิ์การใช้งาน" : "Role",
    createUserRoleAdmin: locale === "th" ? "แอดมิน" : "Admin",
    createUserRoleStaff: locale === "th" ? "พนักงาน" : "Staff",
    createUserRoleDeveloper: locale === "th" ? "นักพัฒนา" : "Developer",
    createUserRoleCustomer: locale === "th" ? "ลูกค้า" : "Customer",
    developerPin: locale === "th" ? "รหัส PIN นักพัฒนา" : "Developer PIN",
    developerPinHint:
      locale === "th"
        ? "ใช้ยืนยันก่อนสร้าง/แก้ไข/ลบผู้ใช้สิทธิ์นักพัฒนา"
        : "Required to create, edit, or delete developer users.",
    createUserSubmit: locale === "th" ? "สร้างผู้ใช้" : "Create User",
    createUserSubmitting: locale === "th" ? "กำลังสร้าง..." : "Creating...",
    createUserSuccess: locale === "th" ? "สร้างผู้ใช้สำเร็จ" : "User created successfully.",
    createUserFailed: locale === "th" ? "สร้างผู้ใช้ไม่สำเร็จ" : "Failed to create user.",
    apiHealth: locale === "th" ? "สถานะระบบ API" : "API Health",
    apiHealthHint:
      locale === "th"
        ? "ตรวจสอบการเชื่อมต่อ API, ฐานข้อมูล และ Storage แบบเรียลไทม์"
        : "Live status for API, database, and storage connectivity.",
    apiHealthRefresh: locale === "th" ? "รีเฟรช" : "Refresh",
    apiHealthChecking: locale === "th" ? "กำลังตรวจสอบ..." : "Checking...",
    apiHealthUp: locale === "th" ? "ปกติ" : "Healthy",
    apiHealthDown: locale === "th" ? "มีปัญหา" : "Issue",
    apiHealthApi: locale === "th" ? "API" : "API",
    apiHealthDb: locale === "th" ? "ฐานข้อมูล" : "Database",
    apiHealthStorage: locale === "th" ? "สตอเรจ" : "Storage",
    apiHealthLastChecked: locale === "th" ? "ตรวจล่าสุด" : "Last checked",
    apiHealthUnavailable: locale === "th" ? "ไม่สามารถตรวจสอบได้" : "Unavailable",
  };

  return (
    <SettingsClient
      locale={locale}
      text={text}
      initialSettings={initialSettings}
      bootstrapError={bootstrapError}
      isDeveloperMode={isDeveloperMode}
    />
  );
}




