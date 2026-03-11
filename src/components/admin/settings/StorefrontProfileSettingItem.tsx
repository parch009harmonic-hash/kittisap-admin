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
            title: "เธเนเธญเธกเธนเธฅเธฃเนเธฒเธเธเนเธฒเธ—เธตเนเนเธชเธ”เธเธเธเธซเธเนเธฒเน€เธงเนเธเนเธเธ•เน",
            subtitle: "เนเธเนเนเธเน€เธกเธเธนเธเธ เธเธธเนเธกเนเธ—เธฃเธซเธฒเน€เธฃเธฒ เธซเธเนเธฒ Contact เนเธฅเธฐ Footer เนเธซเนเน€เธเธทเนเธญเธกเธเธฑเธเธ—เธฑเนเธเธฃเธฐเธเธ",
            loadFailed: "เนเธซเธฅเธ”เธเนเธญเธกเธนเธฅเธฃเนเธฒเธเธเนเธฒเนเธกเนเธชเธณเน€เธฃเนเธ",
            saveFailed: "เธเธฑเธเธ—เธถเธเธเนเธญเธกเธนเธฅเธฃเนเธฒเธเธเนเธฒเนเธกเนเธชเธณเน€เธฃเนเธ",
            saved: "เธเธฑเธเธ—เธถเธเธเนเธญเธกเธนเธฅเธฃเนเธฒเธเธเนเธฒเน€เธฃเธตเธขเธเธฃเนเธญเธข",
            loading: "เธเธณเธฅเธฑเธเนเธซเธฅเธ”เธเนเธญเธกเธนเธฅ...",
            save: "เธเธฑเธเธ—เธถเธเธเธฒเธฃเธ•เธฑเนเธเธเนเธฒเน€เธงเนเธเนเธเธ•เน",
            saving: "เธเธณเธฅเธฑเธเธเธฑเธเธ—เธถเธ...",
            topbar: "เนเธ–เธเธเธเน€เธงเนเธเนเธเธ•เน",
            footer: "เธชเนเธงเธเธ—เนเธฒเธขเน€เธงเนเธเนเธเธ•เน",
            contact: "เธซเธเนเธฒ เธ•เธดเธ”เธ•เนเธญเน€เธฃเธฒ",
            previewPhone: "เธ—เธ”เธชเธญเธเนเธ—เธฃ:",
            migrationTitle: "เธขเธฑเธเนเธกเนเธเธฃเนเธญเธกเธเธฑเธเธ—เธถเธ: เธเธฒเธ”เธ•เธฒเธฃเธฒเธ web_settings",
            migrationBody: "เธเธฃเธธเธ“เธฒเธฃเธฑเธเนเธเธฅเน sql/ensure-web-settings.sql เนเธ Supabase SQL Editor เธเนเธญเธ เนเธฅเนเธงเธฃเธตเน€เธเธฃเธเธซเธเนเธฒ",
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
    { key: "brandName", label: locale === "th" ? "เธเธทเนเธญเนเธเธฃเธเธ”เน (เธเนเธฒเธขเธเธ)" : "Brand name" },
    { key: "storefrontLogoUrl", label: locale === "th" ? "ลิงก์โลโก้ร้าน" : "Store logo URL", type: "url" },
    { key: "callButtonLabel", label: locale === "th" ? "เธเนเธญเธเธงเธฒเธกเธเธธเนเธกเนเธ—เธฃเธซเธฒเน€เธฃเธฒ" : "Call button label" },
    { key: "callPhone", label: locale === "th" ? "เน€เธเธญเธฃเนเนเธ—เธฃเธเธธเนเธกเนเธ—เธฃเธซเธฒเน€เธฃเธฒ" : "Call phone", type: "tel" },
  ];

  const footerFields: FieldDef[] = [
    { key: "footerTitle", label: locale === "th" ? "เธซเธฑเธงเธเนเธญ Footer" : "Footer title" },
    { key: "footerDescription1", label: locale === "th" ? "เธเธณเธญเธเธดเธเธฒเธขเธเธฃเธฃเธ—เธฑเธ”เธ—เธตเน 1" : "Footer description line 1", type: "textarea" },
    { key: "footerDescription2", label: locale === "th" ? "เธเธณเธญเธเธดเธเธฒเธขเธเธฃเธฃเธ—เธฑเธ”เธ—เธตเน 2" : "Footer description line 2", type: "textarea" },
    { key: "footerContactTitle", label: locale === "th" ? "เธซเธฑเธงเธเนเธญ Contact เนเธ Footer" : "Footer contact title" },
    { key: "footerCallLabel", label: locale === "th" ? "เธเนเธญเธเธงเธฒเธกเธฅเธดเธเธเนเนเธ—เธฃ" : "Footer call label" },
    { key: "footerLineLabel", label: locale === "th" ? "เธเนเธญเธเธงเธฒเธกเธฅเธดเธเธเน LINE" : "Footer LINE label" },
    { key: "footerFacebookLabel", label: locale === "th" ? "เธเนเธญเธเธงเธฒเธกเธฅเธดเธเธเน Facebook" : "Footer Facebook label" },
    { key: "lineUrl", label: locale === "th" ? "เธฅเธดเธเธเน LINE" : "LINE URL", type: "url" },
    { key: "facebookUrl", label: locale === "th" ? "เธฅเธดเธเธเน Facebook" : "Facebook URL", type: "url" },
  ];

  const contactFields: FieldDef[] = [
    { key: "contactTitle", label: locale === "th" ? "เธซเธฑเธงเธเนเธญเธซเธเนเธฒ Contact" : "Contact title" },
    { key: "contactSubtitle", label: locale === "th" ? "เธเธณเธญเธเธดเธเธฒเธขเธซเธเนเธฒ Contact" : "Contact subtitle", type: "textarea" },
    { key: "contactPhone", label: locale === "th" ? "เน€เธเธญเธฃเนเนเธ—เธฃเธ•เธดเธ”เธ•เนเธญ" : "Contact phone", type: "tel" },
    { key: "contactLineId", label: locale === "th" ? "LINE ID" : "LINE ID" },
    { key: "contactAddressTh", label: locale === "th" ? "เธ—เธตเนเธญเธขเธนเน (เนเธ—เธข/เธฅเธฒเธง)" : "Address (TH/LO)", type: "textarea" },
    { key: "contactAddressEn", label: locale === "th" ? "เธ—เธตเนเธญเธขเธนเน (เธญเธฑเธเธเธคเธฉ)" : "Address (EN)", type: "textarea" },
    {
      key: "contactMapEmbedUrl",
      label: locale === "th" ? "เธฅเธดเธเธเนเนเธเธเธ—เธตเน Embed (เธงเธฒเธเธฅเธดเธเธเน Google Maps เนเธ”เน)" : "Map embed URL (Google Maps link works)",
      type: "url",
    },
    { key: "contactMapOpenUrl", label: locale === "th" ? "เธฅเธดเธเธเนเน€เธเธดเธ” Google Maps" : "Map open URL", type: "url" },
    { key: "contactCallButtonLabel", label: locale === "th" ? "เธเนเธญเธเธงเธฒเธกเธเธธเนเธกเนเธ—เธฃเธ—เธฑเธเธ—เธต" : "Call button label" },
    { key: "contactMapButtonLabel", label: locale === "th" ? "เธเนเธญเธเธงเธฒเธกเธเธธเนเธกเน€เธเธดเธ”เนเธเธเธ—เธตเน" : "Map button label" },
    { key: "contactLineButtonLabel", label: locale === "th" ? "เธเนเธญเธเธงเธฒเธกเธเธธเนเธกเน€เธเธดเธ” LINE" : "LINE button label" },
    { key: "contactHoursWeekdayLabel", label: locale === "th" ? "เธเธทเนเธญเธงเธฑเธ (เธเธฑเธเธ—เธฃเน-เธจเธธเธเธฃเน)" : "Weekday label" },
    { key: "contactHoursWeekdayTime", label: locale === "th" ? "เน€เธงเธฅเธฒ (เธเธฑเธเธ—เธฃเน-เธจเธธเธเธฃเน)" : "Weekday time" },
    { key: "contactHoursSaturdayLabel", label: locale === "th" ? "เธเธทเนเธญเธงเธฑเธ (เน€เธชเธฒเธฃเน)" : "Saturday label" },
    { key: "contactHoursSaturdayTime", label: locale === "th" ? "เน€เธงเธฅเธฒ (เน€เธชเธฒเธฃเน)" : "Saturday time" },
    { key: "contactHoursSundayLabel", label: locale === "th" ? "เธเธทเนเธญเธงเธฑเธ (เธญเธฒเธ—เธดเธ•เธขเน)" : "Sunday label" },
    { key: "contactHoursSundayTime", label: locale === "th" ? "เน€เธงเธฅเธฒ (เธญเธฒเธ—เธดเธ•เธขเน)" : "Sunday time" },
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

