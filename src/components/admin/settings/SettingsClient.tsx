"use client";

import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { AdminSettingField, AdminSettings, SessionPolicy } from "../../../../lib/types/admin-settings";
import { ConfirmModal } from "../ConfirmModal";
import { Toast } from "../Toast";

type SettingsText = {
  section: string;
  title: string;
  subtitle: string;
  save: string;
  quickMenu: string;
  profile: string;
  store: string;
  security: string;
  notify: string;
  configure: string;
  displayName: string;
  email: string;
  language: string;
  storeName: string;
  supportPhone: string;
  currency: string;
  twoFa: string;
  session: string;
  emailNotify: string;
  pushNotify: string;
  orderNotify: string;
  enabled: string;
  disabled: string;
  every7days: string;
  display: string;
  uiMode: string;
  uiAuto: string;
  uiWindows: string;
  uiMobile: string;
  createUser: string;
  createUserTitle: string;
  createUserSubtitle: string;
  createUserName: string;
  createUserEmail: string;
  createUserPassword: string;
  createUserPasswordHint: string;
  createUserRole: string;
  createUserRoleAdmin: string;
  createUserRoleStaff: string;
  createUserSubmit: string;
  createUserSubmitting: string;
  createUserSuccess: string;
  createUserFailed: string;
};

type SectionId = "display" | "store" | "security" | "notify" | "users";
type SettingsSection = {
  id: SectionId;
  title: string;
  subtitle: string;
  iconTone: string;
  iconColor: string;
  items: Array<{ id: "createUser" | AdminSettingField | "localeSwitch"; label: string }>;
};

type Option = { value: string; label: string };
type UserRole = "admin" | "staff";
type AdminUserRecord = {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: string | null;
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

function isAbortError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }
  return error.name === "AbortError" || error.message.toLowerCase().includes("aborted");
}

