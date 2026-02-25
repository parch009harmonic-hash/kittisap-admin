import "server-only";

import { z } from "zod";

import { getAdminActor, requireAdminApi } from "../auth/admin";
import { assertUiWriteAllowed } from "../maintenance/ui-maintenance-guard";
import { getSupabaseServiceRoleClient } from "../supabase/service";
import {
  getDefaultWebBannerSettings,
  getDefaultWebHomepageAppearanceSettings,
  getDefaultWebHomepageImageStripSettings,
  getDefaultWebMiddleBannerSettings,
  getDefaultWebBrandGuaranteeSettings,
  getDefaultWebNewsCardsSettings,
  getDefaultWebWhyChooseUsSettings,
  WebBrandGuaranteeSettings,
  WhyChooseUsIcon,
  WebBannerSettings,
  WebMiddleBannerSettings,
  WebNewsCardsSettings,
  WebHomepageAppearanceSettings,
  WebHomepageImageStripSettings,
  WebWhyChooseUsSettings,
} from "../types/web-settings";

const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const WebBannerInputSchema = z.object({
  eyebrow: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(240),
  description: z.string().trim().min(1).max(500),
  primaryButtonLabel: z.string().trim().min(1).max(80),
  secondaryButtonLabel: z.string().trim().min(1).max(80),
  backgroundFrom: z.string().trim().regex(HEX_COLOR_RE, "Invalid background color"),
  backgroundTo: z.string().trim().regex(HEX_COLOR_RE, "Invalid background color"),
  imageUrl: z.string().trim().url().nullable().optional(),
  showButtons: z.boolean().default(true),
  contentAlign: z.enum(["left", "center", "right"]).default("left"),
  autoHeight: z.boolean().default(false),
  minHeightPx: z.coerce.number().int().min(220).max(720),
  eyebrowFontSizePx: z.coerce.number().int().min(10).max(24),
  titleFontSizePx: z.coerce.number().int().min(24).max(96),
  descriptionFontSizePx: z.coerce.number().int().min(12).max(36),
  textEffect: z.enum(["none", "shadow", "glow", "gradient"]).default("none"),
  imageFrameEnabled: z.boolean().default(true),
  imageFrameStyle: z.enum(["soft", "glass", "neon", "minimal"]).default("soft"),
  imageMotion: z.enum(["none", "slide_lr", "float_ud", "zoom", "tilt"]).default("none"),
  imageFrameColor: z.string().trim().regex(HEX_COLOR_RE, "Invalid frame color"),
  imageFrameRadiusPx: z.coerce.number().int().min(0).max(40),
  imageFrameBorderWidthPx: z.coerce.number().int().min(0).max(8),
});

const WebHomepageAppearanceInputSchema = z.object({
  pageBackgroundColor: z.string().trim().regex(HEX_COLOR_RE, "Invalid page background color"),
  footerBottomBackgroundColor: z.string().trim().regex(HEX_COLOR_RE, "Invalid footer background color"),
  textColor: z.string().trim().regex(HEX_COLOR_RE, "Invalid text color"),
  introTitle: z.string().trim().min(1).max(180),
  introContent: z.string().trim().min(1).max(2000),
  sectionGapPx: z.coerce.number().int().min(0).max(200),
  introCardBackgroundColor: z.string().trim().regex(HEX_COLOR_RE, "Invalid intro background color"),
  introTitleColor: z.string().trim().regex(HEX_COLOR_RE, "Invalid intro title color"),
  introContentColor: z.string().trim().regex(HEX_COLOR_RE, "Invalid intro content color"),
  introTitleFontSizePx: z.coerce.number().int().min(18).max(96),
  introContentFontSizePx: z.coerce.number().int().min(12).max(48),
  introTitleFontWeight: z.union([
    z.literal(300),
    z.literal(400),
    z.literal(500),
    z.literal(600),
    z.literal(700),
    z.literal(800),
    z.literal(900),
  ]),
  introContentFontWeight: z.union([
    z.literal(300),
    z.literal(400),
    z.literal(500),
    z.literal(600),
    z.literal(700),
    z.literal(800),
    z.literal(900),
  ]),
  introTextGlow: z.boolean().default(false),
});

const WebHomepageImageItemInputSchema = z.object({
  id: z.string().trim().min(1).max(64),
  imageUrl: z.string().trim().url(),
  altText: z.string().trim().max(180).default(""),
});

