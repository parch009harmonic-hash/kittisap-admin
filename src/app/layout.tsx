import type { Metadata } from "next";
import {
  Inter,
  Kanit,
  Noto_Sans_Lao,
  Prompt,
} from "next/font/google";
import { cookies } from "next/headers";

import { normalizeAdminLocale } from "../../lib/i18n/admin";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const prompt = Prompt({
  variable: "--font-prompt",
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const kanit = Kanit({
  variable: "--font-kanit",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
});

const notoSansLao = Noto_Sans_Lao({
  variable: "--font-sans-lao",
  subsets: ["lao", "latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Kittisap Admin",
    template: "%s | Kittisap Admin",
  },
  description: "Kittisap customer website and commerce platform",
  manifest: "/manifest.webmanifest?v=20260225-3",
  applicationName: "Kittisap Admin",
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
      <body
        className={`${inter.variable} ${prompt.variable} ${kanit.variable} ${notoSansLao.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

