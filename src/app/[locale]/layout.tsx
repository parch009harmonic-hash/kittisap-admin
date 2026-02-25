import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import { PublicLocaleShell } from "../../components/storefront/PublicLocaleShell";

type LocalizedLayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocalizedLayout({ children, params }: LocalizedLayoutProps) {
  const locale = (await params).locale.toLowerCase();
  if (locale !== "th" && locale !== "en" && locale !== "lo") {
    notFound();
  }

  return <PublicLocaleShell locale={locale}>{children}</PublicLocaleShell>;
}