function toRequestErrorMessage(error: unknown, fallback: string, locale: "th" | "en") {
  if (isAbortError(error)) {
    return locale === "th"
      ? "การเชื่อมต่อใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง"
      : "The request took too long. Please try again.";
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

export default function SettingsClient({
  locale,
  text,
  initialSettings,
  bootstrapError,
}: {
  locale: "th" | "en";
  text: SettingsText;
  initialSettings: AdminSettings;
  bootstrapError: string | null;
}) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<SectionId>("display");
  const [editingField, setEditingField] = useState<AdminSettingField | null>(null);
  const [draftValue, setDraftValue] = useState("");
  const [savingField, setSavingField] = useState<AdminSettingField | null>(null);
  const [values, setValues] = useState<AdminSettings>(initialSettings);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [mobileSectionOpen, setMobileSectionOpen] = useState(false);
  const handleUserSuccess = useCallback((message: string) => {
    setToast({ type: "success", message });
  }, []);
  const handleUserError = useCallback((message: string) => {
    setToast({ type: "error", message });
  }, []);

  const saveLabel = locale === "th" ? "บันทึก" : "Save";
  const cancelLabel = locale === "th" ? "ยกเลิก" : "Cancel";
  const closeLabel = locale === "th" ? "ปิด" : "Close";
  const savedMessage = locale === "th" ? "บันทึกข้อมูลแล้ว" : "Settings saved";
  const saveFailedMessage = locale === "th" ? "บันทึกไม่สำเร็จ" : "Save failed";

  useEffect(() => {
    if (!bootstrapError) {
      return;
    }
    setToast({ type: "error", message: bootstrapError });
  }, [bootstrapError]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const checkViewport = () => {
      setIsMobileViewport(window.matchMedia("(max-width: 1023px)").matches);
    };
    checkViewport();
    window.addEventListener("resize", checkViewport);
    return () => window.removeEventListener("resize", checkViewport);
  }, []);

  useEffect(() => {
    if (!(isMobileViewport || values.uiMode === "mobile")) {
      setMobileSectionOpen(false);
    }
  }, [isMobileViewport, values.uiMode]);

  const sections = useMemo<SettingsSection[]>(
    () => [
      {
        id: "users",
        title: text.createUser,
        subtitle:
          locale === "th" ? "จัดการบัญชีทีมงานและสิทธิ์การใช้งาน" : "Manage team accounts and roles",
        iconTone: "bg-blue-100",
        iconColor: "text-blue-700",
        items: [{ id: "createUser", label: text.createUser }],
      },
      {
        id: "display",
        title: text.display,
        subtitle: locale === "th" ? "ภาษาและรูปแบบการแสดงผลระบบ" : "Language and interface style",
        iconTone: "bg-indigo-100",
        iconColor: "text-indigo-700",
        items: [
          { id: "uiMode", label: text.uiMode },
          { id: "localeSwitch", label: text.language },
        ],
      },
      {
        id: "store",
        title: text.store,
        subtitle: locale === "th" ? "ข้อมูลหลักร้านและสกุลเงิน" : "Store profile and currency",
        iconTone: "bg-emerald-100",
        iconColor: "text-emerald-700",
        items: [
          { id: "storeName", label: text.storeName },
          { id: "supportPhone", label: text.supportPhone },
          { id: "currency", label: text.currency },
        ],
      },
      {
        id: "security",
        title: text.security,
        subtitle: locale === "th" ? "นโยบายความปลอดภัยและเซสชัน" : "Security policy and sessions",
        iconTone: "bg-violet-100",
        iconColor: "text-violet-700",
        items: [
          { id: "twoFa", label: text.twoFa },
          { id: "sessionPolicy", label: text.session },
        ],
      },
      {
        id: "notify",
        title: text.notify,
        subtitle: locale === "th" ? "ตั้งค่าการแจ้งเตือนทุกช่องทาง" : "Manage all notification channels",
        iconTone: "bg-amber-100",
        iconColor: "text-amber-700",
        items: [
          { id: "emailNotify", label: text.emailNotify },
          { id: "pushNotify", label: text.pushNotify },
          { id: "orderNotify", label: text.orderNotify },
        ],
      },
    ],
    [locale, text],
  );

  const currentSection = sections.find((section) => section.id === activeSection) ?? sections[0];
  const popupMode = isMobileViewport || values.uiMode === "mobile";

  const handleSwitchSection = (sectionId: SectionId) => {
    setActiveSection(sectionId);
    setEditingField(null);
    setDraftValue("");
    if (popupMode) {
      setMobileSectionOpen(true);
    }
  };

  const startEditing = (fieldId: AdminSettingField) => {
    setEditingField(fieldId);
    setDraftValue(toDraftValue(fieldId, values[fieldId]));
  };

  const cancelEditing = () => {
    setEditingField(null);
    setDraftValue("");
  };

  const commitField = async (field: AdminSettingField, value: string) => {
    const parsed = parseDraftValue(field, value);
    if (!parsed.ok) {
      setToast({ type: "error", message: parsed.message });
      return;
    }

    setSavingField(field);
    try {
      const response = await fetchWithTimeout("/api/admin/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          field,
          value: parsed.value,
        }),
      });

      const result = (await response.json()) as { error?: string; settings?: AdminSettings };
      if (!response.ok || !result.settings) {
        throw new Error(result.error || saveFailedMessage);
      }

      setValues(result.settings);
      setEditingField(null);
      setDraftValue("");
      setToast({ type: "success", message: savedMessage });
      router.refresh();
    } catch (error) {
      const message = toRequestErrorMessage(error, saveFailedMessage, locale);
      setToast({ type: "error", message });
    } finally {
      setSavingField(null);
    }
  };

  const saveField = async () => {
    if (!editingField) {
      return;
    }
    await commitField(editingField, draftValue);
  };

  const renderCurrentSectionItems = () =>
    currentSection.items.map((item) =>
      item.id === "createUser" ? (
        <CreateUserSettingItem
          key={item.id}
          text={text}
          locale={locale}
          isMobileMode={popupMode}
          onSuccess={handleUserSuccess}
          onError={handleUserError}
        />
      ) : item.id === "uiMode" ? (
        <UiModeSettingItem
          key={item.id}
          label={item.label}
          value={values.uiMode}
          text={text}
          locale={locale}
          isSaving={savingField === item.id}
          onChange={async (nextMode) => {
            await commitField("uiMode", nextMode);
          }}
        />
      ) : item.id === "localeSwitch" ? (
        <LocaleSwitchSettingItem
          key={item.id}
          label={item.label}
          locale={locale}
          onChanged={() => {
            router.refresh();
          }}
        />
      ) : (
        <SettingsItem
          key={item.id}
          fieldId={item.id as AdminSettingField}
          label={item.label}
          value={toDisplayValue(item.id as AdminSettingField, values, locale, text)}
          action={text.configure}
          saveLabel={saveLabel}
          cancelLabel={cancelLabel}
          isEditing={editingField === (item.id as AdminSettingField)}
          isSaving={savingField === (item.id as AdminSettingField)}
          draftValue={draftValue}
          onDraftChange={setDraftValue}
          onStartEdit={() => startEditing(item.id as AdminSettingField)}
          onSave={saveField}
          onCancel={cancelEditing}
          options={getFieldOptions(item.id as AdminSettingField, locale, text)}
        />
      ),
    );

  return (
    <div className="space-y-5">
      <section className="space-y-4">
        <aside className="settings-quicknav sst-card-soft rounded-2xl p-4 sm:p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{text.quickMenu}</p>
          <div className={popupMode ? "grid grid-cols-1 gap-3" : "grid grid-cols-2 gap-3 md:grid-cols-3"}>
            {sections.map((section, index) => {
              const isActive = section.id === activeSection;
              const isLastOddCard = !popupMode && sections.length % 2 === 1 && index === sections.length - 1;
              return (
                <button
                  key={`card-${section.id}`}
                  type="button"
                  onClick={() => handleSwitchSection(section.id)}
                  className={[
                    "group rounded-2xl border bg-white p-4 text-left transition-all duration-200",
                    isLastOddCard ? "col-span-2 md:col-span-1" : "",
                    "hover:-translate-y-0.5 hover:shadow-md",
                    isActive
                      ? "border-blue-200 ring-2 ring-blue-100 shadow-md"
                      : "border-slate-200 hover:border-blue-200",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={[
                        "inline-flex h-10 w-10 items-center justify-center rounded-xl",
                        section.iconTone,
                        section.iconColor,
                      ].join(" ")}
                    >
                      <SectionGlyph id={section.id} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{section.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500 max-lg:line-clamp-3">{section.subtitle}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>
        {!popupMode ? <SettingsSection title={currentSection.title}>{renderCurrentSectionItems()}</SettingsSection> : null}
      </section>

      {popupMode && mobileSectionOpen ? (
        <div className="fixed inset-0 z-[120] flex items-end bg-slate-900/35 p-2 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4">
          <div className="max-h-[92vh] w-full overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-w-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <p className="text-base font-semibold text-slate-900">{currentSection.title}</p>
              <button
                type="button"
                onClick={() => setMobileSectionOpen(false)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                {closeLabel}
              </button>
            </div>
            <div className="max-h-[calc(92vh-60px)] overflow-y-auto p-3 sm:p-4">
              <SettingsSection title={currentSection.title} plain hideTitle>
                {renderCurrentSectionItems()}
              </SettingsSection>
            </div>
          </div>
        </div>
      ) : null}

      <Toast
        open={Boolean(toast)}
        type={toast?.type ?? "success"}
        message={toast?.message ?? ""}
        onClose={() => setToast(null)}
      />
    </div>
  );
}

function SettingsSection({
  title,
  children,
  plain = false,
  hideTitle = false,
}: {
  title: string;
  children: ReactNode;
  plain?: boolean;
  hideTitle?: boolean;
}) {
  if (plain) {
    return (
      <section className="space-y-3">
        {!hideTitle ? <h2 className="text-lg font-semibold text-slate-900">{title}</h2> : null}
        <ul className="rounded-xl border border-slate-200 bg-white">{children}</ul>
      </section>
    );
  }

  return (
    <article className="sst-card-soft rounded-2xl p-5">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <ul className="mt-4 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">{children}</ul>
    </article>
  );
}

function SectionGlyph({ id }: { id: SectionId }) {
  if (id === "users") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M16 19a4 4 0 0 0-8 0" />
        <circle cx="12" cy="9" r="3.2" />
        <path d="M20.5 18a3.4 3.4 0 0 0-2.8-3.3" />
        <path d="M17.4 5.5a3.2 3.2 0 0 1 0 6.3" />
      </svg>
    );
  }

  if (id === "display") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3.5" y="4.5" width="17" height="11" rx="2.5" />
        <path d="M9 19.5h6" />
        <path d="M12 15.5v4" />
      </svg>
    );
  }

  if (id === "store") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 10.5h16v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8Z" />
        <path d="M3.5 10.5 5.3 4h13.4l1.8 6.5" />
        <path d="M8.5 13.5h7" />
      </svg>
    );
  }

  if (id === "security") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 3.5 5 6.5v5.4c0 4.2 2.8 8 7 9.6 4.2-1.6 7-5.4 7-9.6V6.5l-7-3Z" />
        <rect x="9.1" y="10.2" width="5.8" height="4.8" rx="1" />
        <path d="M10 10.2V9a2 2 0 1 1 4 0v1.2" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M18 8a3 3 0 0 1-3 3h-1.2L12 13l-1.8-2H9a3 3 0 0 1 0-6h6a3 3 0 0 1 3 3Z" />
      <path d="M6 12.5a3 3 0 0 0 3 3h1.2L12 18l1.8-2.5H15a3 3 0 1 0 0-6" />
    </svg>
  );
}

