import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import SessionProviderWrapper from "@/components/SessionProviderWrapper";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Namma Trust",
  description: "Namma Trust Financial Management App",
  manifest: "/manifest.json",
  themeColor: "#1e3a8a",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionProviderWrapper session={session}>
          <Navbar />
          {children}
        </SessionProviderWrapper>
        
        {/* 👈 SERVICE WORKER SCRIPT ADDED HERE */}
        <script src="/register-sw.js" defer></script>
      </body>
    </html>
  );
}
