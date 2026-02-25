"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

import { AdminLocale } from "../../../../lib/i18n/admin";
import { WebHomepageImageItem, WebMiddleBannerSettings } from "../../../../lib/types/web-settings";
import SaveStatePopup from "./SaveStatePopup";

type MiddleBannerSettingsClientProps = {
  locale: AdminLocale;
  initialSettings: WebMiddleBannerSettings;
  bootstrapError: string | null;
};

type MiddleBannerResponse = {
  ok: boolean;
  data?: WebMiddleBannerSettings;
  error?: string;
};

const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const MAX_ITEMS = 3;

function createItem(): WebHomepageImageItem {
  return {
    id: crypto.randomUUID(),
    imageUrl: "",
    altText: "",
  };
}

export default function MiddleBannerSettingsClient({
  locale,
  initialSettings,
  bootstrapError,
}: MiddleBannerSettingsClientProps) {
  const text = useMemo(
    () =>
      locale === "th"
        ? {
            section: "ตั้งค่าเว็บ",
            title: "แถบแบนเนอร์กลางเว็บ",
            subtitle: "เพิ่มแถบภาพยาวใต้สินค้าแนะนำ ได้ไม่เกิน 3 แถบ พร้อมปรับสีพื้นหลัง",
            quickMenu: "เมนูตั้งค่าเว็บ",
            bannerMenu: "แบนเนอร์",
            homepageMenu: "หน้าแรก",
            imageBoxesMenu: "บ็อกภาพ",
            whyChooseUsMenu: "บ็อกข้อความทำไมเลือกเรา",
            middleBannerMenu: "แถบแบนเนอร์กลางเว็บ",
            newsCardsMenu: "กิจกรรมและข่าวสาร",
            brandGuaranteeMenu: "แบรนด์การันตี",
            sectionGapRem: "ระยะห่างใต้สินค้าแนะนำ (rem)",
            backgroundColor: "สีพื้นหลังแถบ",
            imageUrl: "ลิงก์รูปแบนเนอร์",
            imageAlt: "คำอธิบายรูป (alt)",
            upload: "อัปโหลดรูป",
            uploading: "กำลังอัปโหลด...",
            clearImage: "ล้างรูป",
            add: "เพิ่มแถบ",
            maxReached: "เพิ่มได้สูงสุด 3 แถบ",
            remove: "ลบ",
            preview: "ตัวอย่างแถบแบนเนอร์",
            save: "บันทึกการตั้งค่า",
            saving: "กำลังบันทึก...",
            saved: "บันทึกเรียบร้อย",
            saveFailed: "บันทึกไม่สำเร็จ",
            loadError: "โหลดค่าเริ่มต้นไม่สำเร็จ ใช้ค่า default ชั่วคราว",
            invalidColor: "รูปแบบสีต้องเป็น #RGB หรือ #RRGGBB",
            uploadFailed: "อัปโหลดรูปไม่สำเร็จ",
          }
        : {
            section: "Website Settings",
            title: "Middle Website Banner",
            subtitle: "Add up to 3 long banners below featured products.",
            quickMenu: "Website Menu",
            bannerMenu: "Banner",
            homepageMenu: "Homepage",
            imageBoxesMenu: "Image Boxes",
            whyChooseUsMenu: "Why Choose Us Boxes",
            middleBannerMenu: "Middle Website Banner",
            newsCardsMenu: "Activities & News",
            brandGuaranteeMenu: "Brand Guarantee",
            sectionGapRem: "Gap below Featured Products (rem)",
            backgroundColor: "Banner Background Color",
            imageUrl: "Banner Image URL",
            imageAlt: "Image Alt Text",
            upload: "Upload Image",
            uploading: "Uploading...",
            clearImage: "Clear Image",
            add: "Add Banner",
            maxReached: "Maximum 3 banners",
            remove: "Remove",
            preview: "Middle Banner Preview",
            save: "Save Settings",
            saving: "Saving...",
            saved: "Saved",
            saveFailed: "Save failed",
            loadError: "Failed to load initial settings. Using defaults.",
            invalidColor: "Color must be #RGB or #RRGGBB",
            uploadFailed: "Upload failed",
          },
    [locale],
  );

  const [values, setValues] = useState<WebMiddleBannerSettings>(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingById, setUploadingById] = useState<Record<string, boolean>>({});
  const [brokenPreviewIds, setBrokenPreviewIds] = useState<string[]>([]);
  const [status, setStatus] = useState<{ tone: "idle" | "success" | "error"; message: string | null }>({
    tone: bootstrapError ? "error" : "idle",
    message: bootstrapError ? `${text.loadError}: ${bootstrapError}` : null,
  });

  function setField<K extends keyof WebMiddleBannerSettings>(field: K, value: WebMiddleBannerSettings[K]) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  function updateItem(id: string, patch: Partial<WebHomepageImageItem>) {
    setValues((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
    setBrokenPreviewIds((prev) => prev.filter((itemId) => itemId !== id));
  }

  function addItem() {
    setValues((prev) => {
      if (prev.items.length >= MAX_ITEMS) {
        return prev;
      }
      return { ...prev, items: [...prev.items, createItem()] };
    });
  }

  function removeItem(id: string) {
    setValues((prev) => ({ ...prev, items: prev.items.filter((item) => item.id !== id) }));
    setBrokenPreviewIds((prev) => prev.filter((itemId) => itemId !== id));
  }

  async function handleUpload(itemId: string, fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;

    setUploadingById((prev) => ({ ...prev, [itemId]: true }));
    setStatus({ tone: "idle", message: null });

    try {
      const formData = new FormData();
      formData.set("file", file);
      const response = await fetch("/api/admin/upload/banner-image", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !result.url) {
        throw new Error(result.error ?? text.uploadFailed);
      }
      updateItem(itemId, { imageUrl: result.url });
    } catch (error) {
      setStatus({
        tone: "error",
        message: `${text.uploadFailed}: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    } finally {
      setUploadingById((prev) => ({ ...prev, [itemId]: false }));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ tone: "idle", message: null });

    if (!HEX_COLOR_RE.test(values.backgroundColor)) {
      setStatus({ tone: "error", message: text.invalidColor });
      return;
    }

    const filtered = values.items.filter((item) => item.imageUrl.trim().length > 0).slice(0, MAX_ITEMS);

    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/web-settings/middle-banner", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          sectionGapRem: values.sectionGapRem,
          backgroundColor: values.backgroundColor,
          items: filtered,
        }),
      });

      const result = (await response.json()) as MiddleBannerResponse;
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
          <Link href="/admin/web-settings/why-choose-us" className="mt-2 block rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">{text.whyChooseUsMenu}</Link>
          <div className="mt-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">{text.middleBannerMenu}</div>
          <Link href="/admin/web-settings/news-cards" className="mt-2 block rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">{text.newsCardsMenu}</Link>
          <Link href="/admin/web-settings/brand-guarantee" className="mt-2 block rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">{text.brandGuaranteeMenu}</Link>
        </aside>

        <form onSubmit={handleSubmit} className="space-y-4">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <header className="border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">{text.preview}</p>
            </header>
            <div className="space-y-3 p-4" style={{ backgroundColor: values.backgroundColor }}>
              {values.items.filter((item) => !brokenPreviewIds.includes(item.id)).length > 0 ? values.items.filter((item) => !brokenPreviewIds.includes(item.id)).map((item) => (
                <article key={item.id} className="overflow-hidden rounded-2xl border border-white/20 bg-black/20">
                  <div className="relative aspect-[21/6] w-full">
                    <Image
                      src={item.imageUrl}
                      alt=""
                      fill
                      className="object-cover"
                      unoptimized
                      onError={() => {
                        setBrokenPreviewIds((prev) => (prev.includes(item.id) ? prev : [...prev, item.id]));
                      }}
                    />
                  </div>
                </article>
              )) : (
                <div className="grid aspect-[21/6] place-items-center rounded-2xl border border-white/20 bg-black/20 text-sm text-slate-200/80">No banner image</div>
              )}
            </div>
          </section>

          <section className="sst-card-soft rounded-2xl p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm font-medium text-slate-700">
                <span>{text.sectionGapRem}</span>
                <input type="number" step="0.01" min={0} max={5} value={values.sectionGapRem} onChange={(event) => setField("sectionGapRem", Number(event.target.value || 0))} className="input-base" />
              </label>

              <label className="space-y-1 text-sm font-medium text-slate-700">
                <span>{text.backgroundColor}</span>
                <input value={values.backgroundColor} onChange={(event) => setField("backgroundColor", event.target.value)} className="input-base" />
              </label>

              <div className="grid gap-3 md:col-span-2">
                {values.items.map((item, index) => (
                  <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-700">Banner {index + 1}</p>
                      <button type="button" onClick={() => removeItem(item.id)} className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-600">{text.remove}</button>
                    </div>

                    <label className="space-y-1 text-sm font-medium text-slate-700">
                      <span>{text.imageUrl}</span>
                      <input value={item.imageUrl} onChange={(event) => updateItem(item.id, { imageUrl: event.target.value })} className="input-base" placeholder="https://..." />
                    </label>

                    <div className="mt-2">
                      <label className="inline-flex cursor-pointer items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                        {uploadingById[item.id] ? text.uploading : text.upload}
                        <input type="file" accept="image/*" className="hidden" disabled={uploadingById[item.id]} onChange={(event) => handleUpload(item.id, event.target.files)} />
                      </label>
                      <button type="button" onClick={() => updateItem(item.id, { imageUrl: "" })} className="ml-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">{text.clearImage}</button>
                    </div>

                    <label className="mt-2 block space-y-1 text-sm font-medium text-slate-700">
                      <span>{text.imageAlt}</span>
                      <input value={item.altText} onChange={(event) => updateItem(item.id, { altText: event.target.value })} className="input-base" maxLength={180} />
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
