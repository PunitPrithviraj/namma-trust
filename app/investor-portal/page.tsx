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
    if (status === "unauthenticated") {
      router.push("/login");
    }
    if (status === "authenticated" && (session?.user as any)?.role !== "investor") {
      router.push("/dashboard");
    }
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
  
  // Investments
  const totalInvested = data.investments.reduce((sum: number, inv: any) => sum + inv.amount, 0);
  const totalWithdrawn = data.withdrawals.reduce((sum: number, w: any) => sum + w.amount, 0);
  const currentBalance = totalInvested - totalWithdrawn;

  // Loans
  let totalLoan = 0;
  let outstandingLoan = 0;
  let totalPrincipalRepaid = 0;
  let totalInterestPaid = 0;
  let nextDueDate: Date | null = null;
  data.loans.forEach((loan: any) => {
    totalLoan += loan.principalAmount;
    
    // Calculate outstanding
    const firstPending = loan.schedule.find((s: any) => s.status === "pending");
    const outstanding = firstPending ? firstPending.openingPrincipal : 0;
    outstandingLoan += outstanding;

    if (!nextDueDate && firstPending) {
      nextDueDate = firstPending.dueDate;
    }

    // Repayments
    loan.repayments.forEach((rep: any) => {
      totalPrincipalRepaid += rep.principalPart;
      totalInterestPaid += rep.interestPart;
    });
  });

  // Profits
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

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border-t-4 border-blue-500">
            <p className="text-sm font-medium text-gray-500">Total Investment</p>
            <p className="text-3xl font-bold text-gray-800 mt-2">₹{totalInvested.toLocaleString("en-IN")}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border-t-4 border-orange-500">
            <p className="text-sm font-medium text-gray-500">Active Loans</p>
            <p className="text-3xl font-bold text-gray-800 mt-2">{data.loans.filter((l:any)=>l.status==="active").length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border-t-4 border-red-500">
            <p className="text-sm font-medium text-gray-500">Outstanding Loan Balance</p>
            <p className="text-3xl font-bold text-red-600 mt-2">₹{outstandingLoan.toLocaleString("en-IN")}</p>
          </div>
          <div className="bg-purple-50 p-6 rounded-lg shadow-sm border border-purple-200">
            <p className="text-sm font-medium text-purple-700">This Month's Profit</p>
            <p className="text-3xl font-bold text-purple-800 mt-2">₹{thisMonthProfit.toLocaleString("en-IN")}</p>
          </div>
          <div className="bg-purple-50 p-6 rounded-lg shadow-sm border border-purple-200 md:col-span-2">
            <p className="text-sm font-medium text-purple-700">Total Profit (Lifetime)</p>
            <p className="text-3xl font-bold text-purple-800 mt-2">₹{totalProfit.toLocaleString("en-IN")}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* INVESTMENT DETAILS */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b bg-gray-50 font-semibold text-gray-700">Investment Details</div>
              <div className="p-6">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-500">Current Balance</span>
                  <span className="font-bold text-green-600">₹{currentBalance.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Withdrawn</span>
                  <span className="font-bold text-red-600">₹{totalWithdrawn.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b bg-gray-50 font-semibold text-gray-700">Investment History</div>
              <table className="w-full text-sm">
                <tbody>
                  {data.investments.map((inv: any) => (
                    <tr key={inv.id} className="border-b last:border-0">
                      <td className="px-4 py-3 text-gray-500">{new Date(inv.date).toLocaleDateString("en-IN")}</td>
                      <td className="px-4 py-3 text-green-600 font-medium text-right">+₹{inv.amount.toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                  {data.investments.length === 0 && (
                    <tr><td className="p-4 text-center text-gray-500">No investments yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* LOAN DETAILS */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b bg-gray-50 font-semibold text-gray-700">Loan Summary</div>
              <div className="p-6 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Next Installment Due</span>
                  <span className="font-bold">{nextDueDate ? new Date(nextDueDate).toLocaleDateString("en-IN") : "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Principal Repaid</span>
                  <span className="font-bold text-green-600">₹{totalPrincipalRepaid.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Interest Paid</span>
                  <span className="font-bold text-blue-600">₹{totalInterestPaid.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b bg-gray-50 font-semibold text-gray-700">Loan Repayments</div>
              <table className="w-full text-sm">
                <tbody>
                  {data.loans.flatMap((l:any) => l.repayments).sort((a:any, b:any) => new Date(b.paidDate).getTime() - new Date(a.paidDate).getTime()).map((rep: any) => (
                    <tr key={rep.id} className="border-b last:border-0">
                      <td className="px-4 py-3 text-gray-500">{new Date(rep.paidDate).toLocaleDateString("en-IN")}</td>
                      <td className="px-4 py-3 text-gray-700">{rep.notes || "Monthly EMI"}</td>
                      <td className="px-4 py-3 text-right font-medium">₹{rep.amountPaid.toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                  {data.loans.flatMap((l:any) => l.repayments).length === 0 && (
                    <tr><td className="p-4 text-center text-gray-500">No repayments yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* PROFIT HISTORY */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mt-8">
          <div className="p-4 border-b bg-gray-50 font-semibold text-purple-700">Profit History</div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-3 text-gray-500">Cycle Month</th>
                <th className="px-4 py-3 text-gray-500 text-right">Balance Used</th>
                <th className="px-4 py-3 text-gray-500 text-right">Profit Earned</th>
              </tr>
            </thead>
            <tbody>
              {data.profitDistributions.map((pd: any) => (
                <tr key={pd.id} className="border-t">
                  <td className="px-4 py-3 text-gray-800">
                    {new Date(pd.cycle.cycleStart).toLocaleDateString("en-IN", { month: 'long', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500">₹{pd.balanceUsed.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-right font-bold text-green-600">+₹{pd.shareAmount.toLocaleString("en-IN")}</td>
                </tr>
              ))}
              {data.profitDistributions.length === 0 && (
                <tr><td colSpan={3} className="p-4 text-center text-gray-500">No profit records yet</td></tr>
              )}
            </tbody>
          </table>
        </div>

    </div>
  );
}
