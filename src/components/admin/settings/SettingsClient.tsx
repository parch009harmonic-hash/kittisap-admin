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

type Option = { value: string; label: string };
type UserRole = "admin" | "staff";
type AdminUserRecord = {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: string | null;
};

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
  const handleUserSuccess = useCallback((message: string) => {
    setToast({ type: "success", message });
  }, []);
  const handleUserError = useCallback((message: string) => {
    setToast({ type: "error", message });
  }, []);

  const saveLabel = locale === "th" ? "บันทึก" : "Save";
  const cancelLabel = locale === "th" ? "ยกเลิก" : "Cancel";
  const savedMessage = locale === "th" ? "บันทึกข้อมูลแล้ว" : "Settings saved";
  const saveFailedMessage = locale === "th" ? "บันทึกไม่สำเร็จ" : "Save failed";

  useEffect(() => {
    if (!bootstrapError) {
      return;
    }
    setToast({ type: "error", message: bootstrapError });
  }, [bootstrapError]);

  const sections = useMemo(
    () => [
      {
        id: "users" as const,
        title: text.createUser,
        items: [{ id: "createUser" as const, label: text.createUser }],
      },
      {
        id: "display" as const,
        title: text.display,
        items: [
          { id: "uiMode" as const, label: text.uiMode },
          { id: "localeSwitch" as const, label: text.language },
        ],
      },
      {
        id: "store" as const,
        title: text.store,
        items: [
          { id: "storeName" as const, label: text.storeName },
          { id: "supportPhone" as const, label: text.supportPhone },
          { id: "currency" as const, label: text.currency },
        ],
      },
      {
        id: "security" as const,
        title: text.security,
        items: [
          { id: "twoFa" as const, label: text.twoFa },
          { id: "sessionPolicy" as const, label: text.session },
        ],
      },
      {
        id: "notify" as const,
        title: text.notify,
        items: [
          { id: "emailNotify" as const, label: text.emailNotify },
          { id: "pushNotify" as const, label: text.pushNotify },
          { id: "orderNotify" as const, label: text.orderNotify },
        ],
      },
    ],
    [text],
  );

  const currentSection = sections.find((section) => section.id === activeSection) ?? sections[0];

  const handleSwitchSection = (sectionId: SectionId) => {
    setActiveSection(sectionId);
    setEditingField(null);
    setDraftValue("");
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
      const response = await fetch("/api/admin/settings", {
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
      const message = error instanceof Error ? error.message : saveFailedMessage;
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

  return (
    <div className="space-y-5">
      <section className="space-y-4">
        <aside className="settings-quicknav sst-card-soft rounded-2xl p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{text.quickMenu}</p>
          <nav className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            {sections.map((section) => {
              const isActive = section.id === activeSection;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => handleSwitchSection(section.id)}
                  className={[
                    "shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200",
                    isActive
                      ? "border border-blue-200 bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-200"
                      : "border border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-blue-200 hover:text-blue-700 hover:shadow-sm",
                  ].join(" ")}
                >
                  {section.title}
                </button>
              );
            })}
          </nav>
        </aside>

        <SettingsSection title={currentSection.title}>
          {currentSection.items.map((item) =>
            item.id === "createUser" ? (
              <CreateUserSettingItem
                key={item.id}
                text={text}
                locale={locale}
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
          )}
        </SettingsSection>
      </section>

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
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <article className="sst-card-soft rounded-2xl p-5">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <ul className="mt-4 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">{children}</ul>
    </article>
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
      await fetch("/api/admin/locale", {
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
  onSuccess,
  onError,
}: {
  text: SettingsText;
  locale: "th" | "en";
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
      const response = await fetch("/api/admin/users", { method: "GET" });
      const result = (await response.json()) as { error?: string; users?: AdminUserRecord[] };
      if (!response.ok || !result.users) {
        throw new Error(result.error || refreshFailedText);
      }
      setUsers(result.users);
    } catch (error) {
      const message = error instanceof Error ? error.message : refreshFailedText;
      onError(message);
    } finally {
      setLoadingUsers(false);
    }
  }, [onError, refreshFailedText]);

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
      const response = await fetch("/api/admin/users", {
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
      const message = error instanceof Error ? error.message : text.createUserFailed;
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
      const response = await fetch("/api/admin/users", {
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
      const message = error instanceof Error ? error.message : t.updateFailed;
      onError(message);
    } finally {
      setSavingUserId(null);
    }
  };

  const deleteUser = async (userId: string) => {
    setSavingUserId(userId);
    try {
      const response = await fetch("/api/admin/users", {
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
      const message = error instanceof Error ? error.message : t.deleteFailed;
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
      </div>

      {creatingOpen ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/25 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
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

            <div className="grid gap-3 md:grid-cols-2">
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
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
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

            <div className="grid gap-3 md:grid-cols-2">
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
