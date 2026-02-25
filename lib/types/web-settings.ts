export type WebBannerSettings = {
  eyebrow: string;
  title: string;
  description: string;
  primaryButtonLabel: string;
  secondaryButtonLabel: string;
  showButtons: boolean;
  backgroundFrom: string;
  backgroundTo: string;
  imageUrl: string | null;
  contentAlign: "left" | "center" | "right";
  autoHeight: boolean;
  minHeightPx: number;
  eyebrowFontSizePx: number;
  titleFontSizePx: number;
  descriptionFontSizePx: number;
  textEffect: "none" | "shadow" | "glow" | "gradient";
  imageFrameEnabled: boolean;
  imageFrameStyle: "soft" | "glass" | "neon" | "minimal";
  imageMotion: "none" | "slide_lr" | "float_ud" | "zoom" | "tilt";
  imageFrameColor: string;
  imageFrameRadiusPx: number;
  imageFrameBorderWidthPx: number;
  updatedAt: string | null;
};

export type WebHomepageAppearanceSettings = {
  pageBackgroundColor: string;
  footerBottomBackgroundColor: string;
  textColor: string;
  introTitle: string;
  introContent: string;
  sectionGapPx: number;
  introCardBackgroundColor: string;
  introTitleColor: string;
  introContentColor: string;
  introTitleFontSizePx: number;
  introContentFontSizePx: number;
  introTitleFontWeight: 300 | 400 | 500 | 600 | 700 | 800 | 900;
  introContentFontWeight: 300 | 400 | 500 | 600 | 700 | 800 | 900;
  introTextGlow: boolean;
  updatedAt: string | null;
};

export type WebHomepageImageItem = {
  id: string;
  imageUrl: string;
  altText: string;
};

export type WebHomepageImageStripSettings = {
  sectionGapPx: number;
  items: WebHomepageImageItem[];
  updatedAt: string | null;
};

export type WhyChooseUsIcon =
  | "shield"
  | "spark"
  | "award"
  | "layers"
  | "rocket"
  | "support"
  | "speed"
  | "check";

export type WebWhyChooseUsItem = {
  id: string;
  icon: WhyChooseUsIcon;
  title: string;
  description: string;
};

export type WebWhyChooseUsSettings = {
  sectionGapPx: number;
  sectionTitle: string;
  sectionSubtitle: string;
  sectionTagline: string;
  items: WebWhyChooseUsItem[];
  updatedAt: string | null;
};

export type WebMiddleBannerSettings = {
  sectionGapRem: number;
  backgroundColor: string;
  items: WebHomepageImageItem[];
  updatedAt: string | null;
};

export type WebNewsCardMediaType = "image" | "youtube";

export type WebNewsCardItem = {
  id: string;
  mediaType: WebNewsCardMediaType;
  title: string;
  meta: string;
  description: string;
  imageUrl: string;
  videoUrl: string;
};

export type WebNewsCardsSettings = {
  sectionGapPx: number;
  items: WebNewsCardItem[];
  updatedAt: string | null;
};

export type WebBrandGuaranteeAlign = "left" | "center" | "right";
export type WebBrandGuaranteeEffect = "none" | "lift" | "glow" | "pulse";

export type WebBrandGuaranteeItem = {
  id: string;
  logoUrl: string;
  altText: string;
  linkUrl: string;
};

export type WebBrandGuaranteeSettings = {
  sectionGapPx: number;
  sectionTitle: string;
  sectionSubtitle: string;
  align: WebBrandGuaranteeAlign;
  effect: WebBrandGuaranteeEffect;
  items: WebBrandGuaranteeItem[];
  updatedAt: string | null;
};

export function getDefaultWebBannerSettings(): WebBannerSettings {
  return {
    eyebrow: "KITTISAP CUSTOMER SITE",
    title: "แพลตฟอร์มลูกค้า เชื่อมสินค้าและคำสั่งซื้อชุดเดียวกับระบบแอดมิน",
    description: "ลูกค้าดูสินค้า ตารางราคา โปรโมชัน สั่งซื้อ และชำระเงินผ่าน PromptPay ได้ครบในระบบเดียว",
    primaryButtonLabel: "สินค้าของเรา",
    secondaryButtonLabel: "กิจกรรม + ส่วนลด/คูปอง",
    showButtons: true,
    backgroundFrom: "#0f172a",
    backgroundTo: "#020617",
    imageUrl: null,
    contentAlign: "left",
    autoHeight: false,
    minHeightPx: 340,
    eyebrowFontSizePx: 11,
    titleFontSizePx: 56,
    descriptionFontSizePx: 18,
    textEffect: "none",
    imageFrameEnabled: true,
    imageFrameStyle: "soft",
    imageMotion: "none",
    imageFrameColor: "#ffffff",
    imageFrameRadiusPx: 16,
    imageFrameBorderWidthPx: 1,
    updatedAt: null,
  };
}

