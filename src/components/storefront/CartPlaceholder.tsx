import type { AppLocale } from "../../../lib/i18n/locale";

type CartPlaceholderProps = {
  locale: AppLocale;
};

export function CartPlaceholder({ locale }: CartPlaceholderProps) {
  const t = locale === "th"
    ? {
        title: "ตะกร้าสินค้า",
        desc: "กำลังเชื่อมตะกร้าแบบเต็มรูปแบบ ในตอนนี้สามารถสั่งซื้อจากปุ่มสั่งซื้อในหน้าสินค้าได้ทันที",
      }
    : {
        title: "Cart",
        desc: "Full cart flow is being wired. You can place order directly from Product cards for now.",
      };

  return (
    <main className="min-h-[60vh] py-8 md:py-12">
      <section className="rounded-3xl border border-amber-500/35 bg-black/55 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
        <h1 className="text-3xl font-semibold text-amber-300 md:text-4xl">{t.title}</h1>
        <p className="mt-3 text-sm text-amber-100/75 md:text-base">{t.desc}</p>
      </section>
    </main>
  );
}
