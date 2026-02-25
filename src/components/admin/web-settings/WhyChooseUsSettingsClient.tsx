"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

import { AdminLocale } from "../../../../lib/i18n/admin";
import {
  WhyChooseUsIcon,
  WebWhyChooseUsItem,
  WebWhyChooseUsSettings,
} from "../../../../lib/types/web-settings";
import SaveStatePopup from "./SaveStatePopup";

type WhyChooseUsSettingsClientProps = {
  locale: AdminLocale;
  initialSettings: WebWhyChooseUsSettings;
  bootstrapError: string | null;
};

type WhyChooseUsResponse = {
  ok: boolean;
  data?: WebWhyChooseUsSettings;
  error?: string;
};

const MAX_ITEMS = 6;

const ICON_OPTIONS: Array<{ value: WhyChooseUsIcon; th: string; en: string }> = [
  { value: "shield", th: "โล่ความปลอดภัย", en: "Shield" },
  { value: "spark", th: "ประกายพลัง", en: "Spark" },
  { value: "award", th: "เหรียญมาตรฐาน", en: "Award" },
  { value: "layers", th: "โครงสร้างระบบ", en: "Layers" },
  { value: "rocket", th: "การเติบโต", en: "Rocket" },
  { value: "support", th: "ดูแลต่อเนื่อง", en: "Support" },
  { value: "speed", th: "ความเร็ว", en: "Speed" },
  { value: "check", th: "ยืนยันคุณภาพ", en: "Check" },
];

function createItem(): WebWhyChooseUsItem {
  return {
    id: crypto.randomUUID(),
    icon: "shield",
    title: "",
    description: "",
  };
}

function IconGlyph({ icon }: { icon: WhyChooseUsIcon }) {
  if (icon === "shield") {
    return <path d="M12 3l7 3v5c0 4.7-2.9 8.8-7 10-4.1-1.2-7-5.3-7-10V6l7-3zm0 5v7m-3-4h6" />;
  }
  if (icon === "spark") {
    return <path d="M12 3l2.2 4.8L19 10l-4.8 2.2L12 17l-2.2-4.8L5 10l4.8-2.2L12 3zm7 13l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2zM5 14l.8 1.8L8 16.6l-2.2.8L5 19l-.8-1.6L2 16.6l2.2-.8L5 14z" />;
  }
  if (icon === "award") {
    return <path d="M12 3a5 5 0 0 1 5 5c0 2.8-2.2 5-5 5s-5-2.2-5-5a5 5 0 0 1 5-5zm0 10v8l-2.5-2-2.5 2v-6.2M12 13l2.5 2 2.5-2v6.2" />;
  }
  if (icon === "layers") {
    return <path d="M12 4l8 4-8 4-8-4 8-4zm-8 8l8 4 8-4M4 16l8 4 8-4" />;
  }
  if (icon === "rocket") {
    return <path d="M14 5c3 .2 4.8 2 5 5-2 2-4 4-6.5 5.5L9 19l.5-3.5C11 13 13 11 15 9c.3-1.6.1-2.8-1-4zM8 16l-3 3m2-8l-2.5.5L4 14l2.5-.5L7 11z" />;
  }
  if (icon === "support") {
    return <path d="M4 12a8 8 0 1 1 16 0v3a2 2 0 0 1-2 2h-2v-5h4M4 12H8v5H6a2 2 0 0 1-2-2v-3zm4 8h8" />;
  }
  if (icon === "speed") {
    return <path d="M4 14a8 8 0 1 1 16 0h-3a5 5 0 1 0-10 0H4zm8-5l4 3-4 3z" />;
  }
  return <path d="M20 7L9 18l-5-5" />;
}

