"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";

type ProductGallerySliderProps = {
  title: string;
  images: Array<{ id: string; url: string }>;
  fallbackUrl: string | null;
};

export function ProductGallerySlider({ title, images, fallbackUrl }: ProductGallerySliderProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(0);

  const slides = useMemo(() => {
    if (images.length > 0) {
      return images.map((img) => ({ key: img.id, url: img.url }));
    }
    if (fallbackUrl) {
      return [{ key: "cover", url: fallbackUrl }];
    }
    return [];
  }, [images, fallbackUrl]);

  const scrollTo = (nextIndex: number) => {
    if (!trackRef.current) {
      return;
    }

    const safe = Math.max(0, Math.min(nextIndex, slides.length - 1));
    const node = trackRef.current.children.item(safe) as HTMLElement | null;
    if (!node) {
      return;
    }

    node.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
    setIndex(safe);
  };

  const onScroll = () => {
    const track = trackRef.current;
    if (!track || slides.length <= 1) {
      return;
    }

    const width = track.clientWidth;
    if (!width) {
      return;
    }

    const next = Math.round(track.scrollLeft / width);
    if (next !== index) {
      setIndex(Math.max(0, Math.min(next, slides.length - 1)));
    }
  };

  if (slides.length === 0) {
    return (
      <div className="grid aspect-square place-items-center rounded-2xl border border-slate-200 bg-slate-100 text-sm text-slate-500">
        No Image
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((slide) => (
          <div key={slide.key} className="relative aspect-square min-w-full snap-start">
            <Image src={slide.url} alt={title} fill sizes="(max-width: 768px) 100vw, 42vw" className="object-cover" priority={index === 0} />
          </div>
        ))}
      </div>

      {slides.length > 1 ? (
        <div className="flex items-center justify-center gap-1.5">
          {slides.map((slide, dotIndex) => (
            <button
              key={slide.key}
              type="button"
              onClick={() => scrollTo(dotIndex)}
              className={`h-2 rounded-full transition-all ${dotIndex === index ? "w-6 bg-amber-500" : "w-2 bg-slate-300"}`}
              aria-label={`Go to slide ${dotIndex + 1}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
