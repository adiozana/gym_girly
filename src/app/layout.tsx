import type { Metadata, Viewport } from "next";
import { Assistant } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { strings } from "@/lib/strings";
import "./globals.css";

const assistant = Assistant({
  variable: "--font-assistant",
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: { default: strings.app.name, template: `%s · ${strings.app.name}` },
  description: strings.app.description,
  applicationName: strings.app.name,
  // iOS: full-screen from the home screen, with the app's own name under the icon.
  appleWebApp: { capable: true, title: strings.app.name, statusBarStyle: "default" },
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
      <body className="min-h-dvh">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
