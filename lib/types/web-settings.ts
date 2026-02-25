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
