"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function InvestorPortal() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && (session?.user as any)?.role !== "investor") router.push("/dashboard");
  }, [status, session, router]);

  useEffect(() => {
    if (status === "authenticated" && (session?.user as any)?.role === "investor") {
      fetch("/api/investor-portal")
        .then((res) => res.json())
        .then((data) => {
          if (data.error) setErrorMsg(data.error);
          else setData(data);
        })
        .finally(() => setLoading(false));
    }
  }, [status, session]);

  if (loading || status === "loading") return <div className="p-8 text-center mt-20">Loading your portfolio...</div>;
  if (errorMsg) return <div className="p-8 text-center text-red-600 mt-20">{errorMsg}</div>;
  if (!data) return <div className="p-8 text-center mt-20">No data found.</div>;

  // --- CALCULATIONS ---
  const totalInvested = data.investments.reduce((sum: number, inv: any) => sum + inv.amount, 0);
  const totalWithdrawn = data.withdrawals.reduce((sum: number, w: any) => sum + w.amount, 0);
  const currentBalance = totalInvested - totalWithdrawn;

  let outstandingLoan = 0;
  data.loans.forEach((loan: any) => {
    const firstPending = loan.schedule.find((s: any) => s.status === "pending");
    if (firstPending) outstandingLoan += firstPending.openingPrincipal;
  });

  let totalProfit = 0;
  let thisMonthProfit = 0;
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  data.profitDistributions.forEach((pd: any) => {
    totalProfit += pd.shareAmount;
    const cycleDate = new Date(pd.cycle.cycleStart);
    if (cycleDate.getMonth() === currentMonth && cycleDate.getFullYear() === currentYear) {
      thisMonthProfit += pd.shareAmount;
    }
  });

  return (
    <div className="p-8 max-w-6xl mx-auto">
      
      {/* PROFILE SECTION */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">{data.name}</h1>
          <p className="text-gray-500 mt-1">{data.email} • {data.phone}</p>
          <div className="flex gap-4 mt-2 text-sm text-gray-500">
            <span>ID: <strong className="font-mono text-gray-700">{data.code || "N/A"}</strong></span>
            <span>Joined: {new Date(data.joinDate).toLocaleDateString("en-IN")}</span>
          </div>
        </div>
        <div className="mt-4 md:mt-0 bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-bold">
          ACCOUNT ACTIVE
        </div>
      </div>

      {/* CLICKABLE SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Link href="/investor-portal/investments" className="bg-white p-6 rounded-lg shadow-sm border-t-4 border-blue-500 hover:scale-[1.02] transition-transform cursor-pointer block">
          <p className="text-sm font-medium text-gray-500">Total Investment</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">₹{totalInvested.toLocaleString("en-IN")}</p>
          <p className="text-xs text-blue-500 mt-3 font-medium">View History &rarr;</p>
        </Link>
        
        <Link href="/investor-portal/loans" className="bg-white p-6 rounded-lg shadow-sm border-t-4 border-red-500 hover:scale-[1.02] transition-transform cursor-pointer block">
          <p className="text-sm font-medium text-gray-500">Outstanding Loan</p>
          <p className="text-3xl font-bold text-red-600 mt-2">₹{outstandingLoan.toLocaleString("en-IN")}</p>
          <p className="text-xs text-red-500 mt-3 font-medium">View Loans &rarr;</p>
        </Link>
        
        <Link href="/investor-portal/profits" className="bg-purple-50 p-6 rounded-lg shadow-sm border border-purple-200 hover:scale-[1.02] transition-transform cursor-pointer block">
          <p className="text-sm font-medium text-purple-700">Total Profit Earned</p>
          <p className="text-3xl font-bold text-purple-800 mt-2">₹{totalProfit.toLocaleString("en-IN")}</p>
          <p className="text-xs text-purple-500 mt-3 font-medium">View Profit History &rarr;</p>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-green-50 p-6 rounded-lg shadow-sm border border-green-200">
          <p className="text-sm font-medium text-green-700">Current Wallet Balance</p>
          <p className="text-3xl font-bold text-green-800 mt-2">₹{currentBalance.toLocaleString("en-IN")}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm font-medium text-gray-500">This Month's Profit</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">₹{thisMonthProfit.toLocaleString("en-IN")}</p>
        </div>
      </div>

    </div>
  );
}
