import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
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
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
