"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

import { AdminLocale } from "../../../../lib/i18n/admin";
import { WebHomepageImageItem, WebHomepageImageStripSettings } from "../../../../lib/types/web-settings";

type HomepageImageBoxesClientProps = {
  locale: AdminLocale;
  initialSettings: WebHomepageImageStripSettings;
  bootstrapError: string | null;
};

type ImageStripResponse = {
  ok: boolean;
  data?: WebHomepageImageStripSettings;
  error?: string;
};

const MAX_ITEMS = 4;

function createItem(): WebHomepageImageItem {
  return {
    id: crypto.randomUUID(),
    imageUrl: "",
    altText: "",
  };
}

export default function HomepageImageBoxesClient({
  locale,
  initialSettings,
  bootstrapError,
}: HomepageImageBoxesClientProps) {
  const text = useMemo(
    () =>
      locale === "th"
        ? {
            section: "ตั้งค่าเว็บ",
            title: "บ็อกภาพใต้เนื้อหา",
            subtitle: "เพิ่มกล่องภาพต่อจากเนื้อหาได้สูงสุด 4 กล่อง (แนะนำ 3 กล่อง)",
            quickMenu: "เมนูตั้งค่าเว็บ",
            bannerMenu: "แบนเนอร์",
            homepageMenu: "หน้าแรก",
            imageBoxesMenu: "บ็อกภาพ",
            sectionGapPx: "ระยะห่างหลังเนื้อหา (px)",
            imageUrl: "ลิงก์ภาพ",
            altText: "คำบรรยายภาพ (alt)",
            upload: "อัปโหลด",
            uploading: "กำลังอัปโหลด...",
            add: "เพิ่มบ็อกภาพ",
            remove: "ลบ",
            save: "บันทึกการตั้งค่า",
            saving: "กำลังบันทึก...",
            saved: "บันทึกเรียบร้อย",
            saveFailed: "บันทึกไม่สำเร็จ",
            loadError: "โหลดค่าเริ่มต้นไม่สำเร็จ ใช้ค่า default ชั่วคราว",
            maxReached: "เพิ่มได้สูงสุด 4 กล่อง",
          }
        : {
            section: "Website Settings",
            title: "Image Boxes Below Intro",
            subtitle: "Add up to 4 image boxes after intro content (3 recommended).",
            quickMenu: "Website Menu",
            bannerMenu: "Banner",
            homepageMenu: "Homepage",
            imageBoxesMenu: "Image Boxes",
            sectionGapPx: "Gap after Intro (px)",
            imageUrl: "Image URL",
            altText: "Image Alt Text",
            upload: "Upload",
            uploading: "Uploading...",
            add: "Add Box",
            remove: "Remove",
            save: "Save Settings",
            saving: "Saving...",
            saved: "Saved",
            saveFailed: "Save failed",
            loadError: "Failed to load initial settings. Using defaults.",
            maxReached: "Maximum 4 boxes",
          },
    [locale],
  );

  const [values, setValues] = useState<WebHomepageImageStripSettings>(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingById, setUploadingById] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<{ tone: "idle" | "success" | "error"; message: string | null }>({
    tone: bootstrapError ? "error" : "idle",
    message: bootstrapError ? `${text.loadError}: ${bootstrapError}` : null,
  });

  function updateItem(id: string, patch: Partial<WebHomepageImageItem>) {
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
        throw new Error(result.error ?? text.saveFailed);
      }
      updateItem(itemId, { imageUrl: result.url });
    } catch (error) {
      setStatus({
        tone: "error",
        message: `${text.saveFailed}: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    } finally {
      setUploadingById((prev) => ({ ...prev, [itemId]: false }));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ tone: "idle", message: null });

    const filtered = values.items.filter((item) => item.imageUrl.trim().length > 0).slice(0, MAX_ITEMS);

    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/web-settings/homepage-images", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          sectionGapPx: values.sectionGapPx,
          items: filtered,
        }),
      });

      const result = (await response.json()) as ImageStripResponse;
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

      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <aside className="settings-quicknav sst-card-soft rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{text.quickMenu}</p>
          <Link href="/admin/web-settings/banner" className="mt-3 block rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">{text.bannerMenu}</Link>
          <Link href="/admin/web-settings/homepage" className="mt-2 block rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">{text.homepageMenu}</Link>
          <div className="mt-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">{text.imageBoxesMenu}</div>
        </aside>

        <form onSubmit={handleSubmit} className="space-y-4">
          <section className="sst-card-soft rounded-2xl p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm font-medium text-slate-700 md:col-span-2">
                <span>{text.sectionGapPx}</span>
                <input type="number" min={0} max={200} value={values.sectionGapPx} onChange={(event) => setValues((prev) => ({ ...prev, sectionGapPx: Number(event.target.value || 0) }))} className="input-base" />
              </label>

              <div className="md:col-span-2 grid gap-3">
                {values.items.map((item, index) => (
                  <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-700">Box {index + 1}</p>
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
                    </div>

                    <label className="mt-2 block space-y-1 text-sm font-medium text-slate-700">
                      <span>{text.altText}</span>
                      <input value={item.altText} onChange={(event) => updateItem(item.id, { altText: event.target.value })} className="input-base" maxLength={180} />
                    </label>

                    <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                      {item.imageUrl ? (
                        <div className="relative aspect-[16/6]">
                          <Image src={item.imageUrl} alt={item.altText || "Preview"} fill className="object-cover" unoptimized />
                        </div>
                      ) : (
                        <div className="grid aspect-[16/6] place-items-center text-xs text-slate-500">No image</div>
                      )}
                    </div>
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
    </section>
  );
}
