"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function InvestorPortal() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // --- TAB STATE ---
  const [activeTab, setActiveTab] = useState<"my-data" | "all-investors">("my-data");

  // --- MY DATA STATE ---
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // --- ALL INVESTORS STATE ---
  const [allInvestors, setAllInvestors] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingInvestors, setLoadingInvestors] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && (session?.user as any)?.role !== "investor") router.push("/dashboard");
  }, [status, session, router]);

  // Fetch "My Data"
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

  // Fetch "All Investors" Data when tab is opened
  useEffect(() => {
    if (activeTab === "all-investors" && allInvestors.length === 0) {
      setLoadingInvestors(true);
      fetch("/api/investor-portal/all-investors", { cache: "no-store" })
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setAllInvestors(data);
        })
        .finally(() => setLoadingInvestors(false));
    }
  }, [activeTab, allInvestors.length]);

  if (loading || status === "loading") return <div className="p-8 text-center mt-20">Loading your portfolio...</div>;
  if (errorMsg) return <div className="p-8 text-center text-red-600 mt-20">{errorMsg}</div>;
  if (!data) return <div className="p-8 text-center mt-20">No data found.</div>;

  // --- CALCULATIONS FOR MY DATA ---
  const totalInvested = data.investments.reduce((sum: number, inv: any) => sum + inv.amount, 0);
  const totalWithdrawn = data.withdrawals.reduce((sum: number, w: any) => sum + w.amount, 0);

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

  const currentBalance = totalInvested + totalProfit - totalWithdrawn;

  // Filter All Investors based on search
  const filteredInvestors = allInvestors.filter((inv) => 
    inv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 max-w-6xl mx-auto">
      
      {/* --- TABS (Hidden on Print) --- */}
      <div className="flex border-b border-gray-200 mb-6 print:hidden">
        <button
          onClick={() => setActiveTab("my-data")}
          className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${
            activeTab === "my-data"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          My Data
        </button>
        <button
          onClick={() => setActiveTab("all-investors")}
          className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${
            activeTab === "all-investors"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          All Investors
        </button>
      </div>

      {/* ========================================== */}
      {/* TAB 1: MY DATA (Your existing layout)      */}
      {/* ========================================== */}
      {activeTab === "my-data" && (
        <div>
          {/* --- CUSTOM PRINT HEADER (INLINE STYLES FOR FORCE PRINTING) --- */}
          <div className="hidden print:block mb-6">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid black', paddingBottom: '10px' }}>
              <div>
                <h1 style={{ fontSize: '26pt', fontWeight: 'bold', textTransform: 'uppercase', margin: 0, lineHeight: 1 }}>Namma Trust</h1>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '11pt', fontWeight: 'bold', textTransform: 'uppercase', margin: 0 }}>Investor Statement</p>
                <p style={{ fontSize: '9pt', color: '#555', margin: 0 }}>Generated: {new Date().toLocaleDateString("en-IN")}</p>
              </div>
            </div>

            <div style={{ marginTop: '12px', fontSize: '13pt', fontWeight: 'bold', color: '#333' }}>
              {data.name} {data.code ? `(${data.code})` : ""} 
              <span style={{ fontSize: '10pt', fontWeight: 'normal', color: '#666', marginLeft: '10px' }}>
                {data.phone} • Joined: {new Date(data.joinDate).toLocaleDateString("en-IN")}
              </span>
            </div>

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
      )}

      {/* ========================================== */}
      {/* TAB 2: ALL INVESTORS (New Section)         */}
      {/* ========================================== */}
      {activeTab === "all-investors" && (
        <div>
          <div className="mb-6 print:hidden">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">All Investors Summary</h2>
            <input
              type="text"
              placeholder="Search by Investor ID or Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full md:w-96 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {loadingInvestors ? (
            <p className="text-gray-500">Loading investors...</p>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap">
                <thead className="bg-gray-50 text-gray-600 text-sm border-b">
                  <tr>
                    <th className="px-6 py-4">Investor ID</th>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4 text-right">Total Invested</th>
                    <th className="px-6 py-4 text-right">This Month Investment</th>
                    <th className="px-6 py-4 text-right">Loan Taken</th>
                    <th className="px-6 py-4 text-right">Repayments Made</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {filteredInvestors.map((inv) => (
                    <tr key={inv.id} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-4 font-mono text-gray-500">{inv.code}</td>
                      <td className="px-6 py-4 font-medium text-gray-800">{inv.name}</td>
                      <td className="px-6 py-4 text-right text-green-600 font-medium">
                        ₹{inv.totalInvested.toLocaleString("en-IN")}
                      </td>
                      <td className="px-6 py-4 text-right text-blue-600 font-medium">
                        ₹{inv.thisMonthInvestment.toLocaleString("en-IN")}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-800 font-medium">
                        ₹{inv.loanTaken.toLocaleString("en-IN")}
                      </td>
                      <td className="px-6 py-4 text-right text-purple-600 font-medium">
                        ₹{inv.repaymentsMade.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                  {filteredInvestors.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                        No investors found matching your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