const WebHomepageImageStripInputSchema = z.object({
  sectionGapPx: z.coerce.number().int().min(0).max(200),
  items: z.array(WebHomepageImageItemInputSchema).max(4),
});

const WhyChooseUsIconSchema = z.enum([
  "shield",
  "spark",
  "award",
  "layers",
  "rocket",
  "support",
  "speed",
  "check",
]);

const WebWhyChooseUsItemInputSchema = z.object({
  id: z.string().trim().min(1).max(64),
  icon: WhyChooseUsIconSchema.default("shield"),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(300),
});

const WebWhyChooseUsInputSchema = z.object({
  sectionGapPx: z.coerce.number().int().min(0).max(220),
  sectionTitle: z.string().trim().min(1).max(140),
  sectionSubtitle: z.string().trim().max(220),
  sectionTagline: z.string().trim().max(160),
  items: z.array(WebWhyChooseUsItemInputSchema).max(6),
});

const WebMiddleBannerInputSchema = z.object({
  sectionGapRem: z.coerce.number().min(0).max(5),
  backgroundColor: z.string().trim().regex(HEX_COLOR_RE, "Invalid middle banner background color"),
  items: z.array(WebHomepageImageItemInputSchema).max(3),
});

const WebNewsCardItemInputSchema = z.object({
  id: z.string().trim().min(1).max(64),
  mediaType: z.enum(["image", "youtube"]),
  title: z.string().trim().min(1).max(140),
  meta: z.string().trim().max(140).default(""),
  description: z.string().trim().max(400).default(""),
  imageUrl: z.string().trim().url().or(z.literal("")).default(""),
  videoUrl: z.string().trim().url().or(z.literal("")).default(""),
});

const WebNewsCardsInputSchema = z.object({
  sectionGapPx: z.coerce.number().int().min(0).max(220),
  items: z.array(WebNewsCardItemInputSchema).max(6),
});

const WebBrandGuaranteeItemInputSchema = z.object({
  id: z.string().trim().min(1).max(64),
  logoUrl: z.string().trim().url(),
  altText: z.string().trim().max(180).default(""),
  linkUrl: z.string().trim().url().or(z.literal("")).default(""),
});

const WebBrandGuaranteeInputSchema = z.object({
  sectionGapPx: z.coerce.number().int().min(0).max(220),
  sectionTitle: z.string().trim().min(1).max(160),
  sectionSubtitle: z.string().trim().max(220),
  align: z.enum(["left", "center", "right"]).default("center"),
  effect: z.enum(["none", "lift", "glow", "pulse"]).default("lift"),
  items: z.array(WebBrandGuaranteeItemInputSchema),
});

function errorText(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: string }).message ?? fallback);
  }
  return fallback;
}

function isMissingWebSettingsTable(error: unknown) {
  const message = errorText(error, "").toLowerCase();
  return (
    message.includes("web_settings") &&
    (message.includes("does not exist") ||
      message.includes("not found") ||
      message.includes("could not find") ||
      message.includes("schema cache"))
  );
}

function mapBanner(row: Record<string, unknown> | null | undefined): WebBannerSettings {
  const defaults = getDefaultWebBannerSettings();
  if (!row) {
    return defaults;
  }

  return {
    eyebrow: String(row.banner_eyebrow ?? defaults.eyebrow),
    title: String(row.banner_title ?? defaults.title),
    description: String(row.banner_description ?? defaults.description),
    primaryButtonLabel: String(row.banner_primary_button_label ?? defaults.primaryButtonLabel),
    secondaryButtonLabel: String(row.banner_secondary_button_label ?? defaults.secondaryButtonLabel),
    backgroundFrom: String(row.banner_background_from ?? defaults.backgroundFrom),
    backgroundTo: String(row.banner_background_to ?? defaults.backgroundTo),
    imageUrl: row.banner_image_url ? String(row.banner_image_url) : null,
    showButtons: Boolean(row.banner_show_buttons ?? defaults.showButtons),
    contentAlign: String(row.banner_content_align ?? defaults.contentAlign) as WebBannerSettings["contentAlign"],
    autoHeight: Boolean(row.banner_auto_height ?? defaults.autoHeight),
    minHeightPx: Number(row.banner_min_height_px ?? defaults.minHeightPx),
    eyebrowFontSizePx: Number(row.banner_eyebrow_font_size_px ?? defaults.eyebrowFontSizePx),
    titleFontSizePx: Number(row.banner_title_font_size_px ?? defaults.titleFontSizePx),
    descriptionFontSizePx: Number(
      row.banner_description_font_size_px ?? defaults.descriptionFontSizePx,
    ),
    textEffect: String(row.banner_text_effect ?? defaults.textEffect) as WebBannerSettings["textEffect"],
    imageFrameEnabled: Boolean(row.banner_image_frame_enabled ?? defaults.imageFrameEnabled),
    imageFrameStyle: String(row.banner_image_frame_style ?? defaults.imageFrameStyle) as WebBannerSettings["imageFrameStyle"],
    imageMotion: String(row.banner_image_motion ?? defaults.imageMotion) as WebBannerSettings["imageMotion"],
    imageFrameColor: String(row.banner_image_frame_color ?? defaults.imageFrameColor),
    imageFrameRadiusPx: Number(row.banner_image_frame_radius_px ?? defaults.imageFrameRadiusPx),
    imageFrameBorderWidthPx: Number(
      row.banner_image_frame_border_width_px ?? defaults.imageFrameBorderWidthPx,
    ),
    updatedAt: row.updated_at ? String(row.updated_at) : null,
  };
}

