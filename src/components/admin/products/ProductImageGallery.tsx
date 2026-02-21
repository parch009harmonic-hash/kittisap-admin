"use client";

import { useMemo, useState } from "react";

import { ProductImage } from "../../../../lib/types/product";

type ProductImageGalleryProps = {
  title: string;
  heroImage: string | null;
  images: ProductImage[];
};

type GalleryImage = {
  key: string;
  url: string;
};

export function ProductImageGallery({ title, heroImage, images }: ProductImageGalleryProps) {
  const galleryImages = useMemo(() => {
    const list: GalleryImage[] = [];
    const used = new Set<string>();

    if (heroImage) {
      list.push({ key: "hero", url: heroImage });
      used.add(heroImage);
    }

    for (const image of images) {
      if (used.has(image.url)) {
        continue;
      }
      list.push({ key: image.id, url: image.url });
      used.add(image.url);
    }

    return list;
  }, [heroImage, images]);

  const [activeKey, setActiveKey] = useState<string | null>(null);
  const resolvedActiveKey = galleryImages.some((item) => item.key === activeKey) ? activeKey : galleryImages[0]?.key ?? null;
  const activeImage = galleryImages.find((item) => item.key === resolvedActiveKey) ?? galleryImages[0] ?? null;

  if (!activeImage) {
    return (
      <div className="flex h-72 items-center justify-center rounded-2xl border border-dashed border-slate-300 text-sm text-slate-500 md:h-[390px]">
        No cover image
      </div>
    );
  }

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={activeImage.url}
        alt={title}
        className="product-detail-main-image h-72 w-full rounded-2xl border border-slate-200 object-cover md:h-[390px]"
      />

      {galleryImages.length > 1 ? (
        <div className="product-detail-thumbs mt-3 grid grid-cols-3 gap-2">
          {galleryImages.slice(0, 6).map((image) => {
            const isActive = image.key === activeImage.key;
            return (
              <button
                key={image.key}
                type="button"
                onClick={() => setActiveKey(image.key)}
                className={`overflow-hidden rounded-xl border transition ${
                  isActive ? "border-blue-500 ring-2 ring-blue-100" : "border-slate-200 hover:border-blue-300"
                }`}
                aria-label={`View image ${image.key}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt={title} className="h-20 w-full object-cover" />
              </button>
            );
          })}
        </div>
      ) : null}

      <p className="mt-3 text-sm text-slate-600">{galleryImages.length} image(s)</p>
    </>
  );
}
