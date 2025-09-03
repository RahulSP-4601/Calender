import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./provider";
import Interpret from "@/components/Interpret"; // ⬅️ mount the global Explain UI

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LawBandit",
  description: "Syllabus → Calendar",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen">
        <Providers>
          {/* Mark the whole app as context for interpretations (non-layout-breaking) */}
          <div data-interpret-context className="contents">
            {children}
          </div>

          {/* One global instance; shows the tiny “Explain” bubble on selection */}
          <Interpret />
        </Providers>
      </body>
    </html>
  );
}
