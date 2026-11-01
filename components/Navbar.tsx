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

  return (
    <nav className="bg-white border-b shadow-sm print:hidden">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16 items-center">
          
          {/* Logo / Brand */}
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl text-blue-800">
            <Home className="w-6 h-6" />
            Namma Trust
          </Link>

          {/* Desktop Menu (hidden on mobile) */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/dashboard" className="text-gray-600 hover:text-blue-600 flex items-center gap-1 text-sm font-medium">
              <LayoutDashboard className="w-4 h-4" /> Dashboard
            </Link>
            <Link href="/investors" className="text-gray-600 hover:text-blue-600 flex items-center gap-1 text-sm font-medium">
              <Users2 className="w-4 h-4" /> Investors
            </Link>
            <Link href="/loans" className="text-gray-600 hover:text-blue-600 flex items-center gap-1 text-sm font-medium">
              <Banknote className="w-4 h-4" /> Loans
            </Link>
            <Link href="/profits" className="text-gray-600 hover:text-blue-600 flex items-center gap-1 text-sm font-medium">
              <TrendingUp className="w-4 h-4" /> Profits
            </Link>
            <Link href="/audit" className="text-gray-600 hover:text-blue-600 flex items-center gap-1 text-sm font-medium">
              <ScrollText className="w-4 h-4" /> Audit
            </Link>
            
            <div className="h-6 w-px bg-gray-300"></div>

            <Link href="/account/password" className="text-gray-600 hover:text-blue-600 flex items-center gap-1 text-sm font-medium">
              <KeyRound className="w-4 h-4" /> Change Password
            </Link>

            {isAdmin && (
              <Link href="/admin/passwords" className="text-gray-600 hover:text-blue-600 flex items-center gap-1 text-sm font-medium">
                <ShieldCheck className="w-4 h-4" /> Manage Passwords
              </Link>
            )}

            <button 
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="bg-red-50 text-red-600 px-3 py-1.5 rounded flex items-center gap-1 text-sm font-medium hover:bg-red-100"
            >
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>

          {/* Mobile Hamburger Button */}
          <button 
            className="md:hidden p-2 text-gray-600"
            onClick={() => setIsOpen(!isOpen)}
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isOpen && (
        <div className="md:hidden border-t bg-gray-50 px-4 py-2 space-y-1">
          <Link href="/dashboard" onClick={() => setIsOpen(false)} className="block px-3 py-2 rounded text-gray-700 hover:bg-gray-200">
            Dashboard
          </Link>
          <Link href="/investors" onClick={() => setIsOpen(false)} className="block px-3 py-2 rounded text-gray-700 hover:bg-gray-200">
            Investors
          </Link>
          <Link href="/loans" onClick={() => setIsOpen(false)} className="block px-3 py-2 rounded text-gray-700 hover:bg-gray-200">
            Loans
          </Link>
          <Link href="/profits" onClick={() => setIsOpen(false)} className="block px-3 py-2 rounded text-gray-700 hover:bg-gray-200">
            Profits
          </Link>
          <Link href="/audit" onClick={() => setIsOpen(false)} className="block px-3 py-2 rounded text-gray-700 hover:bg-gray-200">
            Audit
          </Link>
          
          <div className="border-t my-2"></div>
          
          <Link href="/account/password" onClick={() => setIsOpen(false)} className="block px-3 py-2 rounded text-gray-700 hover:bg-gray-200">
            Change Password
          </Link>

          {isAdmin && (
            <Link href="/admin/passwords" onClick={() => setIsOpen(false)} className="block px-3 py-2 rounded text-gray-700 hover:bg-gray-200">
              Manage Passwords
            </Link>
          )}

          <button 
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full text-left px-3 py-2 rounded text-red-600 hover:bg-red-50 font-medium mt-2"
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}
