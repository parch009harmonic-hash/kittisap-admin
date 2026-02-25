import type { AppLocale } from "../../../lib/i18n/locale";
import { MarketingTopNav } from "./MarketingTopNav";

export function StorefrontTopMenu({
  locale,
  useLocalePrefix = false,
}: {
  locale: AppLocale;
  useLocalePrefix?: boolean;
}) {
  if (locale === "th") {
    return (
      <MarketingTopNav
        locale={locale}
        useLocalePrefix={useLocalePrefix}
        brand="Kittisap"
        nav={{
          home: "หน้าแรก",
          products: "สินค้าของเรา",
          pricing: "ตารางราคา",
          promotions: "กิจกรรม + ส่วนลด/คูปอง",
          contact: "ติดต่อเรา",
        }}
        cta={{
          products: "ดูสินค้า",
        }}
      />
    );
  }

  if (locale === "lo") {
    return (
      <MarketingTopNav
        locale={locale}
        useLocalePrefix={useLocalePrefix}
        brand="Kittisap"
        nav={{
          home: "ໜ້າຫຼັກ",
          products: "ສິນຄ້າຂອງພວກເຮົາ",
          pricing: "ຕາຕະລາງລາຄາ",
          promotions: "ກິດຈະກຳ + ຄູປອງ",
          contact: "ຕິດຕໍ່",
        }}
        cta={{
          products: "ເບິ່ງສິນຄ້າ",
        }}
      />
    );
  }

  return (
    <MarketingTopNav
      locale={locale}
      useLocalePrefix={useLocalePrefix}
      brand="Kittisap"
      nav={{
        home: "Home",
        products: "Products",
        pricing: "Pricing",
        promotions: "Promotions + Coupons",
        contact: "Contact",
      }}
      cta={{
        products: "Browse Products",
      }}
    />
  );
}
