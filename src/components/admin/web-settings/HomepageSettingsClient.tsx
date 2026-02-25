"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

import { AdminLocale } from "../../../../lib/i18n/admin";
import { WebHomepageAppearanceSettings } from "../../../../lib/types/web-settings";
import SaveStatePopup from "./SaveStatePopup";

type HomepageSettingsClientProps = {
  locale: AdminLocale;
  initialSettings: WebHomepageAppearanceSettings;
  bootstrapError: string | null;
};

type HomepageResponse = {
  ok: boolean;
  data?: WebHomepageAppearanceSettings;
  error?: string;
};

const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const FONT_WEIGHT_OPTIONS = [300, 400, 500, 600, 700, 800, 900] as const;

export default function HomepageSettingsClient({
  locale,
  initialSettings,
  bootstrapError,
}: HomepageSettingsClientProps) {
  const text = useMemo(
    () =>
      locale === "th"
        ? {
            section: "ตั้งค่าเว็บ",
            title: "หน้าแรก",
            subtitle: "กำหนดสีพื้นหลังและรูปแบบข้อความส่วนใต้แบนเนอร์",
            quickMenu: "เมนูตั้งค่าเว็บ",
            bannerMenu: "แบนเนอร์",
            homepageMenu: "หน้าแรก",
            imageBoxesMenu: "บ็อกภาพ",
            whyChooseUsMenu: "บ็อกข้อความทำไมเลือกเรา",
            middleBannerMenu: "แถบแบนเนอร์กลางเว็บ",
            newsCardsMenu: "กิจกรรมและข่าวสาร",
            brandGuaranteeMenu: "แบรนด์การันตี",
            pageBackgroundColor: "ส่วนที่ 1: พื้นหลังเว็บ",
            footerBottomBackgroundColor: "ส่วนที่ 2: พื้นหลังล่างสุด",
            textColor: "สีตัวหนังสือทั่วไป",
            introTitle: "หัวข้อใต้แบนเนอร์",
            introContent: "เนื้อหาใต้แบนเนอร์",
            sectionGapPx: "ระยะห่างหลังแบนเนอร์ (px)",
            introCardBackgroundColor: "สีพื้นหลังกล่องข้อความ",
            introTitleColor: "สีตัวหนังสือหัวข้อ",
            introContentColor: "สีตัวหนังสือเนื้อหา",
            introTitleFontSizePx: "ขนาดตัวหนังสือหัวข้อ (px)",
            introContentFontSizePx: "ขนาดตัวหนังสือเนื้อหา (px)",
            introTitleFontWeight: "น้ำหนักหัวข้อ",
            introContentFontWeight: "น้ำหนักเนื้อหา",
            introTextGlow: "ลูกเล่น: เรืองแสงข้อความ",
            save: "บันทึกการตั้งค่า",
            saving: "กำลังบันทึก...",
            saved: "บันทึกเรียบร้อย",
            saveFailed: "บันทึกไม่สำเร็จ",
            loadError: "โหลดค่าเริ่มต้นไม่สำเร็จ ใช้ค่า default ชั่วคราว",
            invalidColor: "รูปแบบสีต้องเป็น #RGB หรือ #RRGGBB",
            preview: "ตัวอย่างโทนสีหน้าแรก",
          }
        : {
            section: "Website Settings",
            title: "Homepage",
            subtitle: "Configure homepage colors and below-banner typography.",
            quickMenu: "Website Menu",
            bannerMenu: "Banner",
            homepageMenu: "Homepage",
            imageBoxesMenu: "Image Boxes",
            whyChooseUsMenu: "Why Choose Us Boxes",
            middleBannerMenu: "Middle Website Banner",
            newsCardsMenu: "Activities & News",
            brandGuaranteeMenu: "Brand Guarantee",
            pageBackgroundColor: "Section 1: Website Background",
            footerBottomBackgroundColor: "Section 2: Bottom Footer Background",
            textColor: "Global Text Color",
            introTitle: "Below-banner Heading",
            introContent: "Below-banner Content",
            sectionGapPx: "Gap after Banner (px)",
            introCardBackgroundColor: "Text Box Background",
            introTitleColor: "Heading Color",
            introContentColor: "Content Color",
            introTitleFontSizePx: "Heading Font Size (px)",
            introContentFontSizePx: "Content Font Size (px)",
            introTitleFontWeight: "Heading Weight",
            introContentFontWeight: "Content Weight",
            introTextGlow: "Effect: Text Glow",
            save: "Save Settings",
            saving: "Saving...",
            saved: "Saved",
            saveFailed: "Save failed",
            loadError: "Failed to load initial settings. Using defaults.",
            invalidColor: "Color must be #RGB or #RRGGBB",
            preview: "Homepage Preview",
          },
    [locale],
  );

  const [values, setValues] = useState<WebHomepageAppearanceSettings>(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<{ tone: "idle" | "success" | "error"; message: string | null }>({
    tone: bootstrapError ? "error" : "idle",
    message: bootstrapError ? `${text.loadError}: ${bootstrapError}` : null,
  });

  function setField<K extends keyof WebHomepageAppearanceSettings>(field: K, value: WebHomepageAppearanceSettings[K]) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ tone: "idle", message: null });

    const colors = [
      values.pageBackgroundColor,
      values.footerBottomBackgroundColor,
      values.textColor,
      values.introCardBackgroundColor,
      values.introTitleColor,
      values.introContentColor,
    ];
    if (colors.some((value) => !HEX_COLOR_RE.test(value))) {
      setStatus({ tone: "error", message: text.invalidColor });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/web-settings/homepage", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(values),
      });

      const result = (await response.json()) as HomepageResponse;
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

  const textShadow = values.introTextGlow ? "0 0 18px rgba(56, 189, 248, 0.28)" : "none";

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
          <Link
            href="/admin/web-settings/banner"
            className="mt-3 block rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {text.bannerMenu}
          </Link>
          <div className="mt-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">
            {text.homepageMenu}
          </div>
          <Link
            href="/admin/web-settings/homepage-images"
            className="mt-2 block rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {text.imageBoxesMenu}
          </Link>
          <Link
            href="/admin/web-settings/why-choose-us"
            className="mt-2 block rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {text.whyChooseUsMenu}
          </Link>
          <Link
            href="/admin/web-settings/middle-banner"
            className="mt-2 block rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {text.middleBannerMenu}
          </Link>
          <Link
            href="/admin/web-settings/news-cards"
            className="mt-2 block rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {text.newsCardsMenu}
          </Link>
          <Link
            href="/admin/web-settings/brand-guarantee"
            className="mt-2 block rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {text.brandGuaranteeMenu}
          </Link>
        </aside>

        <form onSubmit={handleSubmit} className="space-y-4">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <header className="border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">{text.preview}</p>
            </header>
            <div className="space-y-3 p-4" style={{ backgroundColor: values.pageBackgroundColor, color: values.textColor }}>
              <p className="text-sm font-semibold">Website Background</p>
              <div className="rounded-lg px-3 py-2 text-xs" style={{ backgroundColor: values.footerBottomBackgroundColor }}>
                Footer Bottom Background
              </div>
              <div className="rounded-2xl p-4 text-center" style={{ backgroundColor: values.introCardBackgroundColor }}>
                <p
                  style={{
                    color: values.introTitleColor,
                    fontSize: `${values.introTitleFontSizePx}px`,
                    fontWeight: values.introTitleFontWeight,
                    textShadow,
                    lineHeight: 1.2,
                  }}
                >
                  {values.introTitle}
                </p>
                <p
                  className="mt-3 whitespace-pre-line"
                  style={{
                    color: values.introContentColor,
                    fontSize: `${values.introContentFontSizePx}px`,
                    fontWeight: values.introContentFontWeight,
                    textShadow,
                    lineHeight: 1.45,
                  }}
                >
                  {values.introContent}
                </p>
              </div>
            </div>
          </section>

          <section className="sst-card-soft rounded-2xl p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <ColorField label={text.pageBackgroundColor} value={values.pageBackgroundColor} onChange={(value) => setField("pageBackgroundColor", value)} />
              <ColorField label={text.footerBottomBackgroundColor} value={values.footerBottomBackgroundColor} onChange={(value) => setField("footerBottomBackgroundColor", value)} />
              <ColorField label={text.textColor} value={values.textColor} onChange={(value) => setField("textColor", value)} className="md:col-span-2" />

              <label className="space-y-1 text-sm font-medium text-slate-700 md:col-span-2">
                <span>{text.introTitle}</span>
                <input value={values.introTitle} onChange={(event) => setField("introTitle", event.target.value)} className="input-base" maxLength={180} />
              </label>

              <label className="space-y-1 text-sm font-medium text-slate-700 md:col-span-2">
                <span>{text.introContent}</span>
                <textarea value={values.introContent} onChange={(event) => setField("introContent", event.target.value)} className="input-base min-h-[120px] resize-y" maxLength={2000} />
              </label>

              <label className="space-y-1 text-sm font-medium text-slate-700 md:col-span-2">
                <span>{text.sectionGapPx}</span>
                <input type="number" min={0} max={200} value={values.sectionGapPx} onChange={(event) => setField("sectionGapPx", Number(event.target.value || 0))} className="input-base" />
              </label>

              <ColorField label={text.introCardBackgroundColor} value={values.introCardBackgroundColor} onChange={(value) => setField("introCardBackgroundColor", value)} className="md:col-span-2" />
              <ColorField label={text.introTitleColor} value={values.introTitleColor} onChange={(value) => setField("introTitleColor", value)} />
              <ColorField label={text.introContentColor} value={values.introContentColor} onChange={(value) => setField("introContentColor", value)} />

              <label className="space-y-1 text-sm font-medium text-slate-700">
                <span>{text.introTitleFontSizePx}</span>
                <input type="number" min={18} max={96} value={values.introTitleFontSizePx} onChange={(event) => setField("introTitleFontSizePx", Number(event.target.value || 18))} className="input-base" />
              </label>

              <label className="space-y-1 text-sm font-medium text-slate-700">
                <span>{text.introContentFontSizePx}</span>
                <input type="number" min={12} max={48} value={values.introContentFontSizePx} onChange={(event) => setField("introContentFontSizePx", Number(event.target.value || 12))} className="input-base" />
              </label>

              <label className="space-y-1 text-sm font-medium text-slate-700">
                <span>{text.introTitleFontWeight}</span>
                <select value={values.introTitleFontWeight} onChange={(event) => setField("introTitleFontWeight", Number(event.target.value) as WebHomepageAppearanceSettings["introTitleFontWeight"])} className="input-base">
                  {FONT_WEIGHT_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>

              <label className="space-y-1 text-sm font-medium text-slate-700">
                <span>{text.introContentFontWeight}</span>
                <select value={values.introContentFontWeight} onChange={(event) => setField("introContentFontWeight", Number(event.target.value) as WebHomepageAppearanceSettings["introContentFontWeight"])} className="input-base">
                  {FONT_WEIGHT_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>

              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 md:col-span-2">
                <input type="checkbox" checked={values.introTextGlow} onChange={(event) => setField("introTextGlow", event.target.checked)} className="h-4 w-4 rounded border-slate-300" />
                <span>{text.introTextGlow}</span>
              </label>
            </div>
          </section>

          <div className="flex items-center justify-between">
            <p className={`text-sm ${status.tone === "error" ? "text-rose-600" : status.tone === "success" ? "text-emerald-600" : "text-slate-500"}`}>
              {status.message}
            </p>
            <button type="submit" disabled={isSaving} className="btn-primary rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
              {isSaving ? text.saving : text.save}
            </button>
          </div>
        </form>
      </div>
      <SaveStatePopup isSaving={isSaving} isSuccess={status.tone === "success"} savingText={text.saving} successText={text.saved} />
    </section>
  );
}

function ColorField({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
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
