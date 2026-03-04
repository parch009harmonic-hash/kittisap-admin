"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";

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
  const [viewerOpen, setViewerOpen] = useState(false);
  const resolvedActiveKey = galleryImages.some((item) => item.key === activeKey) ? activeKey : galleryImages[0]?.key ?? null;
  const activeIndex = Math.max(0, galleryImages.findIndex((item) => item.key === resolvedActiveKey));
  const activeImage = galleryImages[activeIndex] ?? null;

  const setActiveByIndex = useCallback(
    (nextIndex: number) => {
      if (galleryImages.length === 0) {
        return;
      }
      const total = galleryImages.length;
      const safe = ((nextIndex % total) + total) % total;
      setActiveKey(galleryImages[safe].key);
    },
    [galleryImages],
  );

  useEffect(() => {
    if (!viewerOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setViewerOpen(false);
        return;
      }
      if (galleryImages.length <= 1) {
        return;
      }
      if (event.key === "ArrowLeft") {
        setActiveByIndex(activeIndex - 1);
        return;
      }
      if (event.key === "ArrowRight") {
        setActiveByIndex(activeIndex + 1);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeIndex, galleryImages.length, setActiveByIndex, viewerOpen]);

  if (!activeImage) {
    return (
      <div className="flex h-72 items-center justify-center rounded-2xl border border-dashed border-slate-300 text-sm text-slate-500 md:h-[390px]">
        No cover image
      </div>
    );
  }

  return (
    <>
      <div className="product-detail-main-image relative h-72 w-full overflow-hidden rounded-2xl border border-slate-200 md:h-[390px]">
        <Image src={activeImage.url} alt={title} fill sizes="(max-width: 768px) 100vw, 720px" className="object-cover" priority />
        {galleryImages.length > 1 ? (
          <>
            <button
              type="button"
              onClick={() => setActiveByIndex(activeIndex - 1)}
              className="absolute left-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-slate-900/55 text-lg font-semibold text-white hover:bg-slate-900/75"
              aria-label="Previous image"
            >
              {"<"}
            </button>
            <button
              type="button"
              onClick={() => setActiveByIndex(activeIndex + 1)}
              className="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-slate-900/55 text-lg font-semibold text-white hover:bg-slate-900/75"
              aria-label="Next image"
            >
              {">"}
            </button>
          </>
        ) : null}
      </div>

      <div className="mt-2 flex items-center justify-between text-sm text-slate-600">
        <p>
          {activeIndex + 1} / {galleryImages.length}
        </p>
        <button
          type="button"
          onClick={() => setViewerOpen(true)}
          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          Full view
        </button>
      </div>

      {galleryImages.length > 1 ? (
        <div className="product-detail-thumbs mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {galleryImages.map((image, imageIndex) => {
            const isActive = image.key === activeImage.key;
            return (
              <button
                key={image.key}
                type="button"
                onClick={() => setActiveKey(image.key)}
                className={`h-20 w-20 shrink-0 overflow-hidden rounded-xl border transition ${
                  isActive ? "border-blue-500 ring-2 ring-blue-100" : "border-slate-200 hover:border-blue-300"
                }`}
                aria-label={`View image ${imageIndex + 1}`}
              >
                <div className="relative h-full w-full overflow-hidden">
                  <Image src={image.url} alt={title} fill sizes="80px" className="object-cover" loading="lazy" />
                </div>
              </button>
            );
          })}
        </div>
      ) : null}

      <p className="mt-3 text-sm text-slate-600">{galleryImages.length} image(s)</p>

      {viewerOpen ? (
        <div className="fixed inset-0 z-[120] grid place-items-center p-4">
          <button
            type="button"
            onClick={() => setViewerOpen(false)}
            aria-label="Close image viewer"
            className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm"
          />

          <div className="relative z-[121] w-full max-w-5xl">
            <button
              type="button"
              onClick={() => setViewerOpen(false)}
              className="absolute right-2 top-2 z-[122] inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/40 bg-slate-900/70 text-sm font-semibold text-white hover:bg-slate-900"
              aria-label="Close image viewer"
            >
              x
            </button>

            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-white/20 bg-slate-900/80">
              <Image src={activeImage.url} alt={title} fill sizes="(max-width: 1024px) 100vw, 1024px" className="object-contain" priority />
              {galleryImages.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveByIndex(activeIndex - 1)}
                    className="absolute left-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-slate-900/65 text-lg font-semibold text-white hover:bg-slate-900/90"
                    aria-label="Previous image"
                  >
                    {"<"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveByIndex(activeIndex + 1)}
                    className="absolute right-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-slate-900/65 text-lg font-semibold text-white hover:bg-slate-900/90"
                    aria-label="Next image"
                  >
                    {">"}
                  </button>
                  <div className="absolute bottom-3 right-3 rounded-full border border-white/30 bg-slate-950/70 px-3 py-1 text-xs font-semibold text-slate-100">
                    {activeIndex + 1} / {galleryImages.length}
                  </div>
                </>
              ) : null}
            </div>

            {galleryImages.length > 1 ? (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {galleryImages.map((image, imageIndex) => {
                  const isActive = imageIndex === activeIndex;
                  return (
                    <button
                      key={`viewer-${image.key}`}
                      type="button"
                      onClick={() => setActiveByIndex(imageIndex)}
                      className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border ${
                        isActive ? "border-amber-300 ring-2 ring-amber-200/70" : "border-white/25"
                      }`}
                      aria-label={`View image ${imageIndex + 1}`}
                    >
                      <Image src={image.url} alt={title} fill sizes="64px" className="object-cover" loading="lazy" />
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
