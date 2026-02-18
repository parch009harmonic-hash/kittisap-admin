import type { Metadata } from "next";
import {
  Noto_Sans_Lao,
  Noto_Sans_Thai,
  Noto_Serif_Lao,
  Noto_Serif_Thai,
} from "next/font/google";
import "./globals.css";

const notoSansThai = Noto_Sans_Thai({
  variable: "--font-sans-thai",
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const notoSansLao = Noto_Sans_Lao({
  variable: "--font-sans-lao",
  subsets: ["lao", "latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const notoSerifThai = Noto_Serif_Thai({
  variable: "--font-serif-thai",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
});

const notoSerifLao = Noto_Serif_Lao({
  variable: "--font-serif-lao",
  subsets: ["lao", "latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Kittisap Admin",
  description: "Kittisap Admin Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body
        className={`${notoSansThai.variable} ${notoSansLao.variable} ${notoSerifThai.variable} ${notoSerifLao.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
