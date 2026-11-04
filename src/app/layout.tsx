import type { Metadata, Viewport } from "next";
import { Bagel_Fat_One, Inter } from "next/font/google";
import { t } from "@/i18n";
import "./globals.css";

// next/font downloads these at build time and serves them from our own domain.
const bagel = Bagel_Fat_One({ weight: "400", subsets: ["latin"], variable: "--font-bagel" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: t("app.name"),
  description: "Familjens tavla – kalender, att göra och hemmet.",
  appleWebApp: { capable: true, title: t("app.name"), statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f2f2f2",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="sv" className={`${bagel.variable} ${inter.variable} antialiased`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
