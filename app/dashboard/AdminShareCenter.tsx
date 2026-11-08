"use client";

import { useState, useRef, useEffect } from "react";
import { Share2, ChevronDown } from "lucide-react";

// 👈 ACCEPT PROPS FOR REAL DATA
interface ShareProps {
  expectedEMI: number;
  monthly1000: number;
  extraExpected: number;
  grandTotal: number;
}

export default function AdminShareCenter({ expectedEMI, monthly1000, extraExpected, grandTotal }: ShareProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingLoans, setPendingLoans] = useState<any[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/loans/list?q=")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setPendingLoans(data.filter((l) => l.status === "requested"));
        }
      });
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const shareMessage = (type: string) => {
    let text = "";
    const dateStr = new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" });

    switch (type) {
      case "profit":
        text = `*Namma Trust - Monthly Profit Update* 📈\n\nHello Members,\nThe profit for *${dateStr}* has been successfully distributed to all investor accounts!\n\nCheck your investor portal to see your updated balance and profit history. Thank you for growing with us.\n\n_Together | We Care | We Grow_`;
        break;
      case "new_joinee":
        text = `*Welcome to Namma Trust!* 🎉\n\nWe are thrilled to welcome our newest member to the Namma Trust family.\n\nLet's grow together and build a stronger community.\n\n_Together | We Care | We Grow_`;
        break;
      case "approved_loan":
        text = `*Loan Approved* ✅\n\nA new loan has been successfully sanctioned and disbursed from the Trust. The EMI schedule has been generated and sent to the borrower.\n\n_Note: Check the Investor Portal for the latest active loans and schedules._`;
        break;
      case "expected":
        // 👈 INJECT REAL DATA HERE
        text = `*Namma Trust - Monthly Expected Collection* 💰\n\nAs we progress through *${dateStr}*, here is the expected collection summary for the Trust:\n\n• Expected EMIs (Loans): *₹${expectedEMI.toLocaleString("en-IN")}*\n• Monthly ₹1,000 Investments: *₹${monthly1000.toLocaleString("en-IN")}*\n• Other Extra Collections: *₹${extraExpected.toLocaleString("en-IN")}*\n\n*Total Expected:* *₹${grandTotal.toLocaleString("en-IN")}*\n\nLet's ensure all dues are cleared on time to keep our Trust financially strong!`;
        break;
      case "loan_requests":
        if (pendingLoans.length === 0) {
          text = `*Namma Trust Update*\n\nThere are currently no pending loan requests.`;
        } else {
          text = `*Namma Trust - Pending Loan Requests* ⏳\n\n`;
          pendingLoans.forEach((req, index) => {
            text += `${index + 1}. *${req.investor.name}*\n`;
            text += `   Amount: ₹${req.principalAmount.toLocaleString("en-IN")}\n`;
            text += `   Purpose: ${req.notes?.replace("REQUEST: ", "") || "N/A"}\n\n`;
          });
          text += `_Please contact the Admin for approval._`;
        }
        break;
    }

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="bg-[#25D366] text-white px-4 py-2 rounded hover:bg-[#1EBE5D] font-medium flex items-center gap-2 shadow-sm transition-colors"
      >
        <Share2 className="w-4 h-4" /> Share Updates <ChevronDown className="w-3 h-3" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
          <div className="p-3 border-b bg-gray-50 text-xs font-bold text-gray-600 uppercase tracking-wider">
            Select Message Type
          </div>
          
          <button onClick={() => shareMessage("loan_requests")} className="w-full text-left px-4 py-3 hover:bg-green-50 flex flex-col gap-1 border-b transition-colors">
            <div className="flex items-center justify-between w-full">
              <span className="text-sm font-bold text-gray-800">Loan Requests</span>
              {pendingLoans.length > 0 && (
                <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {pendingLoans.length}
                </span>
              )}
            </div>
            <span className="text-xs text-gray-500">Share current pending requests</span>
          </button>

          <button onClick={() => shareMessage("profit")} className="w-full text-left px-4 py-3 hover:bg-green-50 flex flex-col gap-1 border-b transition-colors">
            <span className="text-sm font-bold text-gray-800">This Month Profit</span>
            <span className="text-xs text-gray-500">Share profit distribution update</span>
          </button>

          <button onClick={() => shareMessage("new_joinee")} className="w-full text-left px-4 py-3 hover:bg-green-50 flex flex-col gap-1 border-b transition-colors">
            <span className="text-sm font-bold text-gray-800">Welcome New Joinee</span>
            <span className="text-xs text-gray-500">Welcome new investors to the group</span>
          </button>

          <button onClick={() => shareMessage("approved_loan")} className="w-full text-left px-4 py-3 hover:bg-green-50 flex flex-col gap-1 border-b transition-colors">
            <span className="text-sm font-bold text-gray-800">Approved Loan</span>
            <span className="text-xs text-gray-500">Announce a recently approved loan</span>
          </button>

          <button onClick={() => shareMessage("expected")} className="w-full text-left px-4 py-3 hover:bg-green-50 flex flex-col gap-1 transition-colors">
            <span className="text-sm font-bold text-gray-800">Expected Collection</span>
            <span className="text-xs text-gray-500">Share monthly expected totals</span>
          </button>
        </div>
      )}
    </div>
  );
}
