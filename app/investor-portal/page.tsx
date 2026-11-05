"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Users2, Banknote, TrendingUp, Info, Plus } from "lucide-react";

// ROUNDING FUNCTION: Always rounds down (floor)
function investorRound(amount: number) {
  return Math.floor(amount);
}

export default function InvestorPortal() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [cancelLoading, setCancelLoading] = useState<string | null>(null);

  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [reqAmount, setReqAmount] = useState("");
  const [reqPurpose, setReqPurpose] = useState("");
  const [reqLoading, setReqLoading] = useState(false);
  const [reqError, setReqError] = useState("");
  const requestRef = useRef<HTMLDivElement>(null);

  async function loadData() {
    setLoading(true);
    fetch("/api/investor-portal")
      .then((res) => res.json())
      .then((d) => {
        if (d.error) setErrorMsg(d.error);
        else setData(d);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && (session?.user as any)?.role !== "investor") router.push("/dashboard");
    else if (status === "authenticated") loadData();
  }, [status, session, router]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (requestRef.current && !requestRef.current.contains(event.target as Node)) {
        setIsRequestOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLoanRequest(e: React.FormEvent) {
    e.preventDefault();
    setReqLoading(true);
    setReqError("");

    const res = await fetch("/api/loans/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(reqAmount), purpose: reqPurpose }),
    });

    const resData = await res.json();
    setReqLoading(false);

    if (res.ok) {
      setIsRequestOpen(false);
      setReqAmount("");
      setReqPurpose("");
      alert("Loan request submitted successfully! The Admin will review it shortly.");
      loadData(); // Refresh table
    } else {
      setReqError(resData.error || "Failed to submit request");
    }
  }

  // 👈 CANCEL REQUEST FUNCTION
  async function handleCancelRequest(id: string) {
    if (!confirm("Are you sure you want to cancel this loan request?")) return;
    setCancelLoading(id);
    const res = await fetch(`/api/loans/request/${id}`, { method: "DELETE" });
    const resData = await res.json();
    setCancelLoading(null);

    if (res.ok) {
      alert("Request cancelled successfully.");
      loadData();
    } else {
      alert(resData.error || "Failed to cancel");
    }
  }

  if (loading || status === "loading") return <div className="p-8 text-center mt-20">Loading your portfolio...</div>;
  if (errorMsg) return <div className="p-8 text-center text-red-600 mt-20">{errorMsg}</div>;
  if (!data) return <div className="p-8 text-center mt-20">No data found.</div>;

  const totalDeposits = data.investments.reduce((sum: number, inv: any) => sum + inv.amount, 0);
  const totalWithdrawn = data.withdrawals.reduce((sum: number, w: any) => sum + w.amount, 0);
  
  let totalProfit = 0;
  data.profitDistributions.forEach((pd: any) => {
    totalProfit += pd.shareAmount;
  });

  const currentBalance = totalDeposits + totalProfit - totalWithdrawn;
  const investorUnspentShare = data.investorUnspentShare || 0;

  const rawInvestedAmount = currentBalance - investorUnspentShare;
  const investedAmount = investorRound(Math.max(0, rawInvestedAmount));

  let outstandingLoan = 0;
  data.loans.forEach((loan: any) => {
    const firstPending = loan.schedule?.find((s: any) => s.status === "pending");
    if (firstPending) outstandingLoan += firstPending.openingPrincipal;
  });

  const getLinkClass = (path: string) => {
    const isActive = pathname === path;
    return `flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:text-blue-600 hover:bg-gray-50"
    }`;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
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

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{data.name}</h2>
          <p className="text-gray-500 mt-1">{data.email} • {data.phone}</p>
          <div className="flex gap-4 mt-2 text-sm text-gray-500">
            <span>ID: <strong className="font-mono text-gray-700">{data.code || "N/A"}</strong></span>
            <span>Joined: {new Date(data.joinDate).toLocaleDateString("en-IN")}</span>
          </div>
        </div>
        
        <div className="mt-4 md:mt-0 flex flex-col items-end gap-2 relative" ref={requestRef}>
          <button onClick={() => setIsRequestOpen(!isRequestOpen)} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2 font-medium">
            <Plus className="w-4 h-4" /> Request Loan
          </button>

          {isRequestOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 p-5 z-50 top-full">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-800">Request a Loan</h2>
                <button onClick={() => setIsRequestOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
              </div>
              
              {reqError && <div className="bg-red-50 text-red-700 p-2 rounded mb-3 text-xs">{reqError}</div>}

              <form onSubmit={handleLoanRequest} className="space-y-4">
                <label className="block">
                  <span className="text-xs font-medium text-gray-700">Amount Required (₹)</span>
                  <input type="number" value={reqAmount} onChange={(e) => setReqAmount(e.target.value)} required min="1" className="mt-1 w-full border rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500" />
                </label>

                <label className="block">
                  <span className="text-xs font-medium text-gray-700">Purpose of Loan</span>
                  <textarea value={reqPurpose} onChange={(e) => setReqPurpose(e.target.value)} required rows={3} className="mt-1 w-full border rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500" placeholder="e.g., Business expansion, Medical emergency..." />
                </label>

                <button type="submit" disabled={reqLoading} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50 font-medium text-sm mt-2">
                  {reqLoading ? "Submitting..." : "Submit Request"}
                </button>
              </form>
            </div>
          )}

          <button onClick={() => window.print()} className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-900 flex items-center gap-2">🖨️ Print Full Statement</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8 print:hidden">
        <Link href="/investor-portal/invested-amount" className="block bg-white p-5 rounded-lg shadow-sm border-t-4 border-green-500 hover:scale-[1.02] transition-transform cursor-pointer">
          <p className="text-sm font-medium text-gray-500">Invested Amount</p>
          <p className="text-2xl font-bold text-green-700 mt-2">₹{investedAmount.toLocaleString("en-IN")}</p>
          <p className="text-xs text-blue-500 mt-1 font-medium">View History &rarr;</p>
        </Link>

        <Link href="/investor-portal/total-investment" className="block bg-white p-5 rounded-lg shadow-sm border-t-4 border-blue-500 hover:scale-[1.02] transition-transform cursor-pointer">
          <p className="text-sm font-medium text-gray-500">Total Investment</p>
          <p className="text-2xl font-bold text-blue-700 mt-2">₹{currentBalance.toLocaleString("en-IN")}</p>
          <p className="text-xs text-blue-500 mt-1 font-medium">View History &rarr;</p>
        </Link>
        
        <Link href="/investor-portal/total-profit" className="block bg-white p-5 rounded-lg shadow-sm border-t-4 border-purple-500 hover:scale-[1.02] transition-transform cursor-pointer">
          <p className="text-sm font-medium text-gray-500">Total Profit</p>
          <p className="text-2xl font-bold text-purple-700 mt-2">₹{totalProfit.toLocaleString("en-IN")}</p>
          <p className="text-xs text-blue-500 mt-1 font-medium">View History &rarr;</p>
        </Link>
        
        <Link href="/investor-portal/active-loan" className="block bg-white p-5 rounded-lg shadow-sm border-t-4 border-red-500 hover:scale-[1.02] transition-transform cursor-pointer">
          <p className="text-sm font-medium text-gray-500">Your Active Loan</p>
          <p className="text-2xl font-bold text-red-600 mt-2">₹{outstandingLoan.toLocaleString("en-IN")}</p>
          <p className="text-xs text-blue-500 mt-1 font-medium">View Details &rarr;</p>
        </Link>

        <div className="bg-orange-50 p-5 rounded-lg shadow-sm border border-orange-200">
          <p className="text-sm font-medium text-orange-700">Your Unspent Share</p>
          <p className="text-2xl font-bold text-orange-800 mt-2">₹{investorUnspentShare.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
          <p className="text-xs text-orange-600 mt-1">Available in trust</p>
        </div>
      </div>

      {/* 👈 NEW: LOAN REQUEST HISTORY TABLE */}
      {data.loans && data.loans.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6 print:hidden">
          <div className="p-4 border-b bg-gray-50 font-semibold text-gray-800">My Loan Request History</div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2 text-gray-500">Date Requested</th>
                <th className="text-left px-4 py-2 text-gray-500">Amount</th>
                <th className="text-left px-4 py-2 text-gray-500">Purpose</th>
                <th className="text-left px-4 py-2 text-gray-500">Status</th>
                <th className="text-right px-4 py-2 text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.loans.sort((a:any, b:any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((loan: any) => (
                <tr key={loan.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">{new Date(loan.createdAt).toLocaleDateString("en-IN")}</td>
                  <td className="px-4 py-3 font-bold text-blue-600">₹{loan.principalAmount.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-gray-600">{loan.notes?.replace("REQUEST: ", "") || "N/A"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      loan.status === "requested" ? "bg-yellow-100 text-yellow-700" :
                      loan.status === "active" ? "bg-green-100 text-green-700" :
                      loan.status === "declined" ? "bg-red-100 text-red-700" :
                      "bg-gray-100 text-gray-700"
                    }`}>
                      {loan.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {loan.status === "requested" && (
                      <button 
                        onClick={() => handleCancelRequest(loan.id)}
                        disabled={cancelLoading === loan.id}
                        className="text-red-500 hover:text-red-700 text-xs font-bold disabled:opacity-50"
                      >
                        {cancelLoading === loan.id ? "Cancelling..." : "Cancel Request"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* OTHER DETAILED TABLES */}
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
