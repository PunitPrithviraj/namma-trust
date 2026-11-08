"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import Image from "next/image";
import { 
  LayoutDashboard, Users2, Banknote, TrendingUp, ScrollText, 
  KeyRound, ShieldCheck, LogOut, Menu, Bell
} from "lucide-react";

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const isAdmin = (session?.user as any)?.role === "admin";
  const isInvestor = (session?.user as any)?.role === "investor";

  if (pathname === "/login") return null;

  const isActive = (path: string) => {
    if (path === "/dashboard") return pathname === "/dashboard";
    if (path === "/investor-portal") return pathname === "/investor-portal";
    return pathname.startsWith(path);
  };

  const getLinkClass = (path: string, isMobile = false) => {
    const base = isMobile 
      ? "flex items-center gap-3 px-4 py-3 rounded-md text-base font-medium transition-colors" 
      : "flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-semibold transition-colors";

    return isActive(path)
      ? `${base} bg-blue-50 text-blue-700` 
      : `${base} text-gray-600 hover:text-blue-600 hover:bg-gray-50`; 
  };

  return (
    <nav className="bg-white border-b shadow-sm print:hidden sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16 items-center">
          
          {/* LOGO */}
          <Link href={isInvestor ? "/investor-portal" : "/dashboard"} className="flex items-center gap-2 shrink-0">
            <Image src="/logo.png" alt="Namma Trust" width={36} height={36} className="object-contain" priority />
            <span className="font-bold text-lg text-blue-900 hidden sm:block whitespace-nowrap">
              Namma Trust
            </span>
          </Link>

          {/* DESKTOP MENU */}
          <div className="hidden lg:flex items-center gap-1">
            {isAdmin ? (
              <>
                <Link href="/dashboard" className={getLinkClass("/dashboard")}><LayoutDashboard className="w-4 h-4" /> Dashboard</Link>
                <Link href="/investors" className={getLinkClass("/investors")}><Users2 className="w-4 h-4" /> Investors</Link>
                <Link href="/loans" className={getLinkClass("/loans")}><Banknote className="w-4 h-4" /> Loans</Link>
                <Link href="/loans/requests" className={getLinkClass("/loans/requests")}><Bell className="w-4 h-4" /> Requests</Link>
                <Link href="/profits" className={getLinkClass("/profits")}><TrendingUp className="w-4 h-4" /> Profits</Link>
                <Link href="/audit" className={getLinkClass("/audit")}><ScrollText className="w-4 h-4" /> Audit</Link>
              </>
            ) : (
              <Link href="/investor-portal" className={getLinkClass("/investor-portal")}><LayoutDashboard className="w-4 h-4" /> My Portal</Link>
            )}
            
            <div className="h-5 w-px bg-gray-300 mx-2"></div>
            <Link href="/account/password" className={getLinkClass("/account/password")}><KeyRound className="w-4 h-4" /> Password</Link>
            {isAdmin && <Link href="/admin/passwords" className={getLinkClass("/admin/passwords")}><ShieldCheck className="w-4 h-4" /> Manage</Link>}

            <button onClick={() => signOut({ callbackUrl: "/login" })} className="ml-2 bg-red-50 text-red-600 px-3 py-2 rounded-md flex items-center gap-1.5 text-sm font-semibold hover:bg-red-100 transition-colors">
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>

          {/* MOBILE MENU BUTTON */}
          <button className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-md" onClick={() => setIsOpen(!isOpen)}>
            <Menu className="w-7 h-7" />
          </button>
        </div>
      </div>

      {/* MOBILE DROPDOWN */}
      {isOpen && (
        <div className="lg:hidden border-t bg-white px-3 py-4 space-y-2 shadow-lg absolute w-full">
          {isAdmin ? (
             <>
              <Link href="/dashboard" onClick={() => setIsOpen(false)} className={getLinkClass("/dashboard", true)}>Dashboard</Link>
              <Link href="/investors" onClick={() => setIsOpen(false)} className={getLinkClass("/investors", true)}>Investors</Link>
              <Link href="/loans" onClick={() => setIsOpen(false)} className={getLinkClass("/loans", true)}>Loans</Link>
              <Link href="/loans/requests" onClick={() => setIsOpen(false)} className={getLinkClass("/loans/requests", true)}>Loan Requests</Link>
              <Link href="/profits" onClick={() => setIsOpen(false)} className={getLinkClass("/profits", true)}>Profits</Link>
              <Link href="/audit" onClick={() => setIsOpen(false)} className={getLinkClass("/audit", true)}>Audit</Link>
             </>
          ) : (
             <Link href="/investor-portal" onClick={() => setIsOpen(false)} className={getLinkClass("/investor-portal", true)}>My Portal</Link>
          )}
          
          <div className="border-t my-3"></div>
          <Link href="/account/password" onClick={() => setIsOpen(false)} className={getLinkClass("/account/password", true)}>Change Password</Link>
          {isAdmin && <Link href="/admin/passwords" onClick={() => setIsOpen(false)} className={getLinkClass("/admin/passwords", true)}>Manage Passwords</Link>}

          <button onClick={() => signOut({ callbackUrl: "/login" })} className="w-full flex items-center gap-3 px-4 py-3 rounded-md text-red-600 hover:bg-red-50 font-medium mt-2">
            <LogOut className="w-5 h-5" /> Logout
          </button>
        </div>
      )}
    </nav>
  );
}
