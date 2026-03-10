import type { Metadata } from "next";
import { cookies } from "next/headers";

import { normalizeAdminLocale } from "../../lib/i18n/admin";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Kittisap Atv",
    template: "%s | Kittisap Atv",
  },
  description: "Kittisap customer website and commerce platform",
  manifest: "/manifest.webmanifest?v=20260225-3",
  applicationName: "Kittisap Atv",
  icons: {
    icon: "/icons/pwa-icon-512.png",
    shortcut: "/icons/pwa-icon-512.png",
    apple: "/apple-icon.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const locale = normalizeAdminLocale(cookieStore.get("admin_locale")?.value);

  return (
    <html lang={locale}>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

