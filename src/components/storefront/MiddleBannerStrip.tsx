"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

import { WebHomepageImageItem } from "../../../lib/types/web-settings";

type MiddleBannerStripProps = {
  items: WebHomepageImageItem[];
  backgroundColor: string;
  sectionGapRem: number;
};

export function MiddleBannerStrip({ items, backgroundColor, sectionGapRem }: MiddleBannerStripProps) {
  const [brokenIds, setBrokenIds] = useState<string[]>([]);

  const visibleItems = useMemo(
    () =>
      items
        .filter((item) => item.imageUrl.trim().length > 0)
        .filter((item) => !brokenIds.includes(item.id))
        .slice(0, 3),
    [items, brokenIds],
  );

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <section
      className="mx-auto w-full max-w-7xl px-4"
      style={{ marginTop: `${sectionGapRem}rem` }}
    >
      <div
        className="space-y-3 overflow-hidden rounded-2xl border border-slate-400/20 p-3"
        style={{ backgroundColor }}
      >
        {visibleItems.map((item) => (
          <article key={item.id} className="overflow-hidden rounded-2xl border border-slate-300/25">
            <div className="relative aspect-[21/6] w-full">
              <Image
                src={item.imageUrl}
                alt=""
                fill
                sizes="100vw"
                className="object-cover"
                loading="lazy"
                unoptimized
                onError={() => {
                  setBrokenIds((prev) => (prev.includes(item.id) ? prev : [...prev, item.id]));
                }}
              />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
