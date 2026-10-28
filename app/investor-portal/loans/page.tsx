"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

function InvestorLoansContent() {
  const router = useRouter();
  const { data: session } = useSession();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session) {
      fetch("/api/investor-portal").then(res => res.json()).then(d => { setData(d); setLoading(false); });
    }
  }, [session]);

  if (loading) return <div className="p-8">Loading...</div>;
  if (!data || data.error) return <div className="p-8 text-red-600">{data?.error || "Error loading data"}</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <button onClick={() => router.push("/investor-portal")} className="text-blue-600 mb-4 hover:underline">
        &larr; Back to Dashboard
      </button>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">My Loans</h1>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
        <table className="w-full text-left whitespace-nowrap">
          <thead className="bg-gray-50 text-gray-600 text-sm border-b">
            <tr>
              <th className="px-4 py-4">Loan ID</th>
              <th className="px-4 py-4">Date</th>
              <th className="px-4 py-4 text-right">Principal</th>
              <th className="px-4 py-4 text-right">Repaid</th>
              <th className="px-4 py-4 text-right">Outstanding</th>
              <th className="px-4 py-4">Next Due</th>
              <th className="px-4 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {data.loans?.map((loan: any) => {
              const totalRepaid = loan.repayments.reduce((sum: number, r: any) => sum + r.principalPart, 0);
              const nextPending = loan.schedule.find((s: any) => s.status === "pending");
              return (
                <tr key={loan.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-4 font-mono text-gray-600">{loan.code || "N/A"}</td>
                  <td className="px-4 py-4 text-gray-500">{new Date(loan.startDate).toLocaleDateString("en-IN")}</td>
                  <td className="px-4 py-4 text-right font-bold text-blue-600">₹{loan.principalAmount.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-4 text-right text-green-600">₹{totalRepaid.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-4 text-right font-bold text-red-600">₹{(nextPending ? nextPending.openingPrincipal : 0).toLocaleString("en-IN")}</td>
                  <td className="px-4 py-4 text-gray-500">{nextPending ? new Date(nextPending.dueDate).toLocaleDateString("en-IN") : "Closed"}</td>
                  <td className="px-4 py-4"><span className={`px-2 py-1 rounded text-xs font-bold ${loan.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-700"}`}>{loan.status.toUpperCase()}</span></td>
                </tr>
              );
            })}
            {(!data.loans || data.loans.length === 0) && <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">No loans taken yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function InvestorLoansPage() {
  return <Suspense fallback={<div className="p-8">Loading...</div>}><InvestorLoansContent /></Suspense>;
}