function mapHomepageAppearance(row: Record<string, unknown> | null | undefined): WebHomepageAppearanceSettings {
  const defaults = getDefaultWebHomepageAppearanceSettings();
  if (!row) {
    return defaults;
  }

  return {
    pageBackgroundColor: String(row.page_background_color ?? defaults.pageBackgroundColor),
    footerBottomBackgroundColor: String(
      row.footer_bottom_background_color ?? defaults.footerBottomBackgroundColor,
    ),
    textColor: String(row.text_color ?? defaults.textColor),
    introTitle: String(row.homepage_intro_title ?? defaults.introTitle),
    introContent: String(row.homepage_intro_content ?? defaults.introContent),
    sectionGapPx: Number(row.homepage_section_gap_px ?? defaults.sectionGapPx),
    introCardBackgroundColor: String(
      row.homepage_intro_card_background_color ?? defaults.introCardBackgroundColor,
    ),
    introTitleColor: String(row.homepage_intro_title_color ?? defaults.introTitleColor),
    introContentColor: String(row.homepage_intro_content_color ?? defaults.introContentColor),
    introTitleFontSizePx: Number(row.homepage_intro_title_font_size_px ?? defaults.introTitleFontSizePx),
    introContentFontSizePx: Number(
      row.homepage_intro_content_font_size_px ?? defaults.introContentFontSizePx,
    ),
    introTitleFontWeight: Number(
      row.homepage_intro_title_font_weight ?? defaults.introTitleFontWeight,
    ) as WebHomepageAppearanceSettings["introTitleFontWeight"],
    introContentFontWeight: Number(
      row.homepage_intro_content_font_weight ?? defaults.introContentFontWeight,
    ) as WebHomepageAppearanceSettings["introContentFontWeight"],
    introTextGlow: Boolean(row.homepage_intro_text_glow ?? defaults.introTextGlow),
    updatedAt: row.updated_at ? String(row.updated_at) : null,
  };
}

function mapHomepageImageStrip(row: Record<string, unknown> | null | undefined): WebHomepageImageStripSettings {
  const defaults = getDefaultWebHomepageImageStripSettings();
  if (!row) {
    return defaults;
  }

  const parsedItems = z.array(WebHomepageImageItemInputSchema).safeParse(row.homepage_image_boxes ?? []);
  const items = parsedItems.success ? parsedItems.data : defaults.items;

  return {
    sectionGapPx: Number(row.homepage_image_section_gap_px ?? defaults.sectionGapPx),
    items,
    updatedAt: row.updated_at ? String(row.updated_at) : null,
  };
}

function mapWhyChooseUs(row: Record<string, unknown> | null | undefined): WebWhyChooseUsSettings {
  const defaults = getDefaultWebWhyChooseUsSettings();
  if (!row) {
    return defaults;
  }

  const parsedItems = z.array(WebWhyChooseUsItemInputSchema).safeParse(row.homepage_why_choose_us_items ?? []);
  const items = parsedItems.success ? parsedItems.data : defaults.items;

  return {
    sectionGapPx: Number(row.homepage_why_choose_us_section_gap_px ?? defaults.sectionGapPx),
    sectionTitle: String(row.homepage_why_choose_us_title ?? defaults.sectionTitle),
    sectionSubtitle: String(row.homepage_why_choose_us_subtitle ?? defaults.sectionSubtitle),
    sectionTagline: String(row.homepage_why_choose_us_tagline ?? defaults.sectionTagline),
    items: items.map((item) => ({
      ...item,
      icon: item.icon as WhyChooseUsIcon,
    })),
    updatedAt: row.updated_at ? String(row.updated_at) : null,
  };
}

