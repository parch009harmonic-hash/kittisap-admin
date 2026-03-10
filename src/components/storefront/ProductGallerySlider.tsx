"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type ProductGallerySliderProps = {
  title: string;
  images: Array<{ id: string; url: string }>;
  fallbackUrl: string | null;
};

export function ProductGallerySlider({ title, images, fallbackUrl }: ProductGallerySliderProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const scrollRafRef = useRef<number | null>(null);
  const preloadedUrlsRef = useRef<Set<string>>(new Set());
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

  const prefetchImage = useCallback((url: string | null | undefined) => {
    const normalized = String(url ?? "").trim();
    if (!normalized || preloadedUrlsRef.current.has(normalized) || typeof window === "undefined") {
      return;
    }
    preloadedUrlsRef.current.add(normalized);
    const img = new window.Image();
    img.decoding = "async";
    img.loading = "eager";
    img.src = normalized;
  }, []);

  useEffect(() => {
    if (slides.length === 0) {
      setIndex(0);
      return;
    }
    if (index > slides.length - 1) {
      setIndex(slides.length - 1);
    }
  }, [index, slides.length]);

  useEffect(() => {
    if (slides.length <= 1) {
      return;
    }
    prefetchImage(slides[(index + 1) % slides.length]?.url);
    prefetchImage(slides[(index - 1 + slides.length) % slides.length]?.url);
  }, [index, prefetchImage, slides]);

  useEffect(() => {
    return () => {
      if (scrollRafRef.current !== null) {
        window.cancelAnimationFrame(scrollRafRef.current);
      }
    };
  }, []);

  const scrollTo = useCallback((nextIndex: number) => {
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
    prefetchImage(slides[safe]?.url);
  }, [prefetchImage, slides]);

  const onScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track || slides.length <= 1) {
      return;
    }

    if (scrollRafRef.current !== null) {
      return;
    }

    scrollRafRef.current = window.requestAnimationFrame(() => {
      scrollRafRef.current = null;
      const width = track.clientWidth;
      if (!width) {
        return;
      }

      const next = Math.round(track.scrollLeft / width);
      if (next !== index) {
        setIndex(Math.max(0, Math.min(next, slides.length - 1)));
      }
    });
  }, [index, slides.length]);

  const moveSlide = useCallback((step: number) => {
    scrollTo(index + step);
  }, [index, scrollTo]);

  if (slides.length === 0) {
    return (
      <div className="grid aspect-square place-items-center rounded-2xl border border-slate-200 bg-slate-100 text-sm text-slate-500">
        No Image
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <div
          ref={trackRef}
          onScroll={onScroll}
          className="flex snap-x snap-mandatory overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {slides.map((slide) => (
            <div key={slide.key} className="relative aspect-square min-w-full snap-start">
              <Image
                src={slide.url}
                alt={title}
                fill
                sizes="(max-width: 768px) 100vw, 42vw"
                className="object-cover"
                priority={index === 0}
                unoptimized
              />
            </div>
          ))}
        </div>

        {slides.length > 1 ? (
          <>
            <button
              type="button"
              onClick={() => moveSlide(-1)}
              className="absolute left-2 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/35 bg-slate-900/60 text-white transition hover:bg-slate-900/85"
              aria-label="Previous image"
            >
              {"<"}
            </button>
            <button
              type="button"
              onClick={() => moveSlide(1)}
              className="absolute right-2 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/35 bg-slate-900/60 text-white transition hover:bg-slate-900/85"
              aria-label="Next image"
            >
              {">"}
            </button>
          </>
        ) : null}
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
