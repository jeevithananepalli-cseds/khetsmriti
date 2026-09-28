import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppHeader } from "@/components/AppHeader";
import { MemoryModeProvider } from "@/components/MemoryMode";
import { MemoryPanel } from "@/components/MemoryPanel";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KhetSmriti",
  description:
    "A field officer who never forgets a farmer — it remembers every visit, objection and crop outcome, and learns which advice works in each village.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#37622f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <MemoryModeProvider>
          <div className="min-h-screen pb-24 lg:pb-8 lg:pr-[380px]">
            <AppHeader />
            <main className="mx-auto max-w-3xl px-4 py-5">{children}</main>
          </div>
          <MemoryPanel />
        </MemoryModeProvider>
      </body>
    </html>
  );
}
