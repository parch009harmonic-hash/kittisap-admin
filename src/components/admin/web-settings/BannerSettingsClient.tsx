"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, ReactNode, useMemo, useState } from "react";

import { AdminLocale } from "../../../../lib/i18n/admin";
import { WebBannerSettings } from "../../../../lib/types/web-settings";

type BannerSettingsClientProps = {
  locale: AdminLocale;
  initialSettings: WebBannerSettings;
  bootstrapError: string | null;
};

type BannerResponse = {
  ok: boolean;
  data?: WebBannerSettings;
  error?: string;
};

const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export default function BannerSettingsClient({ locale, initialSettings, bootstrapError }: BannerSettingsClientProps) {
  const text = useMemo(
    () =>
      locale === "th"
        ? {
            section: "ตั้งค่าเว็บ",
            title: "แบนเนอร์หน้าแรก",
            subtitle: "ปรับหัวข้อ เนื้อหา สีพื้นหลัง ปุ่ม และดีไซน์กรอบภาพแบนเนอร์",
            quickMenu: "เมนูตั้งค่าเว็บ",
            bannerMenu: "แบนเนอร์",
            homepageMenu: "หน้าแรก",
            imageBoxesMenu: "บ็อกภาพ",
            eyebrow: "หัวข้อย่อย",
            heading: "หัวข้อหลัก",
            description: "คำอธิบาย",
            primaryButton: "ชื่อปุ่มหลัก",
            secondaryButton: "ชื่อปุ่มรอง",
            showButtons: "แสดงปุ่มแบนเนอร์",
            contentAlign: "การจัดตำแหน่งข้อความ",
            alignLeft: "ชิดซ้าย",
            alignCenter: "กึ่งกลาง",
            alignRight: "ชิดขวา",
            autoHeight: "ขนาดแบนเนอร์พอดีข้อความ",
            minHeight: "ความสูงแบนเนอร์ขั้นต่ำ (px)",
            eyebrowFontSize: "ขนาดหัวข้อย่อย (px)",
            titleFontSize: "ขนาดหัวข้อหลัก (px)",
            descriptionFontSize: "ขนาดคำอธิบาย (px)",
            textEffect: "ลูกเล่นข้อความ",
            effectNone: "ไม่มี",
            effectShadow: "เงา",
            effectGlow: "เรืองแสง",
            effectGradient: "ไล่สี",
            bgFrom: "สีพื้นหลังเริ่มต้น",
            bgTo: "สีพื้นหลังปลายทาง",
            bannerImageUrl: "ลิงก์รูปแบนเนอร์",
            uploadImage: "อัปโหลดรูปใหม่",
            uploadingImage: "กำลังอัปโหลด...",
            clearImage: "ล้างรูป",
            frameEnabled: "เปิดกรอบภาพ",
            frameStyle: "รูปแบบกรอบภาพ",
            frameColor: "สีกรอบ",
            frameRadius: "ความโค้งกรอบ (px)",
            frameBorderWidth: "ความหนากรอบ (px)",
            imageMotion: "ลูกเล่นภาพ",
            styleSoft: "Soft",
            styleGlass: "Glass",
            styleNeon: "Neon",
            styleMinimal: "Minimal",
            motionNone: "ไม่เคลื่อนไหว",
            motionSlide: "เลื่อนซ้าย-ขวา",
            motionFloat: "ลอยขึ้น-ลง",
            motionZoom: "ซูมเข้า-ออก",
            motionTilt: "เอียงนุ่มๆ",
            save: "บันทึกการตั้งค่า",
            saving: "กำลังบันทึก...",
            saved: "บันทึกเรียบร้อย",
            saveFailed: "บันทึกไม่สำเร็จ",
            preview: "ตัวอย่างแบนเนอร์",
            previewHint: "ตัวอย่างจะอัปเดตทันทีตามค่าที่กรอก",
            showPreview: "ดูวิว",
            hidePreview: "ซ่อนวิว",
            loadError: "โหลดค่าเริ่มต้นไม่สำเร็จ ใช้ค่า default ชั่วคราว",
            invalidColor: "รูปแบบสีต้องเป็น #RGB หรือ #RRGGBB",
            uploadFailed: "อัปโหลดรูปไม่สำเร็จ",
          }
        : {
            section: "Website Settings",
            title: "Homepage Banner",
            subtitle: "Configure heading, content, colors, button labels and image frame effects.",
            quickMenu: "Website Menu",
            bannerMenu: "Banner",
            homepageMenu: "Homepage",
            imageBoxesMenu: "Image Boxes",
            eyebrow: "Eyebrow",
            heading: "Heading",
            description: "Description",
            primaryButton: "Primary Button Label",
            secondaryButton: "Secondary Button Label",
            showButtons: "Show Banner Buttons",
            contentAlign: "Text Alignment",
            alignLeft: "Left",
            alignCenter: "Center",
            alignRight: "Right",
            autoHeight: "Auto-fit Banner Height",
            minHeight: "Banner Min Height (px)",
            eyebrowFontSize: "Eyebrow Size (px)",
            titleFontSize: "Title Size (px)",
            descriptionFontSize: "Description Size (px)",
            textEffect: "Text Effect",
            effectNone: "None",
            effectShadow: "Shadow",
            effectGlow: "Glow",
            effectGradient: "Gradient",
            bgFrom: "Background From",
            bgTo: "Background To",
            bannerImageUrl: "Banner Image URL",
            uploadImage: "Upload Image",
            uploadingImage: "Uploading...",
            clearImage: "Clear Image",
            frameEnabled: "Enable Image Frame",
            frameStyle: "Frame Style",
            frameColor: "Frame Color",
            frameRadius: "Frame Radius (px)",
            frameBorderWidth: "Frame Border Width (px)",
            imageMotion: "Image Motion",
            styleSoft: "Soft",
            styleGlass: "Glass",
            styleNeon: "Neon",
            styleMinimal: "Minimal",
            motionNone: "None",
            motionSlide: "Slide Left/Right",
            motionFloat: "Float Up/Down",
            motionZoom: "Zoom In/Out",
            motionTilt: "Gentle Tilt",
            save: "Save Settings",
            saving: "Saving...",
            saved: "Saved",
            saveFailed: "Save failed",
            preview: "Banner Preview",
            previewHint: "Preview updates instantly while editing.",
            showPreview: "Show Preview",
            hidePreview: "Hide Preview",
            loadError: "Failed to load initial settings. Using defaults.",
            invalidColor: "Color must be #RGB or #RRGGBB",
            uploadFailed: "Upload failed",
          },
    [locale],
  );

  const [values, setValues] = useState<WebBannerSettings>(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [status, setStatus] = useState<{ tone: "idle" | "success" | "error"; message: string | null }>({
    tone: bootstrapError ? "error" : "idle",
    message: bootstrapError ? `${text.loadError}: ${bootstrapError}` : null,
  });

  function setField<K extends keyof WebBannerSettings>(field: K, value: WebBannerSettings[K]) {
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
      setStatus({ tone: "error", message: `${text.uploadFailed}: ${error instanceof Error ? error.message : "Unknown error"}` });
    } finally {
      setIsUploadingImage(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ tone: "idle", message: null });

    if (![values.backgroundFrom, values.backgroundTo, values.imageFrameColor].every((value) => HEX_COLOR_RE.test(value))) {
      setStatus({ tone: "error", message: text.invalidColor });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/web-settings/banner", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(values),
      });

      const result = (await response.json()) as BannerResponse;
      if (!response.ok || !result.ok || !result.data) {
        throw new Error(result.error || text.saveFailed);
      }

      setValues(result.data);
      setStatus({ tone: "success", message: text.saved });
    } catch (error) {
      setStatus({ tone: "error", message: `${text.saveFailed}: ${error instanceof Error ? error.message : "Unknown error"}` });
    } finally {
      setIsSaving(false);
    }
  }

  const motionClass = values.imageMotion === "none" ? "" : `banner-motion-${values.imageMotion}`;
  const styleClass = `banner-frame-${values.imageFrameStyle}`;
  const alignmentClass =
    values.contentAlign === "center"
      ? "items-center text-center"
      : values.contentAlign === "right"
        ? "items-end text-right"
        : "items-start text-left";
  const buttonAlignClass =
    values.contentAlign === "center" ? "justify-center" : values.contentAlign === "right" ? "justify-end" : "justify-start";
  const titleEffectClass =
    values.textEffect === "gradient"
      ? "bg-gradient-to-r from-amber-200 via-white to-cyan-200 bg-clip-text text-transparent"
      : "";
  const titleEffectStyle =
    values.textEffect === "shadow"
      ? { textShadow: "0 8px 24px rgba(15,23,42,0.45)" }
      : values.textEffect === "glow"
        ? { textShadow: "0 0 20px rgba(59,130,246,0.5)" }
        : undefined;

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
          <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">{text.bannerMenu}</div>
          <Link href="/admin/web-settings/homepage" className="mt-2 block rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">{text.homepageMenu}</Link>
          <Link href="/admin/web-settings/homepage-images" className="mt-2 block rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">{text.imageBoxesMenu}</Link>
        </aside>

        <form onSubmit={handleSubmit} className="space-y-4">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{text.preview}</p>
                <p className="text-xs text-slate-500">{text.previewHint}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsPreviewVisible((prev) => !prev)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                {isPreviewVisible ? text.hidePreview : text.showPreview}
              </button>
            </header>
            {isPreviewVisible ? (
              <div className="p-4">
                <article className="rounded-2xl border border-white/15 p-5 text-slate-50" style={{ background: `linear-gradient(135deg, ${values.backgroundFrom}, ${values.backgroundTo})` }}>
                  <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
                    <div className={`flex flex-col ${alignmentClass}`} style={{ minHeight: values.autoHeight ? undefined : `${values.minHeightPx}px` }}>
                      <p className="uppercase tracking-[0.2em] text-amber-200" style={{ fontSize: `${values.eyebrowFontSizePx}px`, fontWeight: 800 }}>{values.eyebrow}</p>
                      <p
                        className={`mt-2 font-black md:text-2xl ${titleEffectClass}`}
                        style={{
                          fontSize: `${Math.max(24, Math.min(values.titleFontSizePx, 56))}px`,
                          color: values.textEffect === "gradient" ? undefined : "#f8fafc",
                          ...titleEffectStyle,
                        }}
                      >
                        {values.title}
                      </p>
                      <p className="mt-2 text-slate-100/85" style={{ fontSize: `${values.descriptionFontSizePx}px` }}>{values.description}</p>
                      {values.showButtons ? (
                        <div className={`mt-4 flex w-full flex-wrap gap-2 ${buttonAlignClass}`}>
                          <span className="inline-flex rounded-full border border-amber-400/40 bg-amber-500/15 px-4 py-2 text-xs font-extrabold text-amber-200">{values.primaryButtonLabel}</span>
                          <span className="inline-flex rounded-full border border-slate-300/35 bg-white/5 px-4 py-2 text-xs font-extrabold text-slate-50">{values.secondaryButtonLabel}</span>
                        </div>
                      ) : null}
                    </div>

                    <div
                      className={`${values.imageFrameEnabled ? styleClass : ""} overflow-hidden`}
                      style={{
                        borderColor: values.imageFrameColor,
                        borderWidth: values.imageFrameEnabled ? `${values.imageFrameBorderWidthPx}px` : "0px",
                        borderStyle: values.imageFrameEnabled ? "solid" : "none",
                        borderRadius: `${values.imageFrameRadiusPx}px`,
                      }}
                    >
                      {values.imageUrl ? (
                        <div className="relative aspect-[16/10]">
                          <Image src={values.imageUrl} alt="Banner preview" fill className={`object-cover ${motionClass}`} unoptimized />
                        </div>
                      ) : (
                        <div className="grid aspect-[16/10] place-items-center text-xs text-slate-200/70">No image</div>
                      )}
                    </div>
                  </div>
                </article>
              </div>
            ) : null}
          </section>

          <section className="sst-card-soft rounded-2xl p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={text.eyebrow}><input value={values.eyebrow} onChange={(e) => setField("eyebrow", e.target.value)} className="input-base" maxLength={80} /></Field>
              <Field label={text.heading}><input value={values.title} onChange={(e) => setField("title", e.target.value)} className="input-base" maxLength={240} /></Field>
              <Field label={text.description} className="md:col-span-2"><textarea value={values.description} onChange={(e) => setField("description", e.target.value)} className="input-base min-h-[92px] resize-y" maxLength={500} /></Field>
              <Field label={text.primaryButton}><input value={values.primaryButtonLabel} onChange={(e) => setField("primaryButtonLabel", e.target.value)} className="input-base" maxLength={80} /></Field>
              <Field label={text.secondaryButton}><input value={values.secondaryButtonLabel} onChange={(e) => setField("secondaryButtonLabel", e.target.value)} className="input-base" maxLength={80} /></Field>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 md:col-span-2">
                <input type="checkbox" checked={values.showButtons} onChange={(e) => setField("showButtons", e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
                <span>{text.showButtons}</span>
              </label>
              <Field label={text.contentAlign}>
                <select value={values.contentAlign} onChange={(e) => setField("contentAlign", e.target.value as WebBannerSettings["contentAlign"])} className="input-base">
                  <option value="left">{text.alignLeft}</option>
                  <option value="center">{text.alignCenter}</option>
                  <option value="right">{text.alignRight}</option>
                </select>
              </Field>
              <Field label={text.textEffect}>
                <select value={values.textEffect} onChange={(e) => setField("textEffect", e.target.value as WebBannerSettings["textEffect"])} className="input-base">
                  <option value="none">{text.effectNone}</option>
                  <option value="shadow">{text.effectShadow}</option>
                  <option value="glow">{text.effectGlow}</option>
                  <option value="gradient">{text.effectGradient}</option>
                </select>
              </Field>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 md:col-span-2">
                <input type="checkbox" checked={values.autoHeight} onChange={(e) => setField("autoHeight", e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
                <span>{text.autoHeight}</span>
              </label>
              <Field label={text.minHeight}><input type="number" min={220} max={720} value={values.minHeightPx} onChange={(e) => setField("minHeightPx", Number(e.target.value || 220))} className="input-base" disabled={values.autoHeight} /></Field>
              <Field label={text.eyebrowFontSize}><input type="number" min={10} max={24} value={values.eyebrowFontSizePx} onChange={(e) => setField("eyebrowFontSizePx", Number(e.target.value || 11))} className="input-base" /></Field>
              <Field label={text.titleFontSize}><input type="number" min={24} max={96} value={values.titleFontSizePx} onChange={(e) => setField("titleFontSizePx", Number(e.target.value || 56))} className="input-base" /></Field>
              <Field label={text.descriptionFontSize}><input type="number" min={12} max={36} value={values.descriptionFontSizePx} onChange={(e) => setField("descriptionFontSizePx", Number(e.target.value || 18))} className="input-base" /></Field>
              <ColorField label={text.bgFrom} value={values.backgroundFrom} onChange={(v) => setField("backgroundFrom", v)} />
              <ColorField label={text.bgTo} value={values.backgroundTo} onChange={(v) => setField("backgroundTo", v)} />

              <Field label={text.bannerImageUrl} className="md:col-span-2">
                <input value={values.imageUrl ?? ""} onChange={(e) => setField("imageUrl", e.target.value || null)} className="input-base" placeholder="https://..." />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                    {isUploadingImage ? text.uploadingImage : text.uploadImage}
                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e.target.files)} className="hidden" disabled={isUploadingImage} />
                  </label>
                  <button type="button" onClick={() => setField("imageUrl", null)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">{text.clearImage}</button>
                </div>
              </Field>

              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 md:col-span-2">
                <input type="checkbox" checked={values.imageFrameEnabled} onChange={(e) => setField("imageFrameEnabled", e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
                <span>{text.frameEnabled}</span>
              </label>

              <Field label={text.frameStyle}>
                <select value={values.imageFrameStyle} onChange={(e) => setField("imageFrameStyle", e.target.value as WebBannerSettings["imageFrameStyle"])} className="input-base">
                  <option value="soft">{text.styleSoft}</option>
                  <option value="glass">{text.styleGlass}</option>
                  <option value="neon">{text.styleNeon}</option>
                  <option value="minimal">{text.styleMinimal}</option>
                </select>
              </Field>

              <Field label={text.imageMotion}>
                <select value={values.imageMotion} onChange={(e) => setField("imageMotion", e.target.value as WebBannerSettings["imageMotion"])} className="input-base">
                  <option value="none">{text.motionNone}</option>
                  <option value="slide_lr">{text.motionSlide}</option>
                  <option value="float_ud">{text.motionFloat}</option>
                  <option value="zoom">{text.motionZoom}</option>
                  <option value="tilt">{text.motionTilt}</option>
                </select>
              </Field>

              <ColorField label={text.frameColor} value={values.imageFrameColor} onChange={(v) => setField("imageFrameColor", v)} />
              <Field label={text.frameRadius}><input type="number" min={0} max={40} value={values.imageFrameRadiusPx} onChange={(e) => setField("imageFrameRadiusPx", Number(e.target.value || 0))} className="input-base" /></Field>
              <Field label={text.frameBorderWidth}><input type="number" min={0} max={8} value={values.imageFrameBorderWidthPx} onChange={(e) => setField("imageFrameBorderWidthPx", Number(e.target.value || 0))} className="input-base" /></Field>
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

function Field({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <label className={`space-y-1 text-sm font-medium text-slate-700 ${className ?? ""}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function ColorField({ label, value, onChange, className }: { label: string; value: string; onChange: (value: string) => void; className?: string }) {
  return (
    <label className={`space-y-1 text-sm font-medium text-slate-700 ${className ?? ""}`}>
      <span>{label}</span>
      <div className="flex gap-2">
        <input type="color" value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-14 rounded border border-slate-300 bg-white p-1" />
        <input value={value} onChange={(event) => onChange(event.target.value)} className="input-base" maxLength={7} />
      </div>
    </label>
  );
}
