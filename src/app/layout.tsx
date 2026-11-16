import type { Metadata } from "next";
import { Fraunces, Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { prisma } from "@/lib/prisma";
import { isAuthenticated, isAuthEnabled } from "@/lib/auth";
import { SidebarProvider } from "@/components/nav/sidebar-provider";
import { SidebarShell } from "@/components/nav/sidebar-shell";
import { MobileTopBar } from "@/components/nav/mobile-top-bar";

// Layout juga query DB (daftar kapling untuk sidebar), sehingga harus dynamic
// agar sidebar tidak menampilkan kapling lama dari cache build sebelumnya.
export const dynamic = 'force-dynamic'

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "REKAPAL — Rekapan Kapling Kelapa Sawit",
  description: "Platform digital manajemen kapling kebun sawit: panen, perawatan, pengeluaran, dan penjualan",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const authEnabled = isAuthEnabled();
  const authed = await isAuthenticated();

  // Jangan query daftar kapling atau render sidebar bila user belum terautentikasi.
  const kaplings = authed
    ? await prisma.kapling.findMany({
        orderBy: { createdAt: "asc" },
      })
    : [];

  return (
    <html
      lang="id"
      className={`${plusJakarta.variable} ${fraunces.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
        {authed ? (
          <SidebarProvider>
            {/* App Shell */}
            <div style={{ display: "flex", minHeight: "100dvh" }}>
              {/* Sidebar */}
              <SidebarShell kaplings={kaplings} authEnabled={authEnabled} />

              {/* Main area */}
              <div className="app-main-wrap">
                {/* Mobile top bar */}
                <MobileTopBar kaplings={kaplings} />

                {/* Page content */}
                <main style={{ flex: 1 }}>
                  {children}
                </main>
              </div>
            </div>
          </SidebarProvider>
        ) : (
          <main style={{ flex: 1 }}>{children}</main>
        )}
      </body>
    </html>
  );
}
