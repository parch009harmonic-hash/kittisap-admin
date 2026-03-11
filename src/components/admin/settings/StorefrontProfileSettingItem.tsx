"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { getDefaultWebStorefrontSettings, WebStorefrontSettings } from "../../../../lib/types/web-settings";

type Locale = "th" | "en" | "lo";

type LocalizedText = {
  th: string;
  en: string;
  lo: string;
};

type StorefrontPayload = {
  ok?: boolean;
  error?: string;
  data?: WebStorefrontSettings;
};

type FieldDef = {
  key: keyof WebStorefrontSettings;
  label: LocalizedText;
  type?: "text" | "tel" | "url" | "textarea";
};

const PANEL_TEXT = {
  title: {
    th: "ข้อมูลร้านค้าที่แสดงบนหน้าเว็บไซต์",
    en: "Storefront profile settings",
    lo: "ຂໍ້ມູນຮ້ານທີ່ສະແດງໜ້າເວັບ",
  },
  subtitle: {
    th: "แก้ไขเมนูบนเว็บ ปุ่มโทรหาเรา หน้า Contact และ Footer ให้เชื่อมกันทั้งระบบ",
    en: "Edit top menu, call button, contact page, and footer from one place.",
    lo: "ແກ້ໄຂເມນູໜ້າເວັບ, ປຸ່ມໂທ, ໜ້າຕິດຕໍ່ ແລະ footer ໃຫ້ສອດຄ່ອງກັນ.",
  },
  loadFailed: {
    th: "โหลดข้อมูลร้านค้าไม่สำเร็จ",
    en: "Failed to load storefront settings.",
    lo: "ໂຫລດຂໍ້ມູນຮ້ານບໍ່ສຳເລັດ",
  },
  saveFailed: {
    th: "บันทึกข้อมูลร้านค้าไม่สำเร็จ",
    en: "Failed to save storefront settings.",
    lo: "ບັນທຶກຂໍ້ມູນຮ້ານບໍ່ສຳເລັດ",
  },
  saved: {
    th: "บันทึกข้อมูลร้านค้าเรียบร้อย",
    en: "Storefront settings saved.",
    lo: "ບັນທຶກຂໍ້ມູນຮ້ານແລ້ວ",
  },
  loading: {
    th: "กำลังโหลดข้อมูล...",
    en: "Loading storefront settings...",
    lo: "ກຳລັງໂຫລດຂໍ້ມູນ...",
  },
  save: {
    th: "บันทึกการตั้งค่าเว็บไซต์",
    en: "Save storefront settings",
    lo: "ບັນທຶກການຕັ້ງຄ່າເວັບ",
  },
  saving: {
    th: "กำลังบันทึก...",
    en: "Saving...",
    lo: "ກຳລັງບັນທຶກ...",
  },
  topbar: {
    th: "แถบเมนูด้านบน",
    en: "Top menu",
    lo: "ເມນູດ້ານເທິງ",
  },
  footer: {
    th: "ส่วนท้ายเว็บไซต์",
    en: "Footer",
    lo: "ສ່ວນທ້າຍເວັບ",
  },
  contact: {
    th: "หน้าติดต่อเรา",
    en: "Contact page",
    lo: "ໜ້າຕິດຕໍ່",
  },
  previewPhone: {
    th: "ทดสอบโทร:",
    en: "Call preview:",
    lo: "ທົດລອງໂທ:",
  },
  migrationTitle: {
    th: "ยังไม่พร้อมบันทึก: ขาดตาราง web_settings",
    en: "Cannot save yet: missing web_settings table",
    lo: "ຍັງບໍ່ພ້ອມບັນທຶກ: ຂາດຕາຕະລາງ web_settings",
  },
  migrationBody: {
    th: "กรุณารันไฟล์ sql/ensure-web-settings.sql ใน Supabase SQL Editor ก่อน แล้วรีเฟรชหน้านี้",
    en: "Run sql/ensure-web-settings.sql in Supabase SQL Editor, then refresh this page.",
    lo: "ກະລຸນາຮັນ sql/ensure-web-settings.sql ໃນ Supabase SQL Editor ແລ້ວ refresh ໜ້ານີ້",
  },
} satisfies Record<string, LocalizedText>;

