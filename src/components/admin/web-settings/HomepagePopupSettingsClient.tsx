"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

import { AdminLocale } from "../../../../lib/i18n/admin";
import { WebHomepagePopupSettings } from "../../../../lib/types/web-settings";
import SaveStatePopup from "./SaveStatePopup";

type HomepagePopupSettingsClientProps = {
  locale: AdminLocale;
  initialSettings: WebHomepagePopupSettings;
  bootstrapError: string | null;
};

type HomepagePopupResponse = {
  ok: boolean;
  data?: WebHomepagePopupSettings;
  error?: string;
};

export default function HomepagePopupSettingsClient({
  locale,
  initialSettings,
  bootstrapError,
}: HomepagePopupSettingsClientProps) {
  const text = useMemo(
    () =>
      locale === "th"
        ? {
            section: "ตั้งค่าเว็บ",
            title: "Popup โปรโมชันหน้าแรก",
            subtitle: "แสดง Popup โปรโมชันเมื่อผู้ใช้เข้าหน้าแรก",
            quickMenu: "เมนูตั้งค่าเว็บ",
            bannerMenu: "แบนเนอร์",
            homepageMenu: "หน้าแรก",
            imageBoxesMenu: "บ็อกภาพ",
            whyChooseUsMenu: "บ็อกข้อความทำไมเลือกเรา",
            middleBannerMenu: "แถบแบนเนอร์กลางเว็บ",
            newsCardsMenu: "กิจกรรมและข่าวสาร",
            brandGuaranteeMenu: "แบรนด์การันตี",
            popupMenu: "Popup หน้าแรก",
            enabled: "เปิดใช้งาน Popup",
            imageUrl: "ลิงก์รูปภาพ Popup",
            uploadImage: "อัปโหลดรูป",
            uploadingImage: "กำลังอัปโหลด...",
            clearImage: "ล้างรูป",
            altText: "ข้อความอธิบายรูป (Alt)",
            targetUrl: "ลิงก์ปลายทางเมื่อคลิก Popup (ถ้ามี)",
            openInNewTab: "เปิดลิงก์ในแท็บใหม่",
            showOnEveryVisit: "แสดงทุกครั้งที่เข้าหน้าแรก",
            delayMs: "หน่วงเวลาก่อนแสดง (ms)",
            backdropOpacityPercent: "ความทึบพื้นหลัง (%)",
            panelOpacityPercent: "ความทึบตัว Popup (%)",
            preview: "ตัวอย่าง Popup",
            previewEmpty: "เพิ่มรูปภาพเพื่อดูตัวอย่าง",
            save: "บันทึกการตั้งค่า",
            saving: "กำลังบันทึก...",
            saved: "บันทึกเรียบร้อย",
            saveFailed: "บันทึกไม่สำเร็จ",
            uploadFailed: "อัปโหลดรูปไม่สำเร็จ",
            loadError: "โหลดค่าเริ่มต้นไม่สำเร็จ ใช้ค่า default ชั่วคราว",
          }
        : {
            section: "Website Settings",
            title: "Homepage Promotion Popup",
            subtitle: "Show a promotion popup when customers open homepage",
            quickMenu: "Website Menu",
            bannerMenu: "Banner",
            homepageMenu: "Homepage",
            imageBoxesMenu: "Image Boxes",
            whyChooseUsMenu: "Why Choose Us Boxes",
            middleBannerMenu: "Middle Website Banner",
            newsCardsMenu: "Activities & News",
            brandGuaranteeMenu: "Brand Guarantee",
            popupMenu: "Homepage Popup",
            enabled: "Enable Popup",
            imageUrl: "Popup Image URL",
            uploadImage: "Upload Image",
            uploadingImage: "Uploading...",
            clearImage: "Clear Image",
            altText: "Image Alt Text",
            targetUrl: "Target URL when clicking popup (optional)",
            openInNewTab: "Open link in new tab",
            showOnEveryVisit: "Show every time homepage opens",
            delayMs: "Show delay (ms)",
            backdropOpacityPercent: "Backdrop opacity (%)",
            panelOpacityPercent: "Popup panel opacity (%)",
            preview: "Popup Preview",
            previewEmpty: "Upload image to preview popup",
            save: "Save Settings",
            saving: "Saving...",
            saved: "Saved",
            saveFailed: "Save failed",
            uploadFailed: "Upload failed",
            loadError: "Failed to load initial settings. Using defaults.",
          },
    [locale],
  );

  const [values, setValues] = useState<WebHomepagePopupSettings>(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [status, setStatus] = useState<{ tone: "idle" | "success" | "error"; message: string | null }>({
    tone: bootstrapError ? "error" : "idle",
    message: bootstrapError ? `${text.loadError}: ${bootstrapError}` : null,
  });

  function setField<K extends keyof WebHomepagePopupSettings>(field: K, value: WebHomepagePopupSettings[K]) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  async function handleImageUpload(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    setStatus({ tone: "idle", message: null });
    try {
      const formData = new FormData();
      formData.set("file", file);
      const response = await fetch("/api/admin/upload/banner-image", { method: "POST", body: formData });
      const result = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !result.url) {
        throw new Error(result.error ?? text.uploadFailed);
      }
      setField("imageUrl", result.url);
    } catch (error) {
      setStatus({
        tone: "error",
        message: `${text.uploadFailed}: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    } finally {
      setIsUploadingImage(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ tone: "idle", message: null });
    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/web-settings/homepage-popup", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(values),
      });

      const result = (await response.json()) as HomepagePopupResponse;
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
          <Link href="/admin/web-settings/brand-guarantee" className="mt-2 block rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">{text.brandGuaranteeMenu}</Link>
          <div className="mt-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">{text.popupMenu}</div>
        </aside>

        <form onSubmit={handleSubmit} className="space-y-4">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <header className="border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">{text.preview}</p>
            </header>
            <div className="relative min-h-[280px] bg-slate-950/85 p-4">
              <div
                className="absolute inset-0"
                style={{ backgroundColor: `rgba(2, 6, 23, ${values.backdropOpacityPercent / 100})` }}
              />
              <div className="relative mx-auto flex min-h-[248px] max-w-[320px] items-center justify-center">
                {values.imageUrl ? (
                  <div
                    className="relative w-full overflow-hidden rounded-2xl border border-white/20 shadow-2xl"
                    style={{ backgroundColor: `rgba(255, 255, 255, ${values.panelOpacityPercent / 100})` }}
                  >
                    <div className="absolute right-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-full bg-white/95 text-lg font-bold text-slate-700 shadow">
                      ×
                    </div>
                    <div className="relative aspect-[4/5] w-full">
                      <Image src={values.imageUrl} alt={values.altText || "Popup image"} fill className="object-cover" unoptimized />
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-300/50 bg-white/5 px-5 py-8 text-center text-sm text-slate-200/80">
                    {text.previewEmpty}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="sst-card-soft rounded-2xl p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 md:col-span-2">
                <input
                  type="checkbox"
                  checked={values.enabled}
                  onChange={(event) => setField("enabled", event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span>{text.enabled}</span>
              </label>

              <label className="space-y-1 text-sm font-medium text-slate-700 md:col-span-2">
                <span>{text.imageUrl}</span>
                <input
                  value={values.imageUrl ?? ""}
                  onChange={(event) => setField("imageUrl", event.target.value || null)}
                  className="input-base"
                  placeholder="https://..."
                />
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                    {isUploadingImage ? text.uploadingImage : text.uploadImage}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => handleImageUpload(event.target.files)}
                      className="hidden"
                      disabled={isUploadingImage}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setField("imageUrl", null)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {text.clearImage}
                  </button>
                </div>
              </label>

              <label className="space-y-1 text-sm font-medium text-slate-700">
                <span>{text.altText}</span>
                <input
                  value={values.altText}
                  onChange={(event) => setField("altText", event.target.value)}
                  className="input-base"
                  maxLength={180}
                />
              </label>

              <label className="space-y-1 text-sm font-medium text-slate-700">
                <span>{text.targetUrl}</span>
                <input
                  value={values.targetUrl}
                  onChange={(event) => setField("targetUrl", event.target.value)}
                  className="input-base"
                  placeholder="https://..."
                  maxLength={500}
                />
              </label>

              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={values.openInNewTab}
                  onChange={(event) => setField("openInNewTab", event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span>{text.openInNewTab}</span>
              </label>

              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={values.showOnEveryVisit}
                  onChange={(event) => setField("showOnEveryVisit", event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span>{text.showOnEveryVisit}</span>
              </label>

              <label className="space-y-1 text-sm font-medium text-slate-700">
                <span>{text.delayMs}</span>
                <input
                  type="number"
                  min={0}
                  max={10000}
                  value={values.delayMs}
                  onChange={(event) => setField("delayMs", Number(event.target.value || 0))}
                  className="input-base"
                />
              </label>

              <label className="space-y-1 text-sm font-medium text-slate-700">
                <span>{text.backdropOpacityPercent}</span>
                <input
                  type="number"
                  min={10}
                  max={95}
                  value={values.backdropOpacityPercent}
                  onChange={(event) => setField("backdropOpacityPercent", Number(event.target.value || 72))}
                  className="input-base"
                />
              </label>

              <label className="space-y-1 text-sm font-medium text-slate-700">
                <span>{text.panelOpacityPercent}</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={values.panelOpacityPercent}
                  onChange={(event) => setField("panelOpacityPercent", Number(event.target.value || 100))}
                  className="input-base"
                />
              </label>
            </div>
          </section>

          <div className="flex items-center justify-between">
            <p
              className={`text-sm ${
                status.tone === "error" ? "text-rose-600" : status.tone === "success" ? "text-emerald-600" : "text-slate-500"
              }`}
            >
              {status.message}
            </p>
            <button
              type="submit"
              disabled={isSaving}
              className="btn-primary rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {isSaving ? text.saving : text.save}
            </button>
          </div>
        </form>
      </div>
      <SaveStatePopup
        isSaving={isSaving}
        isSuccess={status.tone === "success"}
        savingText={text.saving}
        successText={text.saved}
      />
    </section>
  );
}