function UiModeSettingItem({
  label,
  value,
  text,
  locale,
  isSaving,
  onChange,
}: {
  label: string;
  value: "auto" | "windows" | "mobile";
  text: SettingsText;
  locale: "th" | "en";
  isSaving: boolean;
  onChange: (nextMode: "auto" | "windows" | "mobile") => Promise<void>;
}) {
  return (
    <li className="flex flex-col gap-3 px-4 py-4">
      <p className="text-sm font-semibold text-slate-800">{label}</p>
      <div className="inline-flex w-fit items-center gap-1 rounded-full border border-cyan-200 bg-white p-1.5 shadow-sm">
        <UiModeButton label={text.uiAuto} active={value === "auto"} onClick={() => onChange("auto")} disabled={isSaving} />
        <UiModeButton
          label={text.uiWindows}
          active={value === "windows"}
          onClick={() => onChange("windows")}
          disabled={isSaving}
        />
        <UiModeButton
          label={text.uiMobile}
          active={value === "mobile"}
          onClick={() => onChange("mobile")}
          disabled={isSaving}
        />
      </div>
      <p className="text-xs text-slate-500">{getUiModeHint(locale, value)}</p>
    </li>
  );
}

function UiModeButton({
  label,
  active,
  onClick,
  disabled,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
        active ? "bg-slate-900 text-white shadow-sm" : "text-slate-700 hover:bg-slate-50"
      } disabled:opacity-60`}
    >
      {label}
    </button>
  );
}

function LocaleSwitchSettingItem({
  label,
  locale,
  onChanged,
}: {
  label: string;
  locale: "th" | "en";
  onChanged: () => void;
}) {
  const [saving, setSaving] = useState(false);

  const changeLocale = async (next: "th" | "en") => {
    if (next === locale) {
      return;
    }
    setSaving(true);
    try {
      await fetchWithTimeout("/api/admin/locale", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ locale: next }),
      });
      onChanged();
    } finally {
      setSaving(false);
    }
  };

  return (
    <li className="flex flex-col gap-3 px-4 py-4">
      <p className="text-sm font-semibold text-slate-800">{label}</p>
      <div className="inline-flex w-fit items-center gap-1 rounded-full border border-cyan-200 bg-white p-1.5 shadow-sm">
        <UiModeButton
          label={locale === "th" ? "ไทย" : "Thai"}
          active={locale === "th"}
          onClick={() => void changeLocale("th")}
          disabled={saving}
        />
        <UiModeButton
          label={locale === "th" ? "อังกฤษ" : "English"}
          active={locale === "en"}
          onClick={() => void changeLocale("en")}
          disabled={saving}
        />
      </div>
    </li>
  );
}

function getUiModeHint(locale: "th" | "en", mode: "auto" | "windows" | "mobile") {
  if (mode === "auto") {
    return locale === "th"
      ? "ระบบจะเลือกธีมที่เหมาะกับอุปกรณ์ให้อัตโนมัติ"
      : "Theme is selected automatically based on the device.";
  }
  if (mode === "windows") {
    return locale === "th"
      ? "บังคับใช้เลย์เอาต์แบบเดสก์ท็อป/Windows"
      : "Force desktop/Windows style layout.";
  }
  return locale === "th" ? "บังคับใช้เลย์เอาต์แบบแอปมือถือ" : "Force modern mobile app layout.";
}

function SettingsItem({
  fieldId,
  label,
  value,
  action,
  saveLabel,
  cancelLabel,
  isEditing,
  isSaving,
  draftValue,
  onDraftChange,
  onStartEdit,
  onSave,
  onCancel,
  options,
}: {
  fieldId: AdminSettingField;
  label: string;
  value: string;
  action: string;
  saveLabel: string;
  cancelLabel: string;
  isEditing: boolean;
  isSaving: boolean;
  draftValue: string;
  onDraftChange: (value: string) => void;
  onStartEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  options: Option[] | null;
}) {
  const inputId = `setting-${fieldId}`;
  const inputType = fieldId === "email" ? "email" : fieldId === "supportPhone" ? "tel" : "text";

  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        {isEditing ? (
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
            {options ? (
              <select
                id={inputId}
                value={draftValue}
                onChange={(event) => onDraftChange(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                {options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={inputId}
                type={inputType}
                value={draftValue}
                onChange={(event) => onDraftChange(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onSave}
                disabled={isSaving}
                className="btn-primary whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
              >
                {isSaving ? "..." : saveLabel}
              </button>
              <button
                type="button"
                onClick={onCancel}
                disabled={isSaving}
                className="whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                {cancelLabel}
              </button>
            </div>
          </div>
        ) : (
          <p className="truncate text-sm text-slate-600">{value}</p>
        )}
      </div>
      {!isEditing ? (
        <button
          type="button"
          onClick={onStartEdit}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          {action}
        </button>
      ) : null}
    </li>
  );
}

function CreateUserSettingItem({
  text,
  locale,
  isMobileMode,
  onSuccess,
  onError,
}: {
  text: SettingsText;
  locale: "th" | "en";
  isMobileMode: boolean;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}) {
  const t = {
    listTitle: locale === "th" ? "รายการผู้ใช้" : "User List",
    noData: locale === "th" ? "ยังไม่มีผู้ใช้ในระบบ" : "No users found.",
    createButton: locale === "th" ? "สร้าง user" : "Create User",
    editButton: locale === "th" ? "แก้ไข" : "Edit",
    saveButton: locale === "th" ? "บันทึก" : "Save",
    deleteButton: locale === "th" ? "ลบ" : "Delete",
    closeButton: locale === "th" ? "ปิด" : "Close",
    loading: locale === "th" ? "กำลังโหลด..." : "Loading...",
    createdAt: locale === "th" ? "สร้างเมื่อ" : "Created At",
    action: locale === "th" ? "จัดการ" : "Actions",
    updateSuccess: locale === "th" ? "อัปเดตผู้ใช้สำเร็จ" : "User updated successfully.",
    updateFailed: locale === "th" ? "อัปเดตผู้ใช้ไม่สำเร็จ" : "Failed to update user.",
    deleteSuccess: locale === "th" ? "ลบผู้ใช้สำเร็จ" : "User deleted successfully.",
    deleteFailed: locale === "th" ? "ลบผู้ใช้ไม่สำเร็จ" : "Failed to delete user.",
    confirmDeleteTitle: locale === "th" ? "ยืนยันการลบผู้ใช้" : "Confirm Delete User",
    confirmDeleteMessage: locale === "th" ? "คุณต้องการลบผู้ใช้นี้ใช่หรือไม่" : "Are you sure you want to delete this user?",
    roleAdmin: text.createUserRoleAdmin,
    roleStaff: text.createUserRoleStaff,
    editTitle: locale === "th" ? "แก้ไขผู้ใช้" : "Edit User",
    newPassword: locale === "th" ? "รหัสผ่านใหม่" : "New Password",
    newPasswordHint:
      locale === "th" ? "เว้นว่างไว้หากไม่ต้องการเปลี่ยนรหัสผ่าน" : "Leave blank to keep current password.",
  };
  const refreshFailedText = locale === "th" ? "โหลดรายการผู้ใช้ไม่สำเร็จ" : "Failed to load users.";

  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [creatingOpen, setCreatingOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUserRecord | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("staff");
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<UserRole>("staff");
  const [editPassword, setEditPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const response = await fetchWithTimeout("/api/admin/users", { method: "GET" }, 20000);
      const result = (await response.json()) as { error?: string; users?: AdminUserRecord[] };
      if (!response.ok || !result.users) {
        throw new Error(result.error || refreshFailedText);
      }
      setUsers(result.users);
    } catch (error) {
      const message = toRequestErrorMessage(error, refreshFailedText, locale);
      onError(message);
    } finally {
      setLoadingUsers(false);
    }
  }, [locale, onError, refreshFailedText]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const submit = async () => {
    if (!displayName.trim() || !email.trim() || !password.trim()) {
      onError(locale === "th" ? "กรอกข้อมูลให้ครบก่อนบันทึก" : "Please complete all fields.");
      return;
    }
    if (password.trim().length < 6) {
      onError(locale === "th" ? "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" : "Password must be at least 6 characters.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetchWithTimeout("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          displayName: displayName.trim(),
          email: email.trim(),
          password: password.trim(),
          role,
        }),
      });

      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error || text.createUserFailed);
      }

      setDisplayName("");
      setEmail("");
      setPassword("");
      setRole("staff");
      setCreatingOpen(false);
      await loadUsers();
      onSuccess(text.createUserSuccess);
    } catch (error) {
      const message = toRequestErrorMessage(error, text.createUserFailed, locale);
      onError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const openEditUser = (user: AdminUserRecord) => {
    setEditingUser(user);
    setEditDisplayName(user.displayName);
    setEditEmail(user.email);
    setEditRole(user.role);
    setEditPassword("");
  };

  const updateUser = async () => {
    if (!editingUser) {
      return;
    }
    if (!editDisplayName.trim() || !editEmail.trim()) {
      onError(locale === "th" ? "กรอกข้อมูลให้ครบก่อนบันทึก" : "Please complete all fields.");
      return;
    }
    if (editPassword.trim() && editPassword.trim().length < 6) {
      onError(locale === "th" ? "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" : "Password must be at least 6 characters.");
      return;
    }

    const userId = editingUser.id;
    setSavingUserId(userId);
    try {
      const response = await fetchWithTimeout("/api/admin/users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          role: editRole,
          displayName: editDisplayName.trim(),
          email: editEmail.trim(),
          password: editPassword.trim() || undefined,
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error || t.updateFailed);
      }
      setEditingUser(null);
      await loadUsers();
      onSuccess(t.updateSuccess);
    } catch (error) {
      const message = toRequestErrorMessage(error, t.updateFailed, locale);
      onError(message);
    } finally {
      setSavingUserId(null);
    }
  };

  const deleteUser = async (userId: string) => {
    setSavingUserId(userId);
    try {
      const response = await fetchWithTimeout("/api/admin/users", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error || t.deleteFailed);
      }
      setDeletingUserId(null);
      await loadUsers();
      onSuccess(t.deleteSuccess);
    } catch (error) {
      const message = toRequestErrorMessage(error, t.deleteFailed, locale);
      onError(message);
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

  return (
    <li className="px-4 py-4">
      <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">{t.listTitle}</p>
              <p className="text-xs text-slate-500">{text.createUserSubtitle}</p>
            </div>
            <button
              type="button"
              onClick={() => setCreatingOpen(true)}
              className="btn-primary rounded-lg px-4 py-2 text-sm font-semibold"
            >
              {t.createButton}
            </button>
          </div>

          {isMobileMode ? (
            <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-2">
              {loadingUsers ? (
                <p className="px-2 py-4 text-center text-sm text-slate-500">{t.loading}</p>
              ) : users.length === 0 ? (
                <p className="px-2 py-4 text-center text-sm text-slate-500">{t.noData}</p>
              ) : (
                users.map((user) => (
                  <article key={user.id} className="rounded-xl border border-slate-200 p-3">
                    <p className="text-sm font-semibold text-slate-900">{user.displayName}</p>
                    <p className="mt-1 break-all text-xs text-slate-600">{user.email}</p>
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
                      <span>{user.role === "admin" ? t.roleAdmin : t.roleStaff}</span>
                      <span>{formatDate(user.createdAt)}</span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => openEditUser(user)}
                        disabled={savingUserId === user.id}
                        className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-60"
                      >
                        {t.editButton}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingUserId(user.id)}
                        disabled={savingUserId === user.id}
                        className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
                      >
                        {t.deleteButton}
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[720px] bg-white text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">{text.createUserName}</th>
                    <th className="px-3 py-2 text-left font-semibold">{text.createUserEmail}</th>
                    <th className="px-3 py-2 text-left font-semibold">{text.createUserRole}</th>
                    <th className="px-3 py-2 text-left font-semibold">{t.createdAt}</th>
                    <th className="px-3 py-2 text-left font-semibold">{t.action}</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingUsers ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-center text-slate-500">
                        {t.loading}
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-center text-slate-500">
                        {t.noData}
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} className="border-t border-slate-100">
                        <td className="px-3 py-2 font-medium text-slate-800">{user.displayName}</td>
                        <td className="px-3 py-2 text-slate-700">{user.email}</td>
                        <td className="px-3 py-2 text-slate-700">{user.role === "admin" ? t.roleAdmin : t.roleStaff}</td>
                        <td className="px-3 py-2 text-slate-600">{formatDate(user.createdAt)}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEditUser(user)}
                              disabled={savingUserId === user.id}
                              className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-60"
                            >
                              {t.editButton}
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingUserId(user.id)}
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

      {creatingOpen ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/25 p-4 backdrop-blur-sm">
          <div className={`w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl ${isMobileMode ? "max-w-lg" : "max-w-2xl"}`}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold text-slate-900">{text.createUserTitle}</p>
                <p className="text-xs text-slate-500">{text.createUserSubtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setCreatingOpen(false)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                {t.closeButton}
              </button>
            </div>

            <div className={`grid gap-3 ${isMobileMode ? "grid-cols-1" : "md:grid-cols-2"}`}>
              <label className="space-y-1">
                <span className="text-xs font-semibold text-slate-600">{text.createUserName}</span>
                <input
                  type="text"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-semibold text-slate-600">{text.createUserEmail}</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-semibold text-slate-600">{text.createUserPassword}</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
                <p className="text-xs text-slate-500">{text.createUserPasswordHint}</p>
              </label>

              <label className="space-y-1">
                <span className="text-xs font-semibold text-slate-600">{text.createUserRole}</span>
                <select
                  value={role}
                  onChange={(event) => setRole(event.target.value as UserRole)}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="staff">{text.createUserRoleStaff}</option>
                  <option value="admin">{text.createUserRoleAdmin}</option>
                </select>
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreatingOpen(false)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                {t.closeButton}
              </button>
              <button
                type="button"
                onClick={() => void submit()}
                disabled={submitting}
                className="btn-primary rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60"
              >
                {submitting ? text.createUserSubmitting : text.createUserSubmit}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editingUser ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/25 p-4 backdrop-blur-sm">
          <div className={`w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl ${isMobileMode ? "max-w-lg" : "max-w-2xl"}`}>
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

            <div className={`grid gap-3 ${isMobileMode ? "grid-cols-1" : "md:grid-cols-2"}`}>
              <label className="space-y-1">
                <span className="text-xs font-semibold text-slate-600">{text.createUserName}</span>
                <input
                  type="text"
                  value={editDisplayName}
                  onChange={(event) => setEditDisplayName(event.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-semibold text-slate-600">{text.createUserEmail}</span>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(event) => setEditEmail(event.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-semibold text-slate-600">{text.createUserRole}</span>
                <select
                  value={editRole}
                  onChange={(event) => setEditRole(event.target.value as UserRole)}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="staff">{text.createUserRoleStaff}</option>
                  <option value="admin">{text.createUserRoleAdmin}</option>
                </select>
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
            </div>

            <div className="mt-5 flex justify-end gap-2">
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
      ) : null}

      <ConfirmModal
        open={Boolean(deletingUserId)}
        title={t.confirmDeleteTitle}
        message={t.confirmDeleteMessage}
        confirmText={t.deleteButton}
        cancelText={t.closeButton}
        onCancel={() => setDeletingUserId(null)}
        onConfirm={() => {
          if (!deletingUserId) {
            return;
          }
          void deleteUser(deletingUserId);
        }}
      />
    </li>
  );
}

function toDraftValue(fieldId: AdminSettingField, value: AdminSettings[AdminSettingField]) {
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  return String(value);
}

function parseDraftValue(
  fieldId: AdminSettingField,
  draft: string,
): { ok: true; value: unknown } | { ok: false; message: string } {
  const clean = draft.trim();

  if (fieldId === "twoFa" || fieldId === "emailNotify" || fieldId === "pushNotify" || fieldId === "orderNotify") {
    if (draft === "true" || draft === "false") {
      return { ok: true, value: draft === "true" };
    }
    return { ok: false, message: "Invalid boolean value" };
  }

  if (fieldId === "language") {
    if (draft === "th" || draft === "en") {
      return { ok: true, value: draft };
    }
    return { ok: false, message: "Invalid language" };
  }

  if (fieldId === "sessionPolicy") {
    if (draft === "7d" || draft === "30d" || draft === "never") {
      return { ok: true, value: draft as SessionPolicy };
    }
    return { ok: false, message: "Invalid session policy" };
  }

  if (fieldId === "uiMode") {
    if (draft === "auto" || draft === "windows" || draft === "mobile") {
      return { ok: true, value: draft };
    }
    return { ok: false, message: "Invalid UI mode" };
  }

  if (!clean) {
    return { ok: false, message: "กรอกข้อมูลก่อนบันทึก / Please enter a value" };
  }

  return { ok: true, value: clean };
}

function getFieldOptions(fieldId: AdminSettingField, locale: "th" | "en", text: SettingsText): Option[] | null {
  if (fieldId === "language") {
    return [
      { value: "th", label: locale === "th" ? "ไทย" : "Thai" },
      { value: "en", label: locale === "th" ? "อังกฤษ" : "English" },
    ];
  }

  if (fieldId === "currency") {
    return [
      { value: "THB", label: "THB" },
      { value: "USD", label: "USD" },
      { value: "LAK", label: "LAK" },
    ];
  }

  if (fieldId === "twoFa" || fieldId === "emailNotify" || fieldId === "pushNotify" || fieldId === "orderNotify") {
    return [
      { value: "true", label: text.enabled },
      { value: "false", label: text.disabled },
    ];
  }

  if (fieldId === "sessionPolicy") {
    return [
      { value: "7d", label: text.every7days },
      { value: "30d", label: locale === "th" ? "หมดอายุทุก 30 วัน" : "Expire every 30 days" },
      { value: "never", label: locale === "th" ? "ไม่หมดอายุอัตโนมัติ" : "Never expire automatically" },
    ];
  }

  if (fieldId === "uiMode") {
    return [
      { value: "auto", label: text.uiAuto },
      { value: "windows", label: text.uiWindows },
      { value: "mobile", label: text.uiMobile },
    ];
  }

  return null;
}

function toDisplayValue(fieldId: AdminSettingField, values: AdminSettings, locale: "th" | "en", text: SettingsText) {
  const value = values[fieldId];

  if (fieldId === "language") {
    return value === "th" ? (locale === "th" ? "ไทย" : "Thai") : "English";
  }

  if (fieldId === "sessionPolicy") {
    if (value === "7d") {
      return text.every7days;
    }
    if (value === "30d") {
      return locale === "th" ? "หมดอายุทุก 30 วัน" : "Expire every 30 days";
    }
    return locale === "th" ? "ไม่หมดอายุอัตโนมัติ" : "Never expire automatically";
  }

  if (typeof value === "boolean") {
    return value ? text.enabled : text.disabled;
  }

  if (fieldId === "uiMode") {
    if (value === "windows") {
      return text.uiWindows;
    }
    if (value === "mobile") {
      return text.uiMobile;
    }
    return text.uiAuto;
  }

  return String(value);
}
