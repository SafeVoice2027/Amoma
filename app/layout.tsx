import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import Script from "next/script";
import { RegisterServiceWorker } from "@/components/register-service-worker";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Amoma",
  description: "A safe, confidential way to report bullying and conflict.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Amoma",
  },
  // The app/icon.png filesystem convention isn't resolving in this project
  // (proxy.ts intercepts every request ahead of Next's own routing) —
  // declaring the favicon explicitly here works regardless of that.
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#6c4fe0" },
    { media: "(prefers-color-scheme: dark)", color: "#9c85fa" },
  ],
};

// Runs before paint so a saved theme choice applies immediately instead of
// flashing the OS-default theme first. Reads the same localStorage key that
// components/theme-toggle.tsx writes to.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var theme = localStorage.getItem("amoma-theme");
    if (theme === "light" || theme === "dark") {
      document.documentElement.setAttribute("data-theme", theme);
    }
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        {/* next/script with strategy="beforeInteractive" — Next.js injects
            this into the real document <head> itself and runs it before
            hydration; it must NOT be nested in a hand-written <head> element
            (that conflicts with Next's own head management and was causing
            a hydration mismatch on every page load). */}
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
