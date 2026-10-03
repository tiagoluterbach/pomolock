import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Rubik } from "next/font/google";
import { TimerRunner } from "@/components/timer/TimerRunner";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { SyncProvider } from "@/components/SyncProvider";
import { Navbar } from "@/components/Navbar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "PomoLock",
  description:
    "PomoLock — A customizable Pomodoro Timer with hyperfocus mode, heatmap statistics, and cloud sync.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PomoLock",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#e74c6f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${rubik.variable} antialiased bg-[#1A1B24]`}
      >
        <TimerRunner />
        <SyncProvider />
        <ServiceWorkerRegistration />
        <Navbar />
        {children}
      </body>
    </html>
  );
}
