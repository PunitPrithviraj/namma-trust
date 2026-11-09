import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import AuthProvider from "@/components/AuthProvider"; // 👈 Ensure this exists in your project

const inter = Inter({ subsets: ["latin"] });

// 👈 ADDED METADATA FOR PWA / APK
export const metadata: Metadata = {
  title: "Namma Trust",
  description: "Namma Trust Financial Management App",
  manifest: "/manifest.json",
  themeColor: "#1e3a8a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <Navbar />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
