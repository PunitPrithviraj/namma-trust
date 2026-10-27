"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

// --- INNER COMPONENT ---
function NavbarContent() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "admin";
  const isInvestor = (session?.user as any)?.role === "investor";

  if (pathname === "/login") return null;

  // Define links based on role
  const adminLinks = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Investors", href: "/investors" },
    { name: "Loans", href: "/loans" },
    { name: "Create Loan", href: "/loans/new" },
    { name: "Profit Distribution", href: "/cycles" },
    { name: "Audit Log", href: "/audit" },
    { name: "Users", href: "/users" },
  ];

  const investorLinks = [
    { name: "My Portfolio", href: "/investor-portal" },
  ];

  const navLinks = isAdmin ? adminLinks : investorLinks;

  return (
    <nav className="bg-white border-b border-gray-200 print:hidden sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo and Hamburger */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-600 hover:text-blue-600 focus:outline-none p-2 rounded-md hover:bg-gray-100 transition-colors"
              aria-label="Toggle menu"
            >
              {/* Hamburger Icon / Close Icon */}
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
            
            <Link href={isInvestor ? "/investor-portal" : "/dashboard"} className="text-xl font-bold text-blue-700 flex items-center gap-2 hover:text-blue-800">
              <span>🏠</span> Namma Trust
            </Link>
          </div>

          {/* Right Side (Dashboard Icon + Logout) */}
          <div className="flex items-center gap-3">
            {isAdmin && (
              <Link 
                href="/dashboard" 
                title="Go to Dashboard"
                className="text-gray-600 hover:text-blue-600 p-2 rounded-full hover:bg-blue-50 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </Link>
            )}
            
            <button 
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-sm bg-red-50 text-red-600 px-4 py-2 rounded hover:bg-red-100 font-medium transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Collapsible Menu (Horizontal Layout) */}
      <div 
        className={`overflow-hidden transition-all duration-300 ease-in-out bg-gray-50 border-t border-gray-100 ${
          isOpen ? "max-h-24 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap gap-6 items-center">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== "/dashboard" && link.href !== "/investor-portal" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={`text-sm font-medium transition-colors hover:text-blue-600 ${
                  isActive ? "text-blue-700 bg-blue-100/50 px-3 py-1.5 rounded-md" : "text-gray-600"
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

// --- OUTER COMPONENT ---
export default function Navbar() {
  return (
    <Suspense fallback={<div className="h-16 bg-white border-b border-gray-200"></div>}>
      <NavbarContent />
    </Suspense>
  );
}