function mapMiddleBanner(row: Record<string, unknown> | null | undefined): WebMiddleBannerSettings {
  const defaults = getDefaultWebMiddleBannerSettings();
  if (!row) {
    return defaults;
  }

  const parsedItems = z.array(WebHomepageImageItemInputSchema).safeParse(row.homepage_middle_banner_items ?? []);
  const legacyItems =
    row.homepage_middle_banner_image_url
      ? [
          {
            id: "middle-banner-1",
            imageUrl: String(row.homepage_middle_banner_image_url),
            altText: String(row.homepage_middle_banner_image_alt ?? "Middle banner"),
          },
        ]
      : [];
  const items =
    parsedItems.success && parsedItems.data.length > 0
      ? parsedItems.data
      : legacyItems.length > 0
        ? legacyItems
        : defaults.items;

  return {
    sectionGapRem: Number(row.homepage_middle_banner_section_gap_rem ?? defaults.sectionGapRem),
    backgroundColor: String(row.homepage_middle_banner_background_color ?? defaults.backgroundColor),
    items,
    updatedAt: row.updated_at ? String(row.updated_at) : null,
  };
}

function mapNewsCards(row: Record<string, unknown> | null | undefined): WebNewsCardsSettings {
  const defaults = getDefaultWebNewsCardsSettings();
  if (!row) {
    return defaults;
  }

  const parsedItems = z.array(WebNewsCardItemInputSchema).safeParse(row.homepage_news_cards ?? []);
  const items = parsedItems.success ? parsedItems.data : defaults.items;

  return {
    sectionGapPx: Number(row.homepage_news_section_gap_px ?? defaults.sectionGapPx),
    items,
    updatedAt: row.updated_at ? String(row.updated_at) : null,
  };
}

function mapBrandGuarantee(row: Record<string, unknown> | null | undefined): WebBrandGuaranteeSettings {
  const defaults = getDefaultWebBrandGuaranteeSettings();
  if (!row) {
    return defaults;
  }

  const parsedItems = z.array(WebBrandGuaranteeItemInputSchema).safeParse(row.homepage_brand_guarantee_items ?? []);
  const items = parsedItems.success ? parsedItems.data : defaults.items;

  return {
    sectionGapPx: Number(row.homepage_brand_guarantee_section_gap_px ?? defaults.sectionGapPx),
    sectionTitle: String(row.homepage_brand_guarantee_title ?? defaults.sectionTitle),
    sectionSubtitle: String(row.homepage_brand_guarantee_subtitle ?? defaults.sectionSubtitle),
    align: String(row.homepage_brand_guarantee_align ?? defaults.align) as WebBrandGuaranteeSettings["align"],
    effect: String(row.homepage_brand_guarantee_effect ?? defaults.effect) as WebBrandGuaranteeSettings["effect"],
    items,
    updatedAt: row.updated_at ? String(row.updated_at) : null,
  };
}

export async function getWebBannerSettings() {
  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("web_settings")
    .select("*")
    .eq("id", "default")
    .maybeSingle();

  if (error) {
    if (isMissingWebSettingsTable(error)) {
      return getDefaultWebBannerSettings();
    }
    throw new Error(`Failed to load web banner settings: ${errorText(error, "Unknown error")}`);
  }

  return mapBanner(data as Record<string, unknown> | null);
}

export async function getWebBannerSettingsApi() {
  await requireAdminApi();
  return getWebBannerSettings();
}

