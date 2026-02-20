"use client";

import { DragEvent } from "react";

type ProductImagesGridProps = {
  images: Array<{
    id: string;
    url: string;
    sort: number;
    is_primary: boolean;
  }>;
  onReorder: (
    next: Array<{
      id: string;
      url: string;
      sort: number;
      is_primary: boolean;
    }>
  ) => void;
  onSetPrimary: (imageId: string) => void;
  onRemove: (imageId: string) => void;
};

export function ProductImagesGrid({
  images,
  onReorder,
  onSetPrimary,
  onRemove,
}: ProductImagesGridProps) {
  function onDragStart(event: DragEvent<HTMLDivElement>, id: string) {
    event.dataTransfer.setData("text/plain", id);
  }

  function onDrop(event: DragEvent<HTMLDivElement>, targetId: string) {
    event.preventDefault();
    const sourceId = event.dataTransfer.getData("text/plain");
    if (!sourceId || sourceId === targetId) {
      return;
    }

    const current = [...images];
    const sourceIndex = current.findIndex((item) => item.id === sourceId);
    const targetIndex = current.findIndex((item) => item.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) {
      return;
    }

    const [moved] = current.splice(sourceIndex, 1);
    current.splice(targetIndex, 0, moved);
    onReorder(
      current.map((image, index) => ({
        ...image,
        sort: index,
      }))
    );
  }

  return (
    <div className="product-images-grid grid grid-cols-2 gap-3 md:grid-cols-4">
      {images.map((image) => (
        <div
          key={image.id}
          draggable
          onDragStart={(event) => onDragStart(event, image.id)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => onDrop(event, image.id)}
          className="glass-card rounded-2xl p-2.5"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.url} alt="Product image" className="h-28 w-full rounded-xl object-cover" />
          <div className="mt-2 space-y-1.5">
            <button
              type="button"
              onClick={() => onSetPrimary(image.id)}
              className={`w-full rounded-md px-2 py-1 text-xs font-semibold ${
                image.is_primary
                  ? "btn-primary"
                  : "border border-border bg-white text-ink hover:bg-mist"
              }`}
            >
              {image.is_primary ? "ภาพปก / Cover" : "ตั้งเป็นภาพปก / Set as cover"}
            </button>
            <button
              type="button"
              onClick={() => onRemove(image.id)}
              className="w-full rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-700 hover:bg-rose-100"
            >
              ลบรูป / Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
