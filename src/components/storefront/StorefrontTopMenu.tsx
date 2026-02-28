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
          auth: "เข้าสู่ระบบ/สมัครสมาชิก",
        }}
        cta={{
          call: "โทรหาเรา",
          phone: "+66843374982",
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
          auth: "ເຂົ້າລະບົບ/ສະໝັກສະມາຊິກ",
        }}
        cta={{
          call: "ໂທຫາພວກເຮົາ",
          phone: "+66843374982",
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
        auth: "Login/Register",
      }}
      cta={{
        call: "Call Us",
        phone: "+66843374982",
      }}
    />
  );
}