export default function WhyChooseUsSettingsClient({
  locale,
  initialSettings,
  bootstrapError,
}: WhyChooseUsSettingsClientProps) {
  const text = useMemo(
    () =>
      locale === "th"
        ? {
            section: "ตั้งค่าเว็บ",
            title: "บ็อกข้อความทำไมเลือกเรา",
            subtitle: "เพิ่มคอนเทนเนอร์ข้อความพร้อมไอคอนได้สูงสุด 6 บ็อก",
            quickMenu: "เมนูตั้งค่าเว็บ",
            bannerMenu: "แบนเนอร์",
            homepageMenu: "หน้าแรก",
            imageBoxesMenu: "บ็อกภาพ",
            whyChooseUsMenu: "บ็อกข้อความทำไมเลือกเรา",
            middleBannerMenu: "แถบแบนเนอร์กลางเว็บ",
            newsCardsMenu: "กิจกรรมและข่าวสาร",
            brandGuaranteeMenu: "แบรนด์การันตี",
            sectionGapPx: "ระยะห่างก่อนส่วนนี้ (px)",
            sectionTitle: "หัวข้อส่วน",
            sectionSubtitle: "คำอธิบายส่วน",
            sectionTagline: "ข้อความมุมขวา",
            icon: "ไอคอน",
            boxTitle: "หัวข้อบ็อก",
            boxDescription: "รายละเอียดบ็อก",
            add: "เพิ่มบ็อกข้อความ",
            maxReached: "เพิ่มได้สูงสุด 6 บ็อก",
            remove: "ลบ",
            save: "บันทึกการตั้งค่า",
            saving: "กำลังบันทึก...",
            saved: "บันทึกเรียบร้อย",
            saveFailed: "บันทึกไม่สำเร็จ",
            loadError: "โหลดค่าเริ่มต้นไม่สำเร็จ ใช้ค่า default ชั่วคราว",
            preview: "ตัวอย่างส่วนทำไมเลือกเรา",
          }
        : {
            section: "Website Settings",
            title: "Why Choose Us Text Boxes",
            subtitle: "Add up to 6 content boxes with icon support.",
            quickMenu: "Website Menu",
            bannerMenu: "Banner",
            homepageMenu: "Homepage",
            imageBoxesMenu: "Image Boxes",
            whyChooseUsMenu: "Why Choose Us Boxes",
            middleBannerMenu: "Middle Website Banner",
            newsCardsMenu: "Activities & News",
            brandGuaranteeMenu: "Brand Guarantee",
            sectionGapPx: "Gap before section (px)",
            sectionTitle: "Section Title",
            sectionSubtitle: "Section Subtitle",
            sectionTagline: "Right-side Tagline",
            icon: "Icon",
            boxTitle: "Box Title",
            boxDescription: "Box Description",
            add: "Add Text Box",
            maxReached: "Maximum 6 boxes",
            remove: "Remove",
            save: "Save Settings",
            saving: "Saving...",
            saved: "Saved",
            saveFailed: "Save failed",
            loadError: "Failed to load initial settings. Using defaults.",
            preview: "Why Choose Us Preview",
          },
    [locale],
  );

  const [values, setValues] = useState<WebWhyChooseUsSettings>(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<{ tone: "idle" | "success" | "error"; message: string | null }>({
    tone: bootstrapError ? "error" : "idle",
    message: bootstrapError ? `${text.loadError}: ${bootstrapError}` : null,
  });

  function updateItem(id: string, patch: Partial<WebWhyChooseUsItem>) {
    setValues((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  }

  function addItem() {
    setStatus({ tone: "idle", message: null });
    setValues((prev) => {
      if (prev.items.length >= MAX_ITEMS) {
        return prev;
      }
      return { ...prev, items: [...prev.items, createItem()] };
    });
  }

  function removeItem(id: string) {
    setValues((prev) => ({ ...prev, items: prev.items.filter((item) => item.id !== id) }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ tone: "idle", message: null });

    const filtered = values.items
      .filter((item) => item.title.trim().length > 0 && item.description.trim().length > 0)
      .slice(0, MAX_ITEMS);

    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/web-settings/why-choose-us", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          sectionGapPx: values.sectionGapPx,
          sectionTitle: values.sectionTitle,
          sectionSubtitle: values.sectionSubtitle,
          sectionTagline: values.sectionTagline,
          items: filtered,
        }),
      });

      const result = (await response.json()) as WhyChooseUsResponse;
      if (!response.ok || !result.ok || !result.data) {
        throw new Error(result.error || text.saveFailed);
      }

      setValues(result.data);
      setStatus({ tone: "success", message: text.saved });
    } catch (error) {
      setStatus({
        tone: "error",
        message: `${text.saveFailed}: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    } finally {
      setIsSaving(false);
    }
  }

  const canAdd = values.items.length < MAX_ITEMS;

  return (
    <section className="space-y-6">
      <header className="sst-card-soft rounded-3xl p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-blue-600">{text.section}</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">{text.title}</h1>
        <p className="mt-1 text-sm text-slate-600">{text.subtitle}</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(200px,240px)_minmax(0,1fr)]">
        <aside className="settings-quicknav sst-card-soft rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{text.quickMenu}</p>
          <Link href="/admin/web-settings/banner" className="mt-3 block rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">{text.bannerMenu}</Link>
          <Link href="/admin/web-settings/homepage" className="mt-2 block rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">{text.homepageMenu}</Link>
          <Link href="/admin/web-settings/homepage-images" className="mt-2 block rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">{text.imageBoxesMenu}</Link>
          <div className="mt-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">{text.whyChooseUsMenu}</div>
          <Link href="/admin/web-settings/middle-banner" className="mt-2 block rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">{text.middleBannerMenu}</Link>
          <Link href="/admin/web-settings/news-cards" className="mt-2 block rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">{text.newsCardsMenu}</Link>
          <Link href="/admin/web-settings/brand-guarantee" className="mt-2 block rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">{text.brandGuaranteeMenu}</Link>
        </aside>

        <form onSubmit={handleSubmit} className="space-y-4">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <header className="border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">{text.preview}</p>
            </header>
            <div className="space-y-3 p-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h3 className="text-2xl font-black tracking-tight text-slate-900">{values.sectionTitle}</h3>
                  <p className="mt-1 text-sm text-slate-600">{values.sectionSubtitle}</p>
                </div>
                <p className="text-sm text-slate-500">{values.sectionTagline}</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {values.items.slice(0, MAX_ITEMS).map((item) => (
                  <article key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden>
                        <IconGlyph icon={item.icon} />
                      </svg>
                    </div>
                    <p className="text-base font-bold text-slate-900">{item.title || "..."}</p>
                    <p className="mt-1 text-sm text-slate-600">{item.description || "..."}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="sst-card-soft rounded-2xl p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm font-medium text-slate-700 md:col-span-2">
                <span>{text.sectionGapPx}</span>
                <input type="number" min={0} max={220} value={values.sectionGapPx} onChange={(event) => setValues((prev) => ({ ...prev, sectionGapPx: Number(event.target.value || 0) }))} className="input-base" />
              </label>
              <label className="space-y-1 text-sm font-medium text-slate-700 md:col-span-2">
                <span>{text.sectionTitle}</span>
                <input value={values.sectionTitle} onChange={(event) => setValues((prev) => ({ ...prev, sectionTitle: event.target.value }))} className="input-base" maxLength={140} />
              </label>
              <label className="space-y-1 text-sm font-medium text-slate-700">
                <span>{text.sectionSubtitle}</span>
                <input value={values.sectionSubtitle} onChange={(event) => setValues((prev) => ({ ...prev, sectionSubtitle: event.target.value }))} className="input-base" maxLength={220} />
              </label>
              <label className="space-y-1 text-sm font-medium text-slate-700">
                <span>{text.sectionTagline}</span>
                <input value={values.sectionTagline} onChange={(event) => setValues((prev) => ({ ...prev, sectionTagline: event.target.value }))} className="input-base" maxLength={160} />
              </label>

              <div className="grid gap-3 md:col-span-2">
                {values.items.map((item, index) => (
                  <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-700">Box {index + 1}</p>
                      <button type="button" onClick={() => removeItem(item.id)} className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-600">{text.remove}</button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="space-y-1 text-sm font-medium text-slate-700">
                        <span>{text.icon}</span>
                        <select
                          value={item.icon}
                          onChange={(event) => updateItem(item.id, { icon: event.target.value as WhyChooseUsIcon })}
                          className="input-base"
                        >
                          {ICON_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {locale === "th" ? option.th : option.en}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-1 text-sm font-medium text-slate-700">
                        <span>{text.boxTitle}</span>
                        <input value={item.title} onChange={(event) => updateItem(item.id, { title: event.target.value })} className="input-base" maxLength={120} />
                      </label>
                    </div>

                    <label className="mt-2 block space-y-1 text-sm font-medium text-slate-700">
                      <span>{text.boxDescription}</span>
                      <textarea value={item.description} onChange={(event) => updateItem(item.id, { description: event.target.value })} className="input-base min-h-[84px] resize-y" maxLength={300} />
                    </label>
                  </article>
                ))}

                <button
                  type="button"
                  onClick={addItem}
                  disabled={!canAdd}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {canAdd ? text.add : text.maxReached}
                </button>
              </div>
            </div>
          </section>

          <div className="flex items-center justify-between">
            <p className={`text-sm ${status.tone === "error" ? "text-rose-600" : status.tone === "success" ? "text-emerald-600" : "text-slate-500"}`}>{status.message}</p>
            <button type="submit" disabled={isSaving} className="btn-primary rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{isSaving ? text.saving : text.save}</button>
          </div>
        </form>
      </div>
      <SaveStatePopup isSaving={isSaving} isSuccess={status.tone === "success"} savingText={text.saving} successText={text.saved} />
    </section>
  );
}
