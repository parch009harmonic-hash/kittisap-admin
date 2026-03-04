"use client";

import { useEffect, useState } from "react";

import { emitStorefrontUpdateSignal } from "../../../../lib/storefront-sync";
import { Toast } from "../Toast";

type ProductsPageToastProps = {
  successMessage?: string;
  errorMessage?: string;
  syncStorefront?: boolean;
};

export function ProductsPageToast({ successMessage, errorMessage, syncStorefront = false }: ProductsPageToastProps) {
  const [open, setOpen] = useState(true);
  const toast = errorMessage
    ? { type: "error" as const, message: errorMessage }
    : successMessage
      ? { type: "success" as const, message: successMessage }
      : null;

  useEffect(() => {
    if (!successMessage && !syncStorefront) {
      return;
    }
    emitStorefrontUpdateSignal({ featured: true });
  }, [successMessage, syncStorefront]);

  if (!toast || !open) {
    return null;
  }

  return (
    <Toast
      open={open}
      type={toast.type}
      message={toast.message}
      onClose={() => setOpen(false)}
    />
  );
}
