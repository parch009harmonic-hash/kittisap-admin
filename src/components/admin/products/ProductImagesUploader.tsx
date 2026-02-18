"use client";

import { useState } from "react";

type ProductImagesUploaderProps = {
  productId?: string;
  onUploaded: (images: Array<{ url: string }>) => Promise<void>;
};

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export function ProductImagesUploader({ productId, onUploaded }: ProductImagesUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }

    setError(null);
    setIsUploading(true);
    try {
      const uploaded: Array<{ url: string }> = [];

      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          throw new Error("รองรับเฉพาะไฟล์รูปภาพ / Only image files are allowed.");
        }
        if (file.size > MAX_FILE_SIZE_BYTES) {
          throw new Error("รูปภาพต้องไม่เกิน 5MB / Image size must be 5MB or smaller.");
        }

        const formData = new FormData();
        formData.set("file", file);
        if (productId) {
          formData.set("productId", productId);
        }

        const response = await fetch("/api/admin/upload/product-image", {
          method: "POST",
          body: formData,
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || "Upload failed");
        }

        uploaded.push({ url: String(result.url) });
      }

      await onUploaded(uploaded);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={(event) => handleUpload(event.target.files)}
        className="input-base"
      />
      <p className="text-xs text-steel">
        รองรับหลายรูป สูงสุด 5MB ต่อไฟล์ / Multiple images, max 5MB each.
      </p>
      {isUploading && <p className="text-xs text-sapphire">Uploading...</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
