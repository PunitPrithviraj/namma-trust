"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import { 
  LayoutDashboard, 
  Users2, 
  Banknote, 
  TrendingUp, 
  ScrollText, 
  KeyRound, 
  ShieldCheck, 
  Home, 
  LogOut, 
  Menu 
} from "lucide-react";

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const isAdmin = (session?.user as any)?.role === "admin";

  // Don't show navbar on login page
  if (pathname === "/login") return null;

  // Helper to check if a link is active
  const isActive = (path: string) => {
    if (path === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(path);
  };

  // Helper for active classes
  const getLinkClass = (path: string, isMobile = false) => {
    const base = isMobile 
      ? "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors" 
      : "flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors";

    return isActive(path)
      ? `${base} bg-blue-50 text-blue-700` // Active state (Highlight)
      : `${base} text-gray-600 hover:text-blue-600 hover:bg-gray-50`; // Inactive state
  };

  return (
    <nav className="bg-white border-b shadow-sm print:hidden sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16 items-center">
          
          {/* Logo / Brand */}
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl text-blue-800">
            <Home className="w-6 h-6" />
            Namma Trust
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-1">
            <Link href="/dashboard" className={getLinkClass("/dashboard")}>
              <LayoutDashboard className="w-4 h-4" /> Dashboard
            </Link>
            <Link href="/investors" className={getLinkClass("/investors")}>
              <Users2 className="w-4 h-4" /> Investors
            </Link>
            <Link href="/loans" className={getLinkClass("/loans")}>
              <Banknote className="w-4 h-4" /> Loans
            </Link>
            <Link href="/profits" className={getLinkClass("/profits")}>
              <TrendingUp className="w-4 h-4" /> Profits
            </Link>
            <Link href="/audit" className={getLinkClass("/audit")}>
              <ScrollText className="w-4 h-4" /> Audit
            </Link>
            
            <div className="h-6 w-px bg-gray-300 mx-2"></div>

            <Link href="/account/password" className={getLinkClass("/account/password")}>
              <KeyRound className="w-4 h-4" /> Change Password
            </Link>

            {isAdmin && (
              <Link href="/admin/passwords" className={getLinkClass("/admin/passwords")}>
                <ShieldCheck className="w-4 h-4" /> Manage Passwords
              </Link>
            )}

            <button 
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="ml-2 bg-red-50 text-red-600 px-3 py-2 rounded-md flex items-center gap-1.5 text-sm font-medium hover:bg-red-100 transition-colors"
            >
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>

          {/* Mobile Hamburger Button */}
          <button 
            className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-md"
            onClick={() => setIsOpen(!isOpen)}
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isOpen && (
        <div className="md:hidden border-t bg-white px-2 py-3 space-y-1 shadow-lg absolute w-full">
          <Link href="/dashboard" onClick={() => setIsOpen(false)} className={getLinkClass("/dashboard", true)}>
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </Link>
          <Link href="/investors" onClick={() => setIsOpen(false)} className={getLinkClass("/investors", true)}>
            <Users2 className="w-4 h-4" /> Investors
          </Link>
          <Link href="/loans" onClick={() => setIsOpen(false)} className={getLinkClass("/loans", true)}>
            <Banknote className="w-4 h-4" /> Loans
          </Link>
          <Link href="/profits" onClick={() => setIsOpen(false)} className={getLinkClass("/profits", true)}>
            <TrendingUp className="w-4 h-4" /> Profits
          </Link>
          <Link href="/audit" onClick={() => setIsOpen(false)} className={getLinkClass("/audit", true)}>
            <ScrollText className="w-4 h-4" /> Audit
          </Link>
          
          <div className="border-t my-2"></div>
          
          <Link href="/account/password" onClick={() => setIsOpen(false)} className={getLinkClass("/account/password", true)}>
            <KeyRound className="w-4 h-4" /> Change Password
          </Link>

          {isAdmin && (
            <Link href="/admin/passwords" onClick={() => setIsOpen(false)} className={getLinkClass("/admin/passwords", true)}>
              <ShieldCheck className="w-4 h-4" /> Manage Passwords
            </Link>
          )}

          <button 
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full flex items-center gap-2 px-4 py-2 rounded-md text-red-600 hover:bg-red-50 font-medium mt-2"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      )}
    </nav>
  );
}
