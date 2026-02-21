"use client";

import { useState } from "react";

type ProductImagesUploaderProps = {
  productId?: string;
  onUploaded: (images: Array<{ url: string }>) => Promise<void>;
};

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit, timeoutMs = 20000) {
  let lastError: unknown;
  const maxAttempts = 2;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort("REQUEST_TIMEOUT"), timeoutMs);
    try {
      return await fetch(input, {
        ...init,
        cache: "no-store",
        signal: controller.signal,
      });
    } catch (error) {
      lastError = error;
      const isAbort = error instanceof Error && error.name === "AbortError";
      const isNetwork = error instanceof TypeError;
      const shouldRetry = (isAbort || isNetwork) && attempt + 1 < maxAttempts;
      if (!shouldRetry) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 220));
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError ?? new Error("Upload failed");
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    const lowered = error.message.toLowerCase();
    if (error.name === "AbortError" || lowered.includes("aborted")) {
      return "การเชื่อมต่อหมดเวลา กรุณาลองใหม่อีกครั้ง / Request timed out, please try again.";
    }
    return error.message;
  }
  return "Upload failed";
}

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

        const response = await fetchWithTimeout("/api/admin/upload/product-image", {
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
      setError(toErrorMessage(uploadError));
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
        className="input-base bg-white"
      />
      <p className="text-xs text-steel">
        รองรับหลายรูป สูงสุด 5MB ต่อไฟล์ / Multiple images, max 5MB each.
      </p>
      {isUploading && <p className="text-xs text-sapphire">กำลังอัปโหลด... / Uploading...</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
