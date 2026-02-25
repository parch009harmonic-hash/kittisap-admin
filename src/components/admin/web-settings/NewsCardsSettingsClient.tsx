"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

import { AdminLocale } from "../../../../lib/i18n/admin";
import { WebNewsCardItem, WebNewsCardsSettings } from "../../../../lib/types/web-settings";
import SaveStatePopup from "./SaveStatePopup";

type NewsCardsSettingsClientProps = {
  locale: AdminLocale;
  initialSettings: WebNewsCardsSettings;
  bootstrapError: string | null;
};

type NewsCardsResponse = {
  ok: boolean;
  data?: WebNewsCardsSettings;
  error?: string;
};

const MAX_ITEMS = 6;

function createItem(): WebNewsCardItem {
  return {
    id: crypto.randomUUID(),
    mediaType: "image",
    title: "",
    meta: "",
    description: "",
    imageUrl: "",
    videoUrl: "",
  };
}

function extractYouTubeId(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.replace("/", "");
    }
    if (parsed.hostname.includes("youtube.com")) {
      return parsed.searchParams.get("v") || "";
    }
    return "";
  } catch {
    return "";
  }
}

export default function NewsCardsSettingsClient({
  locale,
  initialSettings,
  bootstrapError,
}: NewsCardsSettingsClientProps) {
  const text = useMemo(
    () =>
      locale === "th"
        ? {
            section: "ตั้งค่าเว็บ",
            title: "กิจกรรมและข่าวสาร",
            subtitle: "ตั้งค่าบ็อกข่าว/กิจกรรมได้ไม่เกิน 6 บ็อก รองรับรูปภาพและ YouTube",
            quickMenu: "เมนูตั้งค่าเว็บ",
            bannerMenu: "แบนเนอร์",
            homepageMenu: "หน้าแรก",
            imageBoxesMenu: "บ็อกภาพ",
            whyChooseUsMenu: "บ็อกข้อความทำไมเลือกเรา",
            middleBannerMenu: "แถบแบนเนอร์กลางเว็บ",
            newsCardsMenu: "กิจกรรมและข่าวสาร",
            brandGuaranteeMenu: "แบรนด์การันตี",
            sectionGapPx: "ระยะห่างก่อนส่วนกิจกรรม (px)",
            mediaType: "ชนิดสื่อ",
            image: "รูปภาพ",
            youtube: "YouTube",
            titleField: "หัวข้อ",
            meta: "บรรทัดรอง (วันที่ • หมวดหมู่)",
            description: "รายละเอียด",
            imageUrl: "ลิงก์รูป",
            videoUrl: "ลิงก์ YouTube",
            upload: "อัปโหลดรูป",
            uploading: "กำลังอัปโหลด...",
            add: "เพิ่มบ็อก",
            remove: "ลบ",
            maxReached: "เพิ่มได้สูงสุด 6 บ็อก",
            preview: "ตัวอย่างบ็อก",
            save: "บันทึกการตั้งค่า",
            saving: "กำลังบันทึก...",
            saved: "บันทึกเรียบร้อย",
            saveFailed: "บันทึกไม่สำเร็จ",
            loadError: "โหลดค่าเริ่มต้นไม่สำเร็จ ใช้ค่า default ชั่วคราว",
          }
        : {
            section: "Website Settings",
            title: "Activities & News",
            subtitle: "Configure up to 6 cards with image or YouTube media.",
            quickMenu: "Website Menu",
            bannerMenu: "Banner",
            homepageMenu: "Homepage",
            imageBoxesMenu: "Image Boxes",
            whyChooseUsMenu: "Why Choose Us Boxes",
            middleBannerMenu: "Middle Website Banner",
            newsCardsMenu: "Activities & News",
            brandGuaranteeMenu: "Brand Guarantee",
            sectionGapPx: "Gap before news section (px)",
            mediaType: "Media Type",
            image: "Image",
            youtube: "YouTube",
            titleField: "Title",
            meta: "Meta line (date • category)",
            description: "Description",
            imageUrl: "Image URL",
            videoUrl: "YouTube URL",
            upload: "Upload Image",
            uploading: "Uploading...",
            add: "Add Card",
            remove: "Remove",
            maxReached: "Maximum 6 cards",
            preview: "Card Preview",
            save: "Save Settings",
            saving: "Saving...",
            saved: "Saved",
            saveFailed: "Save failed",
            loadError: "Failed to load initial settings. Using defaults.",
          },
    [locale],
  );

  const [values, setValues] = useState<WebNewsCardsSettings>(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingById, setUploadingById] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<{ tone: "idle" | "success" | "error"; message: string | null }>({
    tone: bootstrapError ? "error" : "idle",
    message: bootstrapError ? `${text.loadError}: ${bootstrapError}` : null,
  });

  function updateItem(id: string, patch: Partial<WebNewsCardItem>) {
    setValues((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  }

  function addItem() {
    setValues((prev) => {
      if (prev.items.length >= MAX_ITEMS) return prev;
      return { ...prev, items: [...prev.items, createItem()] };
    });
  }

  function removeItem(id: string) {
    setValues((prev) => ({ ...prev, items: prev.items.filter((item) => item.id !== id) }));
  }

  async function handleUpload(itemId: string, files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploadingById((prev) => ({ ...prev, [itemId]: true }));
    try {
      const form = new FormData();
      form.set("file", file);
      const response = await fetch("/api/admin/upload/banner-image", { method: "POST", body: form });
      const result = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error || "Upload failed");
      updateItem(itemId, { imageUrl: result.url });
    } catch (error) {
      setStatus({ tone: "error", message: `${text.saveFailed}: ${error instanceof Error ? error.message : "Unknown error"}` });
    } finally {
      setUploadingById((prev) => ({ ...prev, [itemId]: false }));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ tone: "idle", message: null });
    setIsSaving(true);
    try {
      const sanitizedItems = values.items
        .map((item) => ({
          ...item,
          title: item.title.trim(),
          meta: item.meta.trim(),
          description: item.description.trim(),
          imageUrl: item.imageUrl.trim(),
          videoUrl: item.videoUrl.trim(),
        }))
        .filter((item) => item.title.length > 0)
        .slice(0, MAX_ITEMS);

      const payload = {
        sectionGapPx: values.sectionGapPx,
        items: sanitizedItems,
      };
      const response = await fetch("/api/admin/web-settings/news-cards", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as NewsCardsResponse;
      if (!response.ok || !result.ok || !result.data) throw new Error(result.error || text.saveFailed);
      setValues(result.data);
      setStatus({ tone: "success", message: text.saved });
    } catch (error) {
      setStatus({ tone: "error", message: `${text.saveFailed}: ${error instanceof Error ? error.message : "Unknown error"}` });
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
          <Link href="/admin/web-settings/middle-banner" className="mt-2 block rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">{text.middleBannerMenu}</Link>
          <div className="mt-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">{text.newsCardsMenu}</div>
          <Link href="/admin/web-settings/brand-guarantee" className="mt-2 block rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">{text.brandGuaranteeMenu}</Link>
        </aside>

        <form onSubmit={handleSubmit} className="space-y-4">
          <section className="sst-card-soft rounded-2xl p-4">
            <label className="space-y-1 text-sm font-medium text-slate-700">
              <span>{text.sectionGapPx}</span>
              <input type="number" min={0} max={220} value={values.sectionGapPx} onChange={(event) => setValues((prev) => ({ ...prev, sectionGapPx: Number(event.target.value || 0) }))} className="input-base" />
            </label>

            <div className="mt-4 grid gap-3">
              {values.items.map((item, index) => {
                const youtubeId = extractYouTubeId(item.videoUrl);
                return (
                  <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-700">Box {index + 1}</p>
                      <button type="button" onClick={() => removeItem(item.id)} className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-600">{text.remove}</button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="space-y-1 text-sm font-medium text-slate-700">
                        <span>{text.mediaType}</span>
                        <select value={item.mediaType} onChange={(event) => updateItem(item.id, { mediaType: event.target.value as WebNewsCardItem["mediaType"] })} className="input-base">
                          <option value="image">{text.image}</option>
                          <option value="youtube">{text.youtube}</option>
                        </select>
                      </label>
                      <label className="space-y-1 text-sm font-medium text-slate-700">
                        <span>{text.titleField}</span>
                        <input value={item.title} onChange={(event) => updateItem(item.id, { title: event.target.value })} className="input-base" />
                      </label>
                    </div>

                    <label className="mt-2 block space-y-1 text-sm font-medium text-slate-700">
                      <span>{text.meta}</span>
                      <input value={item.meta} onChange={(event) => updateItem(item.id, { meta: event.target.value })} className="input-base" />
                    </label>

                    <label className="mt-2 block space-y-1 text-sm font-medium text-slate-700">
                      <span>{text.description}</span>
                      <textarea value={item.description} onChange={(event) => updateItem(item.id, { description: event.target.value })} className="input-base min-h-[84px] resize-y" />
                    </label>

                    {item.mediaType === "image" ? (
                      <>
                        <label className="mt-2 block space-y-1 text-sm font-medium text-slate-700">
                          <span>{text.imageUrl}</span>
                          <input value={item.imageUrl} onChange={(event) => updateItem(item.id, { imageUrl: event.target.value })} className="input-base" placeholder="https://..." />
                        </label>
                        <div className="mt-2">
                          <label className="inline-flex cursor-pointer items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                            {uploadingById[item.id] ? text.uploading : text.upload}
                            <input type="file" accept="image/*" className="hidden" disabled={uploadingById[item.id]} onChange={(event) => handleUpload(item.id, event.target.files)} />
                          </label>
                        </div>
                      </>
                    ) : (
                      <label className="mt-2 block space-y-1 text-sm font-medium text-slate-700">
                        <span>{text.videoUrl}</span>
                        <input value={item.videoUrl} onChange={(event) => updateItem(item.id, { videoUrl: event.target.value })} className="input-base" placeholder="https://www.youtube.com/watch?v=..." />
                      </label>
                    )}

                    <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                      {item.mediaType === "image" && item.imageUrl ? (
                        <div className="relative aspect-[16/8]">
                          <Image src={item.imageUrl} alt="" fill className="object-cover" unoptimized />
                        </div>
                      ) : item.mediaType === "youtube" && youtubeId ? (
                        <img src={`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`} alt="" className="h-auto w-full object-cover" />
                      ) : (
                        <div className="grid aspect-[16/8] place-items-center text-xs text-slate-500">{text.preview}</div>
                      )}
                    </div>
                  </article>
                );
              })}

              <button type="button" onClick={addItem} disabled={!canAdd} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">
                {canAdd ? text.add : text.maxReached}
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