export async function updateWebBannerSettingsApi(input: unknown) {
  await requireAdminApi();
  const actor = await getAdminActor();
  if (!actor || actor.role !== "admin") {
    throw new Error("Not authorized to manage web settings");
  }

  await assertUiWriteAllowed({
    path: "/admin/web-settings/banner",
    actorRole: actor.role,
  });

  const parsed = WebBannerInputSchema.parse(input);
  const supabase = getSupabaseServiceRoleClient();
  const payload = {
    id: "default",
    banner_eyebrow: parsed.eyebrow,
    banner_title: parsed.title,
    banner_description: parsed.description,
    banner_primary_button_label: parsed.primaryButtonLabel,
    banner_secondary_button_label: parsed.secondaryButtonLabel,
    banner_background_from: parsed.backgroundFrom,
    banner_background_to: parsed.backgroundTo,
    banner_image_url: parsed.imageUrl ?? null,
    banner_show_buttons: parsed.showButtons,
    banner_content_align: parsed.contentAlign,
    banner_auto_height: parsed.autoHeight,
    banner_min_height_px: parsed.minHeightPx,
    banner_eyebrow_font_size_px: parsed.eyebrowFontSizePx,
    banner_title_font_size_px: parsed.titleFontSizePx,
    banner_description_font_size_px: parsed.descriptionFontSizePx,
    banner_text_effect: parsed.textEffect,
    banner_image_frame_enabled: parsed.imageFrameEnabled,
    banner_image_frame_style: parsed.imageFrameStyle,
    banner_image_motion: parsed.imageMotion,
    banner_image_frame_color: parsed.imageFrameColor,
    banner_image_frame_radius_px: parsed.imageFrameRadiusPx,
    banner_image_frame_border_width_px: parsed.imageFrameBorderWidthPx,
    updated_by: actor.user.id,
  };

  const { data, error } = await supabase
    .from("web_settings")
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    if (isMissingWebSettingsTable(error)) {
      throw new Error("Missing web_settings table. Run sql/ensure-web-settings.sql first.");
    }
    throw new Error(`Failed to update web banner settings: ${errorText(error, "Unknown error")}`);
  }

  return mapBanner(data as Record<string, unknown>);
}

export async function getWebHomepageAppearanceSettings() {
  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase.from("web_settings").select("*").eq("id", "default").maybeSingle();

  if (error) {
    if (isMissingWebSettingsTable(error)) {
      return getDefaultWebHomepageAppearanceSettings();
    }
    throw new Error(`Failed to load web homepage settings: ${errorText(error, "Unknown error")}`);
  }

  return mapHomepageAppearance(data as Record<string, unknown> | null);
}

export async function getWebHomepageAppearanceSettingsApi() {
  await requireAdminApi();
  return getWebHomepageAppearanceSettings();
}

export async function updateWebHomepageAppearanceSettingsApi(input: unknown) {
  await requireAdminApi();
  const actor = await getAdminActor();
  if (!actor || actor.role !== "admin") {
    throw new Error("Not authorized to manage web settings");
  }

  await assertUiWriteAllowed({
    path: "/admin/web-settings/homepage",
    actorRole: actor.role,
  });

  const parsed = WebHomepageAppearanceInputSchema.parse(input);
  const supabase = getSupabaseServiceRoleClient();
  const payload = {
    id: "default",
    page_background_color: parsed.pageBackgroundColor,
    footer_bottom_background_color: parsed.footerBottomBackgroundColor,
    text_color: parsed.textColor,
    homepage_intro_title: parsed.introTitle,
    homepage_intro_content: parsed.introContent,
    homepage_section_gap_px: parsed.sectionGapPx,
    homepage_intro_card_background_color: parsed.introCardBackgroundColor,
    homepage_intro_title_color: parsed.introTitleColor,
    homepage_intro_content_color: parsed.introContentColor,
    homepage_intro_title_font_size_px: parsed.introTitleFontSizePx,
    homepage_intro_content_font_size_px: parsed.introContentFontSizePx,
    homepage_intro_title_font_weight: parsed.introTitleFontWeight,
    homepage_intro_content_font_weight: parsed.introContentFontWeight,
    homepage_intro_text_glow: parsed.introTextGlow,
    updated_by: actor.user.id,
  };

  const { data, error } = await supabase
    .from("web_settings")
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    if (isMissingWebSettingsTable(error)) {
      throw new Error("Missing web_settings table. Run sql/ensure-web-settings.sql first.");
    }
    throw new Error(`Failed to update web homepage settings: ${errorText(error, "Unknown error")}`);
  }

  return mapHomepageAppearance(data as Record<string, unknown>);
}

