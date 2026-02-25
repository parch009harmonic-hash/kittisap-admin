import Link from "next/link";

import { listPublicPricingProducts, type PublicPricingProduct } from "../../../lib/db/publicProducts";
import type { AppLocale } from "../../../lib/i18n/locale";
import { StorefrontTopMenu } from "./StorefrontTopMenu";

type PricingTablePageProps = {
  locale: AppLocale;
  useLocalePrefix?: boolean;
};

type PriceGroup = {
  key: string;
  label: string;
  items: PublicPricingProduct[];
};

function text(locale: AppLocale) {
  if (locale === "th") {
    return {
      title: "ตารางราคา",
      subtitle: "แสดงราคาสินค้าทั้งหมดที่เปิดขายอยู่ในระบบ",
      product: "ชื่อสินค้า",
      price: "ราคาเริ่มต้น",
      stock: "สถานะสต็อก",
      action: "จัดการ",
      inStock: "พร้อมส่ง",
      outOfStock: "Out of stock",
      view: "ดูรายละเอียด",
      noDataTitle: "ยังไม่มีสินค้าที่เปิดขาย",
      noDataDesc: "เมื่อเปิดขายสินค้าในแอดมิน รายการจะแสดงที่หน้านี้อัตโนมัติ",
      groupByCategory: "จัดกลุ่มตามหมวดหมู่",
      groupByPrice: "จัดกลุ่มตามช่วงราคา",
      rangeA: "ต่ำกว่า 50,000 บาท",
      rangeB: "50,000 - 100,000 บาท",
      rangeC: "มากกว่า 100,000 บาท",
      uncategorized: "ไม่ระบุหมวดหมู่",
    };
  }

  return {
    title: "Pricing",
    subtitle: "Live active product pricing from the catalog.",
    product: "Product",
    price: "Starting Price",
    stock: "Stock",
    action: "Action",
    inStock: "In stock",
    outOfStock: "Out of stock",
    view: "View details",
    noDataTitle: "No active products",
    noDataDesc: "Items will appear here once published from admin.",
    groupByCategory: "Grouped by category",
    groupByPrice: "Grouped by price ranges",
    rangeA: "Below THB 50,000",
    rangeB: "THB 50,000 - 100,000",
    rangeC: "Above THB 100,000",
    uncategorized: "Uncategorized",
  };
}

function localizedTitle(product: PublicPricingProduct, locale: AppLocale) {
  return locale === "en" ? product.title_en || product.title_th : product.title_th;
}

function buildProductHref(locale: AppLocale, slug: string) {
  return locale === "th" ? `/products/${slug}` : `/${locale}/products/${slug}`;
}

function groupProducts(locale: AppLocale, items: PublicPricingProduct[]): { mode: "category" | "price"; groups: PriceGroup[] } {
  const t = text(locale);
  const categoryBuckets = new Map<string, PublicPricingProduct[]>();
  const uncategorizedItems: PublicPricingProduct[] = [];

  for (const item of items) {
    const rawCategory = (item.category_name || item.category || "").trim();
    if (!rawCategory) {
      uncategorizedItems.push(item);
      continue;
    }

    if (!categoryBuckets.has(rawCategory)) {
      categoryBuckets.set(rawCategory, []);
    }
    categoryBuckets.get(rawCategory)!.push(item);
  }

  if (categoryBuckets.size > 0) {
    const groups: PriceGroup[] = Array.from(categoryBuckets.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, rows]) => ({
        key: label,
        label,
        items: rows.sort((a, b) => a.price - b.price),
      }));

    if (uncategorizedItems.length > 0) {
      groups.push({
        key: "uncategorized",
        label: t.uncategorized,
        items: uncategorizedItems.sort((a, b) => a.price - b.price),
      });
    }

    return { mode: "category", groups };
  }

  const ranges: PriceGroup[] = [
    { key: "lt-50k", label: t.rangeA, items: [] },
    { key: "50k-100k", label: t.rangeB, items: [] },
    { key: "gt-100k", label: t.rangeC, items: [] },
  ];

  for (const item of items) {
    if (item.price < 50000) {
      ranges[0].items.push(item);
    } else if (item.price <= 100000) {
      ranges[1].items.push(item);
    } else {
      ranges[2].items.push(item);
    }
  }

  const groups = ranges
    .filter((group) => group.items.length > 0)
    .map((group) => ({
      ...group,
      items: group.items.sort((a, b) => a.price - b.price),
    }));

  return { mode: "price", groups };
}

export async function PricingTablePage({ locale, useLocalePrefix = false }: PricingTablePageProps) {
  const t = text(locale);
  const items = await listPublicPricingProducts();
  const grouped = groupProducts(locale, items);

  return (
    <>
      <StorefrontTopMenu locale={locale} useLocalePrefix={useLocalePrefix} />
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_#5c3f00_0%,_#1a1200_30%,_#090909_68%)] text-amber-50">
        <section className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 md:py-12">
        <header className="rounded-3xl border border-amber-500/35 bg-black/55 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur">
          <h1 className="font-heading text-3xl font-semibold text-amber-300 md:text-4xl">{t.title}</h1>
          <p className="mt-2 text-sm text-amber-100/80 md:text-base">{t.subtitle}</p>
          <p className="mt-3 inline-flex rounded-full border border-amber-600/35 bg-black/45 px-3 py-1 text-xs text-amber-200/85">
            {grouped.mode === "category" ? t.groupByCategory : t.groupByPrice}
          </p>
        </header>

        {grouped.groups.length === 0 ? (
          <section className="mt-6 rounded-2xl border border-amber-600/30 bg-black/45 p-10 text-center">
            <p className="text-xl font-semibold text-amber-200">{t.noDataTitle}</p>
            <p className="mt-2 text-sm text-amber-100/70">{t.noDataDesc}</p>
          </section>
        ) : (
          <div className="mt-6 space-y-5">
            {grouped.groups.map((group) => (
              <section key={group.key} className="overflow-hidden rounded-2xl border border-amber-500/25 bg-black/45">
                <div className="border-b border-amber-500/20 bg-black/55 px-4 py-3">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-amber-300">{group.label || t.uncategorized}</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-zinc-950/80 text-amber-100/80">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold">{t.product}</th>
                        <th className="px-4 py-3 text-left font-semibold">{t.price}</th>
                        <th className="px-4 py-3 text-left font-semibold">{t.stock}</th>
                        <th className="px-4 py-3 text-right font-semibold">{t.action}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map((item) => {
                        const out = item.stock <= 0;

                        return (
                          <tr key={item.id} className="border-t border-amber-500/15">
                            <td className="px-4 py-3 text-amber-100">{localizedTitle(item, locale)}</td>
                            <td className="px-4 py-3 font-semibold text-amber-300">THB {item.price.toLocaleString()}</td>
                            <td className="px-4 py-3">
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                  out ? "bg-rose-500/20 text-rose-200" : "bg-emerald-500/20 text-emerald-200"
                                }`}
                              >
                                {out ? t.outOfStock : `${t.inStock} (${item.stock})`}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Link
                                href={buildProductHref(locale, item.slug)}
                                className="inline-flex rounded-lg border border-amber-500/35 bg-amber-400/20 px-3 py-1.5 text-xs font-semibold text-amber-100 hover:bg-amber-300/30"
                              >
                                {t.view}
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </div>
        )}
        </section>
      </main>
    </>
  );
}
