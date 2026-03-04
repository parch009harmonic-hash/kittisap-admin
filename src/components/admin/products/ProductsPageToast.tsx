"use client";

import { useState } from "react";

import { Toast } from "../Toast";

type ProductsPageToastProps = {
  successMessage?: string;
  errorMessage?: string;
};

export function ProductsPageToast({ successMessage, errorMessage }: ProductsPageToastProps) {
  const [open, setOpen] = useState(true);
  const toast = errorMessage
    ? { type: "error" as const, message: errorMessage }
    : successMessage
      ? { type: "success" as const, message: successMessage }
      : null;

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