export async function getWebHomepageImageStripSettings() {
  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase.from("web_settings").select("*").eq("id", "default").maybeSingle();

  if (error) {
    if (isMissingWebSettingsTable(error)) {
      return getDefaultWebHomepageImageStripSettings();
    }
    throw new Error(`Failed to load web homepage image settings: ${errorText(error, "Unknown error")}`);
  }

  return mapHomepageImageStrip(data as Record<string, unknown> | null);
}

export async function getWebHomepageImageStripSettingsApi() {
  await requireAdminApi();
  return getWebHomepageImageStripSettings();
}

export async function updateWebHomepageImageStripSettingsApi(input: unknown) {
  await requireAdminApi();
  const actor = await getAdminActor();
  if (!actor || actor.role !== "admin") {
    throw new Error("Not authorized to manage web settings");
  }

  await assertUiWriteAllowed({
    path: "/admin/web-settings/homepage-images",
    actorRole: actor.role,
  });

  const parsed = WebHomepageImageStripInputSchema.parse(input);
  const supabase = getSupabaseServiceRoleClient();
  const payload = {
    id: "default",
    homepage_image_section_gap_px: parsed.sectionGapPx,
    homepage_image_boxes: parsed.items,
    updated_by: actor.user.id,
  };

  const { data, error } = await supabase
    .from("web_settings")
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    if (isMissingWebSettingsTable(error)) {
      throw new Error("Missing web_settings table. Run sql/ensure-web-settings.sql first.");
    }
    throw new Error(`Failed to update web homepage image settings: ${errorText(error, "Unknown error")}`);
  }

  return mapHomepageImageStrip(data as Record<string, unknown>);
}

export async function getWebWhyChooseUsSettings() {
  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase.from("web_settings").select("*").eq("id", "default").maybeSingle();

  if (error) {
    if (isMissingWebSettingsTable(error)) {
      return getDefaultWebWhyChooseUsSettings();
    }
    throw new Error(`Failed to load why choose us settings: ${errorText(error, "Unknown error")}`);
  }

  return mapWhyChooseUs(data as Record<string, unknown> | null);
}

export async function getWebWhyChooseUsSettingsApi() {
  await requireAdminApi();
  return getWebWhyChooseUsSettings();
}

export async function updateWebWhyChooseUsSettingsApi(input: unknown) {
  await requireAdminApi();
  const actor = await getAdminActor();
  if (!actor || actor.role !== "admin") {
    throw new Error("Not authorized to manage web settings");
  }

  await assertUiWriteAllowed({
    path: "/admin/web-settings/why-choose-us",
    actorRole: actor.role,
  });

  const parsed = WebWhyChooseUsInputSchema.parse(input);
  const supabase = getSupabaseServiceRoleClient();
  const payload = {
    id: "default",
    homepage_why_choose_us_section_gap_px: parsed.sectionGapPx,
    homepage_why_choose_us_title: parsed.sectionTitle,
    homepage_why_choose_us_subtitle: parsed.sectionSubtitle,
    homepage_why_choose_us_tagline: parsed.sectionTagline,
    homepage_why_choose_us_items: parsed.items,
    updated_by: actor.user.id,
  };

  const { data, error } = await supabase
    .from("web_settings")
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    if (isMissingWebSettingsTable(error)) {
      throw new Error("Missing web_settings table. Run sql/ensure-web-settings.sql first.");
    }
    throw new Error(`Failed to update why choose us settings: ${errorText(error, "Unknown error")}`);
  }

  return mapWhyChooseUs(data as Record<string, unknown>);
}

export async function getWebMiddleBannerSettings() {
  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase.from("web_settings").select("*").eq("id", "default").maybeSingle();

  if (error) {
    if (isMissingWebSettingsTable(error)) {
      return getDefaultWebMiddleBannerSettings();
    }
    throw new Error(`Failed to load middle banner settings: ${errorText(error, "Unknown error")}`);
  }

  return mapMiddleBanner(data as Record<string, unknown> | null);
}

export async function getWebMiddleBannerSettingsApi() {
  await requireAdminApi();
  return getWebMiddleBannerSettings();
}

