"use client";

import { useEffect, useMemo, useState } from "react";

import { getDefaultWebStorefrontSettings, WebStorefrontSettings } from "../../../../lib/types/web-settings";

type StorefrontPayload = {
  ok?: boolean;
  error?: string;
  data?: WebStorefrontSettings;
};

type FieldDef = {
  key: keyof WebStorefrontSettings;
  label: string;
  type?: "text" | "tel" | "url" | "textarea";
};

async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit) {
  const response = await fetch(input, { ...init, cache: "no-store" });
  const payload = (await response.json().catch(() => null)) as T | null;
  return { response, payload };
}

function toTelHref(value: string) {
  const normalized = value.replace(/[^0-9+]/g, "");
  return normalized ? `tel:${normalized}` : "#";
}

function isMissingWebSettingsError(message: string) {
  return message.toLowerCase().includes("missing web_settings table");
}

export function StorefrontProfileSettingItem({
  locale,
  onSuccess,
  onError,
}: {
  locale: "th" | "en";
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [draft, setDraft] = useState<WebStorefrontSettings>(getDefaultWebStorefrontSettings());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [migrationRequired, setMigrationRequired] = useState(false);

  const text = useMemo(
    () =>
      locale === "th"
        ? {
            title: "ข้อมูลร้านค้าที่แสดงบนหน้าเว็บไซต์",
            subtitle: "แก้ไขเมนูบน ปุ่มโทรหาเรา หน้า Contact และ Footer ให้เชื่อมกันทั้งระบบ",
            loadFailed: "โหลดข้อมูลร้านค้าไม่สำเร็จ",
            saveFailed: "บันทึกข้อมูลร้านค้าไม่สำเร็จ",
            saved: "บันทึกข้อมูลร้านค้าเรียบร้อย",
            loading: "กำลังโหลดข้อมูล...",
            save: "บันทึกการตั้งค่าเว็บไซต์",
            saving: "กำลังบันทึก...",
            topbar: "แถบบนเว็บไซต์",
            footer: "ส่วนท้ายเว็บไซต์",
            contact: "หน้า ติดต่อเรา",
            previewPhone: "ทดสอบโทร:",
            migrationTitle: "ยังไม่พร้อมบันทึก: ขาดตาราง web_settings",
            migrationBody: "กรุณารันไฟล์ sql/ensure-web-settings.sql ใน Supabase SQL Editor ก่อน แล้วรีเฟรชหน้า",
          }
        : {
            title: "Storefront profile settings",
            subtitle: "Edit top menu, call button, contact page, and footer from one place.",
            loadFailed: "Failed to load storefront settings.",
            saveFailed: "Failed to save storefront settings.",
            saved: "Storefront settings saved.",
            loading: "Loading storefront settings...",
            save: "Save storefront settings",
            saving: "Saving...",
            topbar: "Top menu",
            footer: "Footer",
            contact: "Contact page",
            previewPhone: "Call preview:",
            migrationTitle: "Cannot save yet: missing web_settings table",
            migrationBody: "Run sql/ensure-web-settings.sql in Supabase SQL Editor, then refresh this page.",
          },
    [locale],
  );

  const topFields: FieldDef[] = [
    { key: "brandName", label: locale === "th" ? "ชื่อแบรนด์ (ซ้ายบน)" : "Brand name" },
    { key: "callButtonLabel", label: locale === "th" ? "ข้อความปุ่มโทรหาเรา" : "Call button label" },
    { key: "callPhone", label: locale === "th" ? "เบอร์โทรปุ่มโทรหาเรา" : "Call phone", type: "tel" },
  ];

  const footerFields: FieldDef[] = [
    { key: "footerTitle", label: locale === "th" ? "หัวข้อ Footer" : "Footer title" },
    { key: "footerDescription1", label: locale === "th" ? "คำอธิบายบรรทัดที่ 1" : "Footer description line 1", type: "textarea" },
    { key: "footerDescription2", label: locale === "th" ? "คำอธิบายบรรทัดที่ 2" : "Footer description line 2", type: "textarea" },
    { key: "footerContactTitle", label: locale === "th" ? "หัวข้อ Contact ใน Footer" : "Footer contact title" },
    { key: "footerCallLabel", label: locale === "th" ? "ข้อความลิงก์โทร" : "Footer call label" },
    { key: "footerLineLabel", label: locale === "th" ? "ข้อความลิงก์ LINE" : "Footer LINE label" },
    { key: "footerFacebookLabel", label: locale === "th" ? "ข้อความลิงก์ Facebook" : "Footer Facebook label" },
    { key: "lineUrl", label: locale === "th" ? "ลิงก์ LINE" : "LINE URL", type: "url" },
    { key: "facebookUrl", label: locale === "th" ? "ลิงก์ Facebook" : "Facebook URL", type: "url" },
  ];

  const contactFields: FieldDef[] = [
    { key: "contactTitle", label: locale === "th" ? "หัวข้อหน้า Contact" : "Contact title" },
    { key: "contactSubtitle", label: locale === "th" ? "คำอธิบายหน้า Contact" : "Contact subtitle", type: "textarea" },
    { key: "contactPhone", label: locale === "th" ? "เบอร์โทรติดต่อ" : "Contact phone", type: "tel" },
    { key: "contactLineId", label: locale === "th" ? "LINE ID" : "LINE ID" },
    { key: "contactAddressTh", label: locale === "th" ? "ที่อยู่ (ไทย/ลาว)" : "Address (TH/LO)", type: "textarea" },
    { key: "contactAddressEn", label: locale === "th" ? "ที่อยู่ (อังกฤษ)" : "Address (EN)", type: "textarea" },
    { key: "contactMapEmbedUrl", label: locale === "th" ? "ลิงก์แผนที่ Embed" : "Map embed URL", type: "url" },
    { key: "contactMapOpenUrl", label: locale === "th" ? "ลิงก์เปิด Google Maps" : "Map open URL", type: "url" },
    { key: "contactCallButtonLabel", label: locale === "th" ? "ข้อความปุ่มโทรทันที" : "Call button label" },
    { key: "contactMapButtonLabel", label: locale === "th" ? "ข้อความปุ่มเปิดแผนที่" : "Map button label" },
    { key: "contactLineButtonLabel", label: locale === "th" ? "ข้อความปุ่มเปิด LINE" : "LINE button label" },
    { key: "contactHoursWeekdayLabel", label: locale === "th" ? "ชื่อวัน (จันทร์-ศุกร์)" : "Weekday label" },
    { key: "contactHoursWeekdayTime", label: locale === "th" ? "เวลา (จันทร์-ศุกร์)" : "Weekday time" },
    { key: "contactHoursSaturdayLabel", label: locale === "th" ? "ชื่อวัน (เสาร์)" : "Saturday label" },
    { key: "contactHoursSaturdayTime", label: locale === "th" ? "เวลา (เสาร์)" : "Saturday time" },
    { key: "contactHoursSundayLabel", label: locale === "th" ? "ชื่อวัน (อาทิตย์)" : "Sunday label" },
    { key: "contactHoursSundayTime", label: locale === "th" ? "เวลา (อาทิตย์)" : "Sunday time" },
  ];

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const { response, payload } = await fetchJson<StorefrontPayload>("/api/admin/web-settings/storefront");
        if (!active) return;

        if (!response.ok || !payload?.ok || !payload.data) {
          const message = payload?.error ?? text.loadFailed;
          if (isMissingWebSettingsError(message)) {
            setMigrationRequired(true);
          }
          throw new Error(message);
        }

        setMigrationRequired(false);
        setDraft(payload.data);
      } catch (error) {
        onError(error instanceof Error ? error.message : text.loadFailed);
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [onError, text.loadFailed]);

  function setField<K extends keyof WebStorefrontSettings>(key: K, value: WebStorefrontSettings[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    if (migrationRequired) {
      onError(text.migrationBody);
      return;
    }

    setSaving(true);
    try {
      const { response, payload } = await fetchJson<StorefrontPayload>("/api/admin/web-settings/storefront", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!response.ok || !payload?.ok) {
        const message = payload?.error ?? text.saveFailed;
        if (isMissingWebSettingsError(message)) {
          setMigrationRequired(true);
        }
        throw new Error(message);
      }
      if (payload.data) {
        setDraft(payload.data);
      }
      onSuccess(text.saved);
    } catch (error) {
      onError(error instanceof Error ? error.message : text.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  function renderField(field: FieldDef) {
    if (field.type === "textarea") {
      return (
        <textarea
          value={String(draft[field.key] ?? "")}
          onChange={(event) => setField(field.key, event.target.value as never)}
          rows={3}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />
      );
    }

    return (
      <input
        type={field.type ?? "text"}
        value={String(draft[field.key] ?? "")}
        onChange={(event) => setField(field.key, event.target.value as never)}
        className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
      />
    );
  }

  function renderGroup(title: string, fields: FieldDef[]) {
    return (
      <section className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">{title}</p>
        <div className="grid gap-3 md:grid-cols-2">
          {fields.map((field) => (
            <label key={field.key} className={`space-y-1 ${field.type === "textarea" ? "md:col-span-2" : ""}`}>
              <span className="text-xs font-semibold text-slate-600">{field.label}</span>
              {renderField(field)}
            </label>
          ))}
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <li className="px-4 py-4">
        <p className="text-sm text-slate-500">{text.loading}</p>
      </li>
    );
  }

  return (
    <li className="px-4 py-4">
      <div className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-slate-800">{text.title}</p>
          <p className="text-xs text-slate-500">{text.subtitle}</p>
        </div>

        {migrationRequired ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
            <p className="text-sm font-semibold text-rose-800">{text.migrationTitle}</p>
            <p className="mt-1 text-xs text-rose-700">{text.migrationBody}</p>
            <code className="mt-2 block rounded-lg bg-white px-2 py-1 text-[11px] text-slate-700">
              sql/ensure-web-settings.sql
            </code>
          </div>
        ) : null}

        {renderGroup(text.topbar, topFields)}
        {renderGroup(text.footer, footerFields)}
        {renderGroup(text.contact, contactFields)}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || migrationRequired}
            className="btn-primary rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            {saving ? text.saving : text.save}
          </button>
          <a
            href={toTelHref(draft.callPhone)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
          >
            {text.previewPhone} {draft.callPhone}
          </a>
        </div>
      </div>
    </li>
  );
}
