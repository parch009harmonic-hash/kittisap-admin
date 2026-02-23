export type ContactInfo = {
  businessName: string;
  telephone: string;
  lineId: string;
  lineUrl: string;
  mapEmbedUrl: string;
  mapOpenUrl: string;
  addressTh: string;
  addressEn: string;
  hours: Array<{
    dayTh: string;
    dayEn: string;
    open: string;
    close: string;
  }>;
};

export const CONTACT_INFO: ContactInfo = {
  businessName: "Kittisap",
  telephone: "0843374982",
  lineId: "@kittisap",
  lineUrl: "https://line.me/R/ti/p/@kittisap",
  mapEmbedUrl: "https://www.google.com/maps?q=Bangkok&output=embed",
  mapOpenUrl: "https://maps.google.com/?q=Bangkok",
  addressTh: "กรุงเทพมหานคร ประเทศไทย",
  addressEn: "Bangkok, Thailand",
  hours: [
    { dayTh: "จันทร์ - ศุกร์", dayEn: "Mon - Fri", open: "09:00", close: "18:00" },
    { dayTh: "เสาร์", dayEn: "Sat", open: "09:00", close: "17:00" },
    { dayTh: "อาทิตย์", dayEn: "Sun", open: "10:00", close: "16:00" },
  ],
};
