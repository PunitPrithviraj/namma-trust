"use client";

import { Suspense } from "react"; // <-- IMPORT SUSPENSE
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { SessionProvider, useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

const inter = Inter({ subsets: ["latin"] });

function ForcePasswordGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const needsReset = (session.user as any).forcePasswordReset;
      
      if (needsReset && pathname !== "/change-password") {
        router.push("/change-password");
      }
    }
  }, [session, status, router, pathname]);

  return <>{children}</>;
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 min-h-screen`}>
        <SessionProvider>
          {/* WRAP THE GUARD IN SUSPENSE */}
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <ForcePasswordGuard>
              <Navbar />
              <main>
                {children}
              </main>
            </ForcePasswordGuard>
          </Suspense>
        </SessionProvider>
      </body>
    </html>
  );
}
