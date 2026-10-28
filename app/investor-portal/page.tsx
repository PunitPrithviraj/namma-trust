"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

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
      
      {/* --- CUSTOM PRINT HEADER (INLINE STYLES FOR FORCE PRINTING) --- */}
      <div className="hidden print:block mb-6">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid black', paddingBottom: '10px' }}>
          
          {/* Left: Namma Trust (Big) */}
          <div>
            <h1 style={{ fontSize: '26pt', fontWeight: 'bold', textTransform: 'uppercase', margin: 0, lineHeight: 1 }}>Namma Trust</h1>
          </div>

          {/* Right: Statement & Date (Small) */}
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '11pt', fontWeight: 'bold', textTransform: 'uppercase', margin: 0 }}>Investor Statement</p>
            <p style={{ fontSize: '9pt', color: '#555', margin: 0 }}>Generated: {new Date().toLocaleDateString("en-IN")}</p>
          </div>
        </div>

        {/* Investor Details (Medium size) */}
        <div style={{ marginTop: '12px', fontSize: '13pt', fontWeight: 'bold', color: '#333' }}>
          {data.name} {data.code ? `(${data.code})` : ""} 
          <span style={{ fontSize: '10pt', fontWeight: 'normal', color: '#666', marginLeft: '10px' }}>
            {data.phone} • Joined: {new Date(data.joinDate).toLocaleDateString("en-IN")}
          </span>
        </div>

        {/* --- COMPACT PRINT-ONLY SUMMARY --- */}
        <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '24px', fontSize: '10pt', border: '1px solid #999', padding: '8px 12px', backgroundColor: '#f9f9f9' }}>
          <div><strong>Total Investment:</strong> ₹{totalInvested.toLocaleString("en-IN")}</div>
          <div><strong>Outstanding Loan:</strong> ₹{outstandingLoan.toLocaleString("en-IN")}</div>
          <div><strong>Profit Earned:</strong> ₹{totalProfit.toLocaleString("en-IN")}</div>
          <div><strong>This Month Profit:</strong> ₹{thisMonthProfit.toLocaleString("en-IN")}</div>
          <div><strong>Current Balance:</strong> ₹{currentBalance.toLocaleString("en-IN")}</div>
        </div>
      </div>

      {/* --- SCREEN HEADER & PRINT BUTTON --- */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center print:hidden">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">{data.name}</h1>
          <p className="text-gray-500 mt-1">{data.email} • {data.phone}</p>
          <div className="flex gap-4 mt-2 text-sm text-gray-500">
            <span>ID: <strong className="font-mono text-gray-700">{data.code || "N/A"}</strong></span>
            <span>Joined: {new Date(data.joinDate).toLocaleDateString("en-IN")}</span>
          </div>
        </div>
        
        <div className="mt-4 md:mt-0 flex flex-col items-end gap-2">
          <div className="bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-bold">
            ACCOUNT ACTIVE
          </div>
          
          {/* PRINT BUTTON */}
          <button 
            onClick={() => window.print()}
            className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-900 flex items-center gap-2"
          >
            🖨️ Print Full Statement
          </button>
        </div>
      </div>

      {/* SUMMARY CARDS (SCREEN ONLY) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 print:hidden">
        <div className="bg-white p-6 rounded-lg shadow-sm border-t-4 border-blue-500">
          <p className="text-sm font-medium text-gray-500">Total Investment</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">₹{totalInvested.toLocaleString("en-IN")}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border-t-4 border-red-500">
          <p className="text-sm font-medium text-gray-500">Outstanding Loan</p>
          <p className="text-3xl font-bold text-red-600 mt-2">₹{outstandingLoan.toLocaleString("en-IN")}</p>
        </div>
        
        <div className="bg-purple-50 p-6 rounded-lg shadow-sm border border-purple-200">
          <p className="text-sm font-medium text-purple-700">Total Profit Earned</p>
          <p className="text-3xl font-bold text-purple-800 mt-2">₹{totalProfit.toLocaleString("en-IN")}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 print:hidden">
        <div className="bg-green-50 p-6 rounded-lg shadow-sm border border-green-200">
          <p className="text-sm font-medium text-green-700">Current Wallet Balance</p>
          <p className="text-3xl font-bold text-green-800 mt-2">₹{currentBalance.toLocaleString("en-IN")}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm font-medium text-gray-500">This Month's Profit</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">₹{thisMonthProfit.toLocaleString("en-IN")}</p>
        </div>
      </div>

      {/* DETAILED TABLES */}
      
      {/* 1. INVESTMENTS */}
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

      {/* 2. LOANS */}
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

      {/* 3. PROFITS (HIGHLIGHTED) */}
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
          {/* Total Profit Row */}
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
