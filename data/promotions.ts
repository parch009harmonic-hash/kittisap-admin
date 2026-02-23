export type PromotionItem = {
  id: string;
  title: string;
  titleEn: string;
  summary: string;
  summaryEn: string;
  dateLabel: string;
  badge: "event" | "news" | "campaign";
  href?: string;
};

export const PROMOTIONS: PromotionItem[] = [
  {
    id: "promo-grand-opening",
    title: "Grand Opening ลดแรงทั้งร้าน",
    titleEn: "Grand Opening Special Deals",
    summary: "ฉลองเปิดตัวเว็บไซต์ใหม่ พร้อมโปรโมชันสินค้ารุ่นยอดนิยมจำนวนจำกัด",
    summaryEn: "Celebrate our new storefront launch with limited-time discounts on popular models.",
    dateLabel: "มี.ค. 2026",
    badge: "campaign",
  },
  {
    id: "event-test-ride-weekend",
    title: "กิจกรรมทดลองขับสุดสัปดาห์",
    titleEn: "Weekend Test Ride Event",
    summary: "เปิดให้จองทดลองขับฟรี พร้อมทีมงานให้คำแนะนำการเลือกรุ่นที่เหมาะกับการใช้งาน",
    summaryEn: "Book a free weekend test ride with our team to find the right model for your needs.",
    dateLabel: "ทุกวันเสาร์-อาทิตย์",
    badge: "event",
  },
  {
    id: "news-service-upgrade",
    title: "อัปเดตบริการหลังการขาย",
    titleEn: "After-sales Service Update",
    summary: "ปรับปรุงขั้นตอนรับประกันและระบบติดตามงานซ่อม เพื่อให้ลูกค้าติดตามสถานะได้ง่ายขึ้น",
    summaryEn: "Warranty and repair tracking flow has been upgraded for clearer status visibility.",
    dateLabel: "อัปเดตล่าสุด",
    badge: "news",
  },
];
