"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

import { AdminLocale } from "../../../../lib/i18n/admin";
import { WebBrandGuaranteeItem, WebBrandGuaranteeSettings } from "../../../../lib/types/web-settings";
import SaveStatePopup from "./SaveStatePopup";

type BrandGuaranteeSettingsClientProps = {
  locale: AdminLocale;
  initialSettings: WebBrandGuaranteeSettings;
  bootstrapError: string | null;
};

type BrandGuaranteeResponse = {
  ok: boolean;
  data?: WebBrandGuaranteeSettings;
  error?: string;
};

function createItem(): WebBrandGuaranteeItem {
  return { id: crypto.randomUUID(), logoUrl: "", altText: "", linkUrl: "" };
}

export default function BrandGuaranteeSettingsClient({
  locale,
  initialSettings,
  bootstrapError,
}: BrandGuaranteeSettingsClientProps) {
  const text = useMemo(
    () =>
      locale === "th"
        ? {
            section: "ตั้งค่าเว็บ",
            title: "แบรนด์การันตี",
            subtitle: "เพิ่มโลโก้ได้ไม่จำกัด จัดแนวซ้าย/กลาง/ขวา และเลือกลูกเล่นการแสดงผล",
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
            align: "การจัดวางโลโก้",
            alignLeft: "ชิดซ้าย",
            alignCenter: "กึ่งกลาง",
            alignRight: "ชิดขวา",
            effect: "ลูกเล่นโลโก้",
            effectNone: "ไม่มี",
            effectLift: "ยกตัวเมื่อโฮเวอร์",
            effectGlow: "เรืองแสง",
            effectPulse: "เต้นเบาๆ",
            logoUrl: "ลิงก์โลโก้",
            altText: "คำอธิบายโลโก้ (alt)",
            linkUrl: "ลิงก์ปลายทาง (ถ้ามี)",
            upload: "อัปโหลดโลโก้",
            uploading: "กำลังอัปโหลด...",
            add: "เพิ่มโลโก้",
            remove: "ลบ",
            moveUp: "ขึ้น",
            moveDown: "ลง",
            preview: "ตัวอย่างแสดงผล",
            save: "บันทึกการตั้งค่า",
            saving: "กำลังบันทึก...",
            saved: "บันทึกเรียบร้อย",
            saveFailed: "บันทึกไม่สำเร็จ",
            loadError: "โหลดค่าเริ่มต้นไม่สำเร็จ ใช้ค่า default ชั่วคราว",
          }
        : {
            section: "Website Settings",
            title: "Brand Guarantee",
            subtitle: "Add unlimited logos with horizontal alignment and interactive effects.",
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
            align: "Logo Alignment",
            alignLeft: "Left",
            alignCenter: "Center",
            alignRight: "Right",
            effect: "Logo Effect",
            effectNone: "None",
            effectLift: "Hover Lift",
            effectGlow: "Glow",
            effectPulse: "Pulse",
            logoUrl: "Logo URL",
            altText: "Logo Alt Text",
            linkUrl: "Destination URL (optional)",
            upload: "Upload Logo",
            uploading: "Uploading...",
            add: "Add Logo",
            remove: "Remove",
            moveUp: "Up",
            moveDown: "Down",
            preview: "Preview",
            save: "Save Settings",
            saving: "Saving...",
            saved: "Saved",
            saveFailed: "Save failed",
            loadError: "Failed to load initial settings. Using defaults.",
          },
    [locale],
  );

  const [values, setValues] = useState<WebBrandGuaranteeSettings>(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingById, setUploadingById] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<{ tone: "idle" | "success" | "error"; message: string | null }>({
    tone: bootstrapError ? "error" : "idle",
    message: bootstrapError ? `${text.loadError}: ${bootstrapError}` : null,
  });

  function updateItem(id: string, patch: Partial<WebBrandGuaranteeItem>) {
    setValues((prev) => ({ ...prev, items: prev.items.map((item) => (item.id === id ? { ...item, ...patch } : item)) }));
  }

  function addItem() {
    setValues((prev) => ({ ...prev, items: [...prev.items, createItem()] }));
  }

  function removeItem(id: string) {
    setValues((prev) => ({ ...prev, items: prev.items.filter((item) => item.id !== id) }));
  }

  function moveItem(id: string, direction: -1 | 1) {
    setValues((prev) => {
      const index = prev.items.findIndex((item) => item.id === id);
      if (index < 0) return prev;
      const next = index + direction;
      if (next < 0 || next >= prev.items.length) return prev;
      const items = [...prev.items];
      const [moved] = items.splice(index, 1);
      items.splice(next, 0, moved);
      return { ...prev, items };
    });
  }

  async function handleUpload(id: string, files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploadingById((prev) => ({ ...prev, [id]: true }));
    try {
      const form = new FormData();
      form.set("file", file);
      const response = await fetch("/api/admin/upload/banner-image", { method: "POST", body: form });
      const result = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error || "Upload failed");
      updateItem(id, { logoUrl: result.url });
    } catch (error) {
      setStatus({ tone: "error", message: `${text.saveFailed}: ${error instanceof Error ? error.message : "Unknown error"}` });
    } finally {
      setUploadingById((prev) => ({ ...prev, [id]: false }));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ tone: "idle", message: null });
    setIsSaving(true);
    try {
      const payload = {
        sectionGapPx: values.sectionGapPx,
        sectionTitle: values.sectionTitle,
        sectionSubtitle: values.sectionSubtitle,
        align: values.align,
        effect: values.effect,
        items: values.items
          .map((item) => ({ ...item, logoUrl: item.logoUrl.trim(), altText: item.altText.trim(), linkUrl: item.linkUrl.trim() }))
          .filter((item) => item.logoUrl.length > 0),
      };
      const response = await fetch("/api/admin/web-settings/brand-guarantee", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as BrandGuaranteeResponse;
      if (!response.ok || !result.ok || !result.data) throw new Error(result.error || text.saveFailed);
      setValues(result.data);
      setStatus({ tone: "success", message: text.saved });
    } catch (error) {
      setStatus({ tone: "error", message: `${text.saveFailed}: ${error instanceof Error ? error.message : "Unknown error"}` });
    } finally {
      setIsSaving(false);
    }
  }

  const alignClass = values.align === "left" ? "justify-start" : values.align === "right" ? "justify-end" : "justify-center";
  const effectClass =
    values.effect === "lift"
      ? "hover:-translate-y-1 hover:shadow-xl"
      : values.effect === "glow"
        ? "hover:shadow-[0_0_25px_rgba(59,130,246,0.45)]"
        : values.effect === "pulse"
          ? "hover:scale-[1.03]"
          : "";

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
          <Link href="/admin/web-settings/why-choose-us" className="mt-2 block rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">{text.whyChooseUsMenu}</Link>
          <Link href="/admin/web-settings/middle-banner" className="mt-2 block rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">{text.middleBannerMenu}</Link>
          <Link href="/admin/web-settings/news-cards" className="mt-2 block rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">{text.newsCardsMenu}</Link>
          <div className="mt-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">{text.brandGuaranteeMenu}</div>
        </aside>

        <form onSubmit={handleSubmit} className="space-y-4">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <header className="border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">{text.preview}</p>
            </header>
            <div className="space-y-3 p-4">
              <p className="text-xl font-black text-slate-900">{values.sectionTitle}</p>
              <p className="text-sm text-slate-600">{values.sectionSubtitle}</p>
              <div className={`flex flex-wrap gap-3 ${alignClass}`}>
                {values.items.filter((item) => item.logoUrl.trim().length > 0).map((item) => (
                  <div key={item.id} className={`rounded-2xl border border-slate-200 bg-white p-3 transition ${effectClass}`}>
                    <div className="relative h-16 w-28">
                      <Image src={item.logoUrl} alt="" fill className="object-contain" unoptimized />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="sst-card-soft rounded-2xl p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm font-medium text-slate-700">
                <span>{text.sectionGapPx}</span>
                <input type="number" min={0} max={220} value={values.sectionGapPx} onChange={(event) => setValues((prev) => ({ ...prev, sectionGapPx: Number(event.target.value || 0) }))} className="input-base" />
              </label>
              <label className="space-y-1 text-sm font-medium text-slate-700">
                <span>{text.align}</span>
                <select value={values.align} onChange={(event) => setValues((prev) => ({ ...prev, align: event.target.value as WebBrandGuaranteeSettings["align"] }))} className="input-base">
                  <option value="left">{text.alignLeft}</option>
                  <option value="center">{text.alignCenter}</option>
                  <option value="right">{text.alignRight}</option>
                </select>
              </label>
              <label className="space-y-1 text-sm font-medium text-slate-700 md:col-span-2">
                <span>{text.effect}</span>
                <select value={values.effect} onChange={(event) => setValues((prev) => ({ ...prev, effect: event.target.value as WebBrandGuaranteeSettings["effect"] }))} className="input-base">
                  <option value="none">{text.effectNone}</option>
                  <option value="lift">{text.effectLift}</option>
                  <option value="glow">{text.effectGlow}</option>
                  <option value="pulse">{text.effectPulse}</option>
                </select>
              </label>
              <label className="space-y-1 text-sm font-medium text-slate-700 md:col-span-2">
                <span>{text.sectionTitle}</span>
                <input value={values.sectionTitle} onChange={(event) => setValues((prev) => ({ ...prev, sectionTitle: event.target.value }))} className="input-base" />
              </label>
              <label className="space-y-1 text-sm font-medium text-slate-700 md:col-span-2">
                <span>{text.sectionSubtitle}</span>
                <input value={values.sectionSubtitle} onChange={(event) => setValues((prev) => ({ ...prev, sectionSubtitle: event.target.value }))} className="input-base" />
              </label>
            </div>

            <div className="mt-4 grid gap-3">
              {values.items.map((item, index) => (
                <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-700">Logo {index + 1}</p>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => moveItem(item.id, -1)} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700">{text.moveUp}</button>
                      <button type="button" onClick={() => moveItem(item.id, 1)} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700">{text.moveDown}</button>
                      <button type="button" onClick={() => removeItem(item.id)} className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-600">{text.remove}</button>
                    </div>
                  </div>

                  <label className="space-y-1 text-sm font-medium text-slate-700">
                    <span>{text.logoUrl}</span>
                    <input value={item.logoUrl} onChange={(event) => updateItem(item.id, { logoUrl: event.target.value })} className="input-base" />
                  </label>
                  <div className="mt-2">
                    <label className="inline-flex cursor-pointer items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                      {uploadingById[item.id] ? text.uploading : text.upload}
                      <input type="file" accept="image/*" className="hidden" disabled={uploadingById[item.id]} onChange={(event) => handleUpload(item.id, event.target.files)} />
                    </label>
                  </div>
                  <label className="mt-2 block space-y-1 text-sm font-medium text-slate-700">
                    <span>{text.altText}</span>
                    <input value={item.altText} onChange={(event) => updateItem(item.id, { altText: event.target.value })} className="input-base" />
                  </label>
                  <label className="mt-2 block space-y-1 text-sm font-medium text-slate-700">
                    <span>{text.linkUrl}</span>
                    <input value={item.linkUrl} onChange={(event) => updateItem(item.id, { linkUrl: event.target.value })} className="input-base" />
                  </label>
                </article>
              ))}

              <button type="button" onClick={addItem} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                {text.add}
              </button>
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