const TOP_FIELDS: FieldDef[] = [
  {
    key: "brandName",
    label: { th: "ชื่อแบรนด์ (ซ้ายบน)", en: "Brand name", lo: "ຊື່ແບຣນ (ມຸມຊ້າຍເທິງ)" },
  },
  {
    key: "storefrontLogoUrl",
    label: { th: "ลิงก์โลโก้ร้าน", en: "Store logo URL", lo: "ລິ້ງໂລໂກ້ຮ້ານ" },
    type: "url",
  },
  {
    key: "callButtonLabel",
    label: { th: "ข้อความปุ่มโทรหาเรา", en: "Call button label", lo: "ຂໍ້ຄວາມປຸ່ມໂທຫາພວກເຮົາ" },
  },
  {
    key: "callPhone",
    label: { th: "เบอร์โทรปุ่มโทรหาเรา", en: "Call phone", lo: "ເບີໂທສຳລັບປຸ່ມໂທ" },
    type: "tel",
  },
];

const FOOTER_FIELDS: FieldDef[] = [
  { key: "footerTitle", label: { th: "หัวข้อ Footer", en: "Footer title", lo: "ຫົວຂໍ້ Footer" } },
  {
    key: "footerDescription1",
    label: { th: "คำอธิบายบรรทัดที่ 1", en: "Footer description line 1", lo: "ຄຳອະທິບາຍແຖວ 1" },
    type: "textarea",
  },
  {
    key: "footerDescription2",
    label: { th: "คำอธิบายบรรทัดที่ 2", en: "Footer description line 2", lo: "ຄຳອະທິບາຍແຖວ 2" },
    type: "textarea",
  },
  {
    key: "footerContactTitle",
    label: { th: "หัวข้อ Contact ใน Footer", en: "Footer contact title", lo: "ຫົວຂໍ້ຕິດຕໍ່ໃນ Footer" },
  },
  {
    key: "footerCallLabel",
    label: { th: "ข้อความลิงก์โทร", en: "Footer call label", lo: "ຂໍ້ຄວາມລິ້ງໂທ" },
  },
  {
    key: "footerLineLabel",
    label: { th: "ข้อความลิงก์ LINE", en: "Footer LINE label", lo: "ຂໍ້ຄວາມລິ້ງ LINE" },
  },
  {
    key: "footerFacebookLabel",
    label: { th: "ข้อความลิงก์ Facebook", en: "Footer Facebook label", lo: "ຂໍ້ຄວາມລິ້ງ Facebook" },
  },
  { key: "lineUrl", label: { th: "ลิงก์ LINE", en: "LINE URL", lo: "ລິ້ງ LINE" }, type: "url" },
  {
    key: "facebookUrl",
    label: { th: "ลิงก์ Facebook", en: "Facebook URL", lo: "ລິ້ງ Facebook" },
    type: "url",
  },
];

const CONTACT_FIELDS: FieldDef[] = [
  { key: "contactTitle", label: { th: "หัวข้อหน้าติดต่อ", en: "Contact title", lo: "ຫົວຂໍ້ໜ້າຕິດຕໍ່" } },
  {
    key: "contactSubtitle",
    label: { th: "คำอธิบายหน้าติดต่อ", en: "Contact subtitle", lo: "ຄຳອະທິບາຍໜ້າຕິດຕໍ່" },
    type: "textarea",
  },
  {
    key: "contactPhone",
    label: { th: "เบอร์โทรติดต่อ", en: "Contact phone", lo: "ເບີໂທຕິດຕໍ່" },
    type: "tel",
  },
  { key: "contactLineId", label: { th: "LINE ID", en: "LINE ID", lo: "LINE ID" } },
  {
    key: "contactAddressTh",
    label: { th: "ที่อยู่ (ไทย/ลาว)", en: "Address (TH/LO)", lo: "ທີ່ຢູ່ (ໄທ/ລາວ)" },
    type: "textarea",
  },
  {
    key: "contactAddressEn",
    label: { th: "ที่อยู่ (อังกฤษ)", en: "Address (EN)", lo: "ທີ່ຢູ່ (ອັງກິດ)" },
    type: "textarea",
  },
  {
    key: "contactMapEmbedUrl",
    label: {
      th: "ลิงก์แผนที่ Embed (วางลิงก์ Google Maps ได้)",
      en: "Map embed URL (Google Maps link works)",
      lo: "ລິ້ງແຜນທີ່ Embed (ໃຊ້ລິ້ງ Google Maps ໄດ້)",
    },
    type: "url",
  },
  {
    key: "contactMapOpenUrl",
    label: { th: "ลิงก์เปิด Google Maps", en: "Map open URL", lo: "ລິ້ງເປີດ Google Maps" },
    type: "url",
  },
  {
    key: "contactCallButtonLabel",
    label: { th: "ข้อความปุ่มโทรทันที", en: "Call button label", lo: "ຂໍ້ຄວາມປຸ່ມໂທທັນທີ" },
  },
  {
    key: "contactMapButtonLabel",
    label: { th: "ข้อความปุ่มเปิดแผนที่", en: "Map button label", lo: "ຂໍ້ຄວາມປຸ່ມເປີດແຜນທີ່" },
  },
  {
    key: "contactLineButtonLabel",
    label: { th: "ข้อความปุ่มเปิด LINE", en: "LINE button label", lo: "ຂໍ້ຄວາມປຸ່ມເປີດ LINE" },
  },
  {
    key: "contactHoursWeekdayLabel",
    label: { th: "ชื่อวัน (จันทร์ - ศุกร์)", en: "Weekday label", lo: "ຊື່ວັນ (ຈັນ - ສຸກ)" },
  },
  {
    key: "contactHoursWeekdayTime",
    label: { th: "เวลา (จันทร์ - ศุกร์)", en: "Weekday time", lo: "ເວລາ (ຈັນ - ສຸກ)" },
  },
  {
    key: "contactHoursSaturdayLabel",
    label: { th: "ชื่อวัน (เสาร์)", en: "Saturday label", lo: "ຊື່ວັນ (ເສົາ)" },
  },
  {
    key: "contactHoursSaturdayTime",
    label: { th: "เวลา (เสาร์)", en: "Saturday time", lo: "ເວລາ (ເສົາ)" },
  },
  {
    key: "contactHoursSundayLabel",
    label: { th: "ชื่อวัน (อาทิตย์)", en: "Sunday label", lo: "ຊື່ວັນ (ອາທິດ)" },
  },
  {
    key: "contactHoursSundayTime",
    label: { th: "เวลา (อาทิตย์)", en: "Sunday time", lo: "ເວລາ (ອາທິດ)" },
  },
];

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

