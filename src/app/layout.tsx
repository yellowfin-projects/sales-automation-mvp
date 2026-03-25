import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import SignOutButton from "@/components/SignOutButton";
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
  title: "Sales Pipeline",
  description: "Sales pipeline dashboard and deal coaching",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light" style={{ colorScheme: "light" }}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 min-h-screen`}
      >
        <nav className="bg-white border-b border-gray-200 px-6 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/" className="text-lg font-semibold text-gray-900">
                Sales Pipeline
              </Link>
              <div className="flex gap-4 text-sm">
                <Link
                  href="/"
                  className="text-gray-600 hover:text-gray-900"
                >
                  Pipeline
                </Link>
                <Link
                  href="/reps"
                  className="text-gray-600 hover:text-gray-900"
                >
                  Reps
                </Link>
                <Link
                  href="/leads"
                  className="text-gray-600 hover:text-gray-900"
                >
                  Leads
                </Link>
                <Link
                  href="/transcripts"
                  className="text-gray-600 hover:text-gray-900"
                >
                  Transcripts
                </Link>
                <Link
                  href="/settings"
                  className="text-gray-600 hover:text-gray-900"
                >
                  Settings
                </Link>
              </div>
            </div>
            <SignOutButton />
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-6 py-6">{children}</main>
      </body>
    </html>
  );
}
