import type { Metadata, Viewport } from "next";
import { Assistant } from "next/font/google";
import { strings } from "@/lib/strings";
import "./globals.css";

const assistant = Assistant({
  variable: "--font-assistant",
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: strings.app.name,
  description: strings.app.description,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fcfafb",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="he" dir="rtl" className={assistant.variable}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