export async function updateWebMiddleBannerSettingsApi(input: unknown) {
  await requireAdminApi();
  const actor = await getAdminActor();
  if (!actor || actor.role !== "admin") {
    throw new Error("Not authorized to manage web settings");
  }

  await assertUiWriteAllowed({
    path: "/admin/web-settings/middle-banner",
    actorRole: actor.role,
  });

  const parsed = WebMiddleBannerInputSchema.parse(input);
  const supabase = getSupabaseServiceRoleClient();
  const payload = {
    id: "default",
    homepage_middle_banner_section_gap_rem: parsed.sectionGapRem,
    homepage_middle_banner_background_color: parsed.backgroundColor,
    homepage_middle_banner_items: parsed.items,
    updated_by: actor.user.id,
  };

  const { data, error } = await supabase
    .from("web_settings")
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    if (isMissingWebSettingsTable(error)) {
      throw new Error("Missing web_settings table. Run sql/ensure-web-settings.sql first.");
    }
    throw new Error(`Failed to update middle banner settings: ${errorText(error, "Unknown error")}`);
  }

  return mapMiddleBanner(data as Record<string, unknown>);
}

export async function getWebNewsCardsSettings() {
  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase.from("web_settings").select("*").eq("id", "default").maybeSingle();

  if (error) {
    if (isMissingWebSettingsTable(error)) {
      return getDefaultWebNewsCardsSettings();
    }
    throw new Error(`Failed to load news cards settings: ${errorText(error, "Unknown error")}`);
  }

  return mapNewsCards(data as Record<string, unknown> | null);
}

export async function getWebNewsCardsSettingsApi() {
  await requireAdminApi();
  return getWebNewsCardsSettings();
}

export async function updateWebNewsCardsSettingsApi(input: unknown) {
  await requireAdminApi();
  const actor = await getAdminActor();
  if (!actor || actor.role !== "admin") {
    throw new Error("Not authorized to manage web settings");
  }

  await assertUiWriteAllowed({
    path: "/admin/web-settings/news-cards",
    actorRole: actor.role,
  });

  const parsed = WebNewsCardsInputSchema.parse(input);
  const supabase = getSupabaseServiceRoleClient();
  const payload = {
    id: "default",
    homepage_news_section_gap_px: parsed.sectionGapPx,
    homepage_news_cards: parsed.items,
    updated_by: actor.user.id,
  };

  const { data, error } = await supabase
    .from("web_settings")
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    if (isMissingWebSettingsTable(error)) {
      throw new Error("Missing web_settings table. Run sql/ensure-web-settings.sql first.");
    }
    throw new Error(`Failed to update news cards settings: ${errorText(error, "Unknown error")}`);
  }

  return mapNewsCards(data as Record<string, unknown>);
}

export async function getWebBrandGuaranteeSettings() {
  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase.from("web_settings").select("*").eq("id", "default").maybeSingle();

  if (error) {
    if (isMissingWebSettingsTable(error)) {
      return getDefaultWebBrandGuaranteeSettings();
    }
    throw new Error(`Failed to load brand guarantee settings: ${errorText(error, "Unknown error")}`);
  }

  return mapBrandGuarantee(data as Record<string, unknown> | null);
}

export async function getWebBrandGuaranteeSettingsApi() {
  await requireAdminApi();
  return getWebBrandGuaranteeSettings();
}

export async function updateWebBrandGuaranteeSettingsApi(input: unknown) {
  await requireAdminApi();
  const actor = await getAdminActor();
  if (!actor || actor.role !== "admin") {
    throw new Error("Not authorized to manage web settings");
  }

  await assertUiWriteAllowed({
    path: "/admin/web-settings/brand-guarantee",
    actorRole: actor.role,
  });

  const parsed = WebBrandGuaranteeInputSchema.parse(input);
  const supabase = getSupabaseServiceRoleClient();
  const payload = {
    id: "default",
    homepage_brand_guarantee_section_gap_px: parsed.sectionGapPx,
    homepage_brand_guarantee_title: parsed.sectionTitle,
    homepage_brand_guarantee_subtitle: parsed.sectionSubtitle,
    homepage_brand_guarantee_align: parsed.align,
    homepage_brand_guarantee_effect: parsed.effect,
    homepage_brand_guarantee_items: parsed.items,
    updated_by: actor.user.id,
  };

  const { data, error } = await supabase
    .from("web_settings")
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    if (isMissingWebSettingsTable(error)) {
      throw new Error("Missing web_settings table. Run sql/ensure-web-settings.sql first.");
    }
    throw new Error(`Failed to update brand guarantee settings: ${errorText(error, "Unknown error")}`);
  }

  return mapBrandGuarantee(data as Record<string, unknown>);
}
