import type { Metadata, Viewport } from "next";
import {
  Bricolage_Grotesque,
  IBM_Plex_Mono,
  Public_Sans,
} from "next/font/google";
import type { ReactNode } from "react";

import { AppToaster } from "@/components/ui/toaster";

import "./globals.css";

const displayFont = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
});

const bodyFont = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
  display: "swap",
});

const dataFont = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Job CRM",
    template: "%s · Job CRM",
  },
  description:
    "A private job-search desk for applications, conversations, interviews, and every detail in between.",
  applicationName: "Job CRM",
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#eef1ef",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${displayFont.variable} ${bodyFont.variable} ${dataFont.variable}`}
    >
      <body className="min-h-svh bg-background font-sans text-foreground antialiased">
        <a
          href="#main-content"
          className="fixed left-3 top-3 z-[100] -translate-y-24 rounded-md bg-evergreen px-4 py-2 text-sm font-semibold text-white transition-transform focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-cobalt focus:ring-offset-2"
        >
          Skip to content
        </a>
        {children}
        <AppToaster />
      </body>
    </html>
  );
}
