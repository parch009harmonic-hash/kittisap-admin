"use client";

import { useState } from "react";

import { getUiMaintenanceLockedMessageDual, UI_MAINTENANCE_LOCKED } from "../api-error";

type ProductImagesUploaderProps = {
  productId?: string;
  onUploaded: (images: Array<{ url: string }>) => Promise<void>;
  onUploadingChange?: (uploading: boolean) => void;
};

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const UPLOAD_CONCURRENCY = 4;

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

export function ProductImagesUploader({ productId, onUploaded, onUploadingChange }: ProductImagesUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }

    setError(null);
    setIsUploading(true);
    onUploadingChange?.(true);
    try {
      const selectedFiles = Array.from(files);
      for (const file of selectedFiles) {
        if (!file.type.startsWith("image/")) {
          throw new Error("รองรับเฉพาะไฟล์รูปภาพ / Only image files are allowed.");
        }
        if (file.size > MAX_FILE_SIZE_BYTES) {
          throw new Error("รูปภาพต้องไม่เกิน 5MB / Image size must be 5MB or smaller.");
        }
      }

      const uploaded = new Array<{ url: string }>(selectedFiles.length);
      let cursor = 0;

      async function worker() {
        while (true) {
          const index = cursor;
          cursor += 1;
          if (index >= selectedFiles.length) {
            return;
          }
          const file = selectedFiles[index];

          const formData = new FormData();
          formData.set("file", file);
          if (productId) {
            formData.set("productId", productId);
          }

          const response = await fetchWithTimeout("/api/admin/upload/product-image", {
            method: "POST",
            body: formData,
          });

          const result = (await response.json()) as { code?: string; error?: string; url?: string };
          if (!response.ok) {
            if (result.code === UI_MAINTENANCE_LOCKED) {
              throw new Error(result.error || getUiMaintenanceLockedMessageDual());
            }
            throw new Error(result.error || "Upload failed");
          }

          uploaded[index] = { url: String(result.url) };
        }
      }

      const workers = Array.from({ length: Math.min(UPLOAD_CONCURRENCY, selectedFiles.length) }, () => worker());
      await Promise.all(workers);
      await onUploaded(uploaded.filter((item): item is { url: string } => Boolean(item?.url)));
    } catch (uploadError) {
      setError(toErrorMessage(uploadError));
    } finally {
      setIsUploading(false);
      onUploadingChange?.(false);
    }
  }

  return (
    <div className="space-y-2">
      <input
        type="file"
        accept="image/*"
        multiple
        disabled={isUploading}
        onChange={(event) => handleUpload(event.target.files)}
        className="input-base bg-white disabled:cursor-not-allowed disabled:opacity-60"
      />
      <p className="text-xs text-steel">
        รองรับหลายรูป สูงสุด 5MB ต่อไฟล์ / Multiple images, max 5MB each.
      </p>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