function getText(locale: Locale, map: LocalizedText) {
  return map[locale] ?? map.th;
}

export function StorefrontProfileSettingItem({
  locale,
  onSuccess,
  onError,
}: {
  locale: "th" | "en" | "lo";
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [draft, setDraft] = useState<WebStorefrontSettings>(getDefaultWebStorefrontSettings());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [migrationRequired, setMigrationRequired] = useState(false);

  const text = useMemo(
    () => ({
      title: getText(locale, PANEL_TEXT.title),
      subtitle: getText(locale, PANEL_TEXT.subtitle),
      loadFailed: getText(locale, PANEL_TEXT.loadFailed),
      saveFailed: getText(locale, PANEL_TEXT.saveFailed),
      saved: getText(locale, PANEL_TEXT.saved),
      loading: getText(locale, PANEL_TEXT.loading),
      save: getText(locale, PANEL_TEXT.save),
      saving: getText(locale, PANEL_TEXT.saving),
      topbar: getText(locale, PANEL_TEXT.topbar),
      footer: getText(locale, PANEL_TEXT.footer),
      contact: getText(locale, PANEL_TEXT.contact),
      previewPhone: getText(locale, PANEL_TEXT.previewPhone),
      migrationTitle: getText(locale, PANEL_TEXT.migrationTitle),
      migrationBody: getText(locale, PANEL_TEXT.migrationBody),
    }),
    [locale],
  );

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      try {
        const { response, payload } = await fetchJson<StorefrontPayload>("/api/admin/web-settings/storefront");
        if (!active) {
          return;
        }

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
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [onError, text.loadFailed]);

  const setField = useCallback(<K extends keyof WebStorefrontSettings>(key: K, value: WebStorefrontSettings[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }, []);

  const save = useCallback(async () => {
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
  }, [draft, migrationRequired, onError, onSuccess, text.migrationBody, text.saveFailed, text.saved]);

  const renderField = useCallback(
    (field: FieldDef) => {
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
    },
    [draft, setField],
  );

  const renderGroup = useCallback(
    (title: string, fields: FieldDef[]) => (
      <section className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">{title}</p>
        <div className="grid gap-3 md:grid-cols-2">
          {fields.map((field) => (
            <label key={field.key} className={`space-y-1 ${field.type === "textarea" ? "md:col-span-2" : ""}`}>
              <span className="text-xs font-semibold text-slate-600">{getText(locale, field.label)}</span>
              {renderField(field)}
            </label>
          ))}
        </div>
      </section>
    ),
    [locale, renderField],
  );

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

        {renderGroup(text.topbar, TOP_FIELDS)}
        {renderGroup(text.footer, FOOTER_FIELDS)}
        {renderGroup(text.contact, CONTACT_FIELDS)}

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