export function getDefaultWebHomepageAppearanceSettings(): WebHomepageAppearanceSettings {
  return {
    pageBackgroundColor: "#0b0f16",
    footerBottomBackgroundColor: "#0f172a",
    textColor: "#cbd5e1",
    introTitle: "SST INNOVATION CO., LTD.",
    introContent:
      "SST INNOVATION คือทีมผู้เชี่ยวชาญด้านงานระบบครบวงจร ตั้งแต่กลยุทธ์ดิจิทัล การออกแบบ พัฒนา ไปจนถึงการดูแลหลังส่งมอบ โดยมุ่งเน้นคุณภาพและผลลัพธ์ทางธุรกิจที่วัดผลได้จริง",
    sectionGapPx: 56,
    introCardBackgroundColor: "#ffffff",
    introTitleColor: "#0f274f",
    introContentColor: "#1f3a62",
    introTitleFontSizePx: 56,
    introContentFontSizePx: 24,
    introTitleFontWeight: 800,
    introContentFontWeight: 500,
    introTextGlow: false,
    updatedAt: null,
  };
}

export function getDefaultWebHomepageImageStripSettings(): WebHomepageImageStripSettings {
  return {
    sectionGapPx: 36,
    items: [],
    updatedAt: null,
  };
}

export function getDefaultWebWhyChooseUsSettings(): WebWhyChooseUsSettings {
  return {
    sectionGapPx: 44,
    sectionTitle: "ทำไมต้อง SST INNOVATION Pro",
    sectionSubtitle: "ออกแบบเพื่อธุรกิจที่ต้องการความแตกต่างและความน่าเชื่อถือ",
    sectionTagline: "ยกระดับเว็บไซต์ให้เป็นสินทรัพย์เชิงธุรกิจ",
    items: [
      {
        id: "why-1",
        icon: "shield",
        title: "ดีไซน์ระดับองค์กร",
        description: "วางโครงสร้าง UI/UX อย่างมีระบบ ถ่ายทอดภาพลักษณ์แบรนด์ที่เป็นมืออาชีพ",
      },
      {
        id: "why-2",
        icon: "spark",
        title: "ประสิทธิภาพสูง",
        description: "โค้ดโครงสร้างทันสมัย โหลดไว รองรับ SEO และ Core Web Vitals",
      },
      {
        id: "why-3",
        icon: "award",
        title: "ความปลอดภัยและมาตรฐาน",
        description: "รองรับการเชื่อมต่อกับระบบภายใน พร้อมมาตรฐานความปลอดภัย",
      },
      {
        id: "why-4",
        icon: "layers",
        title: "ดูแลต่อเนื่อง",
        description: "ทีมที่เชี่ยวชาญดูแลหลังส่งมอบ อัปเดตและขยายได้ง่าย",
      },
    ],
    updatedAt: null,
  };
}

export function getDefaultWebMiddleBannerSettings(): WebMiddleBannerSettings {
  return {
    sectionGapRem: 0.15,
    backgroundColor: "#050b14",
    items: [],
    updatedAt: null,
  };
}

export function getDefaultWebNewsCardsSettings(): WebNewsCardsSettings {
  return {
    sectionGapPx: 48,
    items: [],
    updatedAt: null,
  };
}

export function getDefaultWebBrandGuaranteeSettings(): WebBrandGuaranteeSettings {
  return {
    sectionGapPx: 24,
    sectionTitle: "แบรนด์การันตีมาตรฐาน / ชั้นนำประเทศไทย",
    sectionSubtitle: "พันธมิตรและมาตรฐานที่เราได้รับความไว้วางใจ",
    align: "center",
    effect: "lift",
    items: [],
    updatedAt: null,
  };
}
