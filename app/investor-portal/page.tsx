"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Users2, Banknote, TrendingUp, Info } from "lucide-react";

export default function InvestorPortal() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  
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
  const totalDeposits = data.investments.reduce((sum: number, inv: any) => sum + inv.amount, 0);
  const totalWithdrawn = data.withdrawals.reduce((sum: number, w: any) => sum + w.amount, 0);
  const actualInvested = Math.max(0, totalDeposits - totalWithdrawn);

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

  const currentBalance = totalDeposits + totalProfit - totalWithdrawn;

  const getLinkClass = (path: string) => {
    const isActive = pathname === path;
    return `flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:text-blue-600 hover:bg-gray-50"
    }`;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Welcome back, {data.name}</h1>
          <p className="text-gray-500 mt-1">Here is your personal financial overview.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-lg shadow-sm border border-gray-200">
          <Link href="/investor-portal" className={getLinkClass("/investor-portal")}>My Data</Link>
          <Link href="/shared/investors" className={getLinkClass("/shared/investors")}><Users2 className="w-4 h-4" /> Investors</Link>
          <Link href="/shared/loans" className={getLinkClass("/shared/loans")}><Banknote className="w-4 h-4" /> Loans</Link>
          <Link href="/shared/profits" className={getLinkClass("/shared/profits")}><TrendingUp className="w-4 h-4" /> Profits</Link>
          <Link href="/about" className={getLinkClass("/about")}><Info className="w-4 h-4" /> About</Link>
        </div>
      </div>

      {/* PRINT HEADER */}
      <div className="hidden print:block mb-6">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid black', paddingBottom: '10px' }}>
          <div><h1 style={{ fontSize: '26pt', fontWeight: 'bold', textTransform: 'uppercase', margin: 0, lineHeight: 1 }}>Namma Trust</h1></div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '11pt', fontWeight: 'bold', textTransform: 'uppercase', margin: 0 }}>Investor Statement</p>
            <p style={{ fontSize: '9pt', color: '#555', margin: 0 }}>Generated: {new Date().toLocaleDateString("en-IN")}</p>
          </div>
        </div>

        <div style={{ marginTop: '12px', fontSize: '13pt', fontWeight: 'bold', color: '#333' }}>
          {data.name} {data.code ? `(${data.code})` : ""} 
          <span style={{ fontSize: '10pt', fontWeight: 'normal', color: '#666', marginLeft: '10px' }}>{data.phone} • Joined: {new Date(data.joinDate).toLocaleDateString("en-IN")}</span>
        </div>

        <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '24px', fontSize: '10pt', border: '1px solid #999', padding: '8px 12px', backgroundColor: '#f9f9f9' }}>
          <div><strong>Invested Amount:</strong> ₹{actualInvested.toLocaleString("en-IN")}</div>
          <div><strong>Outstanding Loan:</strong> ₹{outstandingLoan.toLocaleString("en-IN")}</div>
          <div><strong>Profit Earned:</strong> ₹{totalProfit.toLocaleString("en-IN")}</div>
          <div><strong>Current Balance:</strong> ₹{currentBalance.toLocaleString("en-IN")}</div>
        </div>
      </div>

      {/* SCREEN HEADER */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{data.name}</h2>
          <p className="text-gray-500 mt-1">{data.email} • {data.phone}</p>
          <div className="flex gap-4 mt-2 text-sm text-gray-500">
            <span>ID: <strong className="font-mono text-gray-700">{data.code || "N/A"}</strong></span>
            <span>Joined: {new Date(data.joinDate).toLocaleDateString("en-IN")}</span>
          </div>
        </div>
        <div className="mt-4 md:mt-0 flex flex-col items-end gap-2">
          <div className="bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-bold">ACCOUNT ACTIVE</div>
          <button onClick={() => window.print()} className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-900 flex items-center gap-2">🖨️ Print Full Statement</button>
        </div>
      </div>

      {/* 👈 SUMMARY CARDS (Including Trust Unspent Amount) */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8 print:hidden">
        
        <div className="bg-white p-5 rounded-lg shadow-sm border-t-4 border-green-500">
          <p className="text-sm font-medium text-gray-500">Invested Amount</p>
          <p className="text-2xl font-bold text-green-700 mt-2">₹{actualInvested.toLocaleString("en-IN")}</p>
          <p className="text-xs text-gray-400 mt-1">Your Cash In</p>
        </div>

        <div className="bg-white p-5 rounded-lg shadow-sm border-t-4 border-blue-500">
          <p className="text-sm font-medium text-gray-500">Current Balance</p>
          <p className="text-2xl font-bold text-blue-700 mt-2">₹{currentBalance.toLocaleString("en-IN")}</p>
          <p className="text-xs text-gray-400 mt-1">Cash + Profit</p>
        </div>
        
        <div className="bg-white p-5 rounded-lg shadow-sm border-t-4 border-purple-500">
          <p className="text-sm font-medium text-gray-500">Total Profit</p>
          <p className="text-2xl font-bold text-purple-700 mt-2">₹{totalProfit.toLocaleString("en-IN")}</p>
          <p className="text-xs text-gray-400 mt-1">All Time</p>
        </div>
        
        <div className="bg-white p-5 rounded-lg shadow-sm border-t-4 border-red-500">
          <p className="text-sm font-medium text-gray-500">Your Active Loan</p>
          <p className="text-2xl font-bold text-red-600 mt-2">₹{outstandingLoan.toLocaleString("en-IN")}</p>
          <p className="text-xs text-gray-400 mt-1">Pending Principal</p>
        </div>

        {/* 👈 THE NEW UNSPENT CARD */}
        <div className="bg-orange-50 p-5 rounded-lg shadow-sm border border-orange-200">
          <p className="text-sm font-medium text-orange-700">Trust Unspent Cash</p>
          <p className="text-2xl font-bold text-orange-800 mt-2">₹{data.trustUnspentAmount?.toLocaleString("en-IN") || 0}</p>
          <p className="text-xs text-orange-600 mt-1">Available to lend</p>
        </div>

      </div>

      {/* DETAILED TABLES */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6 print:shadow-none print:border-black">
        <div className="p-4 border-b bg-gray-50 font-semibold text-blue-700 print:bg-white print:text-black">Investment History</div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 print:bg-white">
            <tr>
              <th className="text-left px-4 py-2 text-gray-500">Date</th>
              <th className="text-left px-4 py-2 text-gray-500">Type</th>
              <th className="text-right px-4 py-2 text-gray-500">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.investments.map((inv: any) => (
              <tr key={inv.id} className="border-b">
                <td className="px-4 py-3">{new Date(inv.date).toLocaleDateString("en-IN")}</td>
                <td className="px-4 py-3 uppercase text-xs font-bold">{inv.type}</td>
                <td className="px-4 py-3 text-right text-green-600 font-medium">+₹{inv.amount.toLocaleString("en-IN")}</td>
              </tr>
            ))}
            {data.investments.length === 0 && <tr><td colSpan={3} className="p-4 text-center">No investments</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6 print:shadow-none print:border-black">
        <div className="p-4 border-b bg-gray-50 font-semibold text-red-700 print:bg-white print:text-black">Loan History</div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 print:bg-white">
            <tr>
              <th className="text-left px-4 py-2 text-gray-500">Loan ID</th>
              <th className="text-left px-4 py-2 text-gray-500">Date</th>
              <th className="text-right px-4 py-2 text-gray-500">Principal</th>
              <th className="text-right px-4 py-2 text-gray-500">Outstanding</th>
              <th className="text-left px-4 py-2 text-gray-500">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.loans.map((loan: any) => {
              const firstPending = loan.schedule.find((s: any) => s.status === "pending");
              const outstanding = firstPending ? firstPending.openingPrincipal : 0;
              return (
                <tr key={loan.id} className="border-b">
                  <td className="px-4 py-3 font-mono">{loan.code || "N/A"}</td>
                  <td className="px-4 py-3">{new Date(loan.startDate).toLocaleDateString("en-IN")}</td>
                  <td className="px-4 py-3 text-right">₹{loan.principalAmount.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-right text-red-600 font-medium">₹{outstanding.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 uppercase text-xs font-bold">{loan.status}</td>
                </tr>
              );
            })}
            {data.loans.length === 0 && <tr><td colSpan={5} className="p-4 text-center">No loans</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden print:shadow-none print:border-black">
        <div className="p-4 border-b bg-purple-50 font-semibold text-purple-700 print:bg-white print:text-black">Profit Earned (Monthly)</div>
        <table className="w-full text-sm">
          <thead className="bg-purple-50 print:bg-white">
            <tr>
              <th className="text-left px-4 py-2 text-gray-500">Cycle Month</th>
              <th className="text-right px-4 py-2 text-gray-500">Balance Used</th>
              <th className="text-right px-4 py-2 text-gray-500 bg-yellow-100 print:bg-white">Profit Earned</th>
            </tr>
          </thead>
          <tbody>
            {data.profitDistributions.map((pd: any) => (
              <tr key={pd.id} className="border-b">
                <td className="px-4 py-3">{new Date(pd.cycle.cycleStart).toLocaleDateString("en-IN", { month: 'long', year: 'numeric' })}</td>
                <td className="px-4 py-3 text-right text-gray-500">₹{pd.balanceUsed.toLocaleString("en-IN")}</td>
                <td className="px-4 py-3 text-right font-bold text-green-600 bg-yellow-50 print:bg-white">+₹{pd.shareAmount.toLocaleString("en-IN")}</td>
              </tr>
            ))}
            {data.profitDistributions.length === 0 && <tr><td colSpan={3} className="p-4 text-center">No profits yet</td></tr>}
          </tbody>
          <tfoot>
            <tr className="bg-yellow-100 print:bg-white border-t-2 border-black">
              <td colSpan={2} className="px-4 py-3 text-right font-bold">Total Profit Earned:</td>
              <td className="px-4 py-3 text-right font-bold text-green-700 text-lg">₹{totalProfit.toLocaleString("en-IN")}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
