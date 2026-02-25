"use client";

import { useMemo, useState } from "react";

import { WebNewsCardItem } from "../../../lib/types/web-settings";

type ActivitiesNewsGridProps = {
  items: WebNewsCardItem[];
  placeholderTitle: string;
  placeholderMeta: string;
};

function extractYouTubeId(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.replace("/", "");
    }
    if (parsed.hostname.includes("youtube.com")) {
      return parsed.searchParams.get("v") || "";
    }
    return "";
  } catch {
    return "";
  }
}

export function ActivitiesNewsGrid({ items, placeholderTitle, placeholderMeta }: ActivitiesNewsGridProps) {
  const validItems = useMemo(
    () =>
      items
        .filter((item) => item.title.trim().length > 0)
        .slice(0, 6),
    [items],
  );
  const [activeId, setActiveId] = useState<string | null>(null);

  const active = validItems.find((item) => item.id === activeId) ?? null;
  const activeYoutubeId = active?.videoUrl ? extractYouTubeId(active.videoUrl) : "";

  if (validItems.length === 0) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <a key={item} href="#" className="tap-ripple app-press overflow-hidden rounded-2xl border border-slate-400/20 bg-gradient-to-b from-slate-900/90 to-slate-950/80 shadow-[0_14px_50px_rgba(0,0,0,0.28)] transition hover:-translate-y-0.5 hover:border-amber-400/40">
            <div className="aspect-[16/10] bg-[linear-gradient(135deg,rgba(245,158,11,0.22),rgba(59,130,246,0.12)),radial-gradient(800px_300px_at_20%_20%,rgba(255,255,255,0.08),transparent_45%)]" />
            <div className="p-4">
              <p className="text-sm font-extrabold tracking-tight text-slate-100">{placeholderTitle}</p>
              <p className="mt-1 text-xs text-slate-300/70">{placeholderMeta}</p>
            </div>
          </a>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {validItems.map((item) => {
          const youtubeId = item.videoUrl ? extractYouTubeId(item.videoUrl) : "";
          const thumbnail =
            item.mediaType === "youtube" && youtubeId
              ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`
              : item.imageUrl;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveId(item.id)}
              className="overflow-hidden rounded-2xl border border-slate-400/20 bg-slate-950/85 text-left shadow-[0_14px_50px_rgba(0,0,0,0.28)] transition hover:-translate-y-0.5 hover:border-amber-400/40"
            >
              <div className="relative aspect-[16/10] w-full bg-[linear-gradient(135deg,rgba(245,158,11,0.22),rgba(59,130,246,0.12))]">
                {thumbnail ? <img src={thumbnail} alt="" className="h-full w-full object-cover" /> : null}
                {item.mediaType === "youtube" ? (
                  <span className="absolute right-3 top-3 rounded-full border border-white/35 bg-black/55 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-white">
                    Video
                  </span>
                ) : null}
              </div>
              <div className="p-4">
                <p className="text-base font-extrabold tracking-tight text-slate-100">{item.title}</p>
                <p className="mt-1 text-xs text-slate-300/70">{item.meta}</p>
              </div>
            </button>
          );
        })}
      </div>

      {active ? (
        <div className="fixed inset-0 z-[120] bg-slate-950/80 p-4 backdrop-blur-sm" onClick={() => setActiveId(null)}>
          <div
            className="mx-auto mt-8 w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-300/25 bg-[#050b14] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative aspect-[16/9] bg-black">
              {active.mediaType === "youtube" && activeYoutubeId ? (
                <iframe
                  src={`https://www.youtube.com/embed/${activeYoutubeId}?autoplay=1&rel=0`}
                  title={active.title}
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full"
                />
              ) : active.imageUrl ? (
                <img src={active.imageUrl} alt="" className="h-full w-full object-cover" />
              ) : null}
            </div>
            <div className="space-y-2 p-5">
              <p className="text-2xl font-black tracking-tight text-slate-100">{active.title}</p>
              <p className="text-sm text-slate-300/75">{active.meta}</p>
              <p className="whitespace-pre-line text-sm leading-7 text-slate-200/90">{active.description}</p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
