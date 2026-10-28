"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

function LoanHistoryContent() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/investors/${id}`)
      .then((res) => res.json())
      .then((data) => setData(data))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-8">Loading...</div>;
  if (!data) return <div className="p-8">Investor not found</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <button onClick={() => router.push(`/investors/${id}`)} className="text-blue-600 mb-4 hover:underline">
        &larr; Back to {data.name}'s Profile
      </button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Loan History</h1>
        <p className="text-gray-500 mt-1">{data.name} • {data.phone}</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
        <table className="w-full text-left whitespace-nowrap">
          <thead className="bg-gray-50 text-gray-600 text-sm border-b">
            <tr>
              <th className="px-4 py-4">Loan ID</th>
              <th className="px-4 py-4">Date</th>
              <th className="px-4 py-4">Principal</th>
              <th className="px-4 py-4">Interest</th>
              <th className="px-4 py-4">Term</th>
              <th className="px-4 py-4 text-right">Repaid</th>
              <th className="px-4 py-4 text-right">Outstanding</th>
              <th className="px-4 py-4">Next Due</th>
              <th className="px-4 py-4">Status</th>
              <th className="px-4 py-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {data.loans?.map((loan: any) => {
              const totalRepaid = loan.repayments.reduce((sum: number, r: any) => sum + r.principalPart, 0);
              const nextPending = loan.schedule.find((s: any) => s.status === "pending");
              
              return (
                <tr key={loan.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-4 font-mono text-gray-600">{loan.code || "N/A"}</td>
                  <td className="px-4 py-4 text-gray-500">
                    {new Date(loan.startDate).toLocaleDateString("en-IN")}
                  </td>
                  <td className="px-4 py-4 font-bold text-blue-600">
                    ₹{loan.principalAmount.toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-4 text-gray-500">{loan.interestRate}% / mo</td>
                  <td className="px-4 py-4 text-gray-500">{loan.loanTerm} Months</td>
                  <td className="px-4 py-4 text-right text-green-600">
                    ₹{totalRepaid.toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-4 text-right font-bold text-red-600">
                    ₹{(nextPending ? nextPending.openingPrincipal : 0).toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-4 text-gray-500">
                    {nextPending ? new Date(nextPending.dueDate).toLocaleDateString("en-IN") : "Closed"}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${loan.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-700"}`}>
                      {loan.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button onClick={() => router.push(`/loans/${loan.id}`)} className="text-blue-600 hover:underline font-medium">
                      View Details
                    </button>
                  </td>
                </tr>
              );
            })}
            {(!data.loans || data.loans.length === 0) && (
              <tr><td colSpan={10} className="px-6 py-8 text-center text-gray-500">No loans taken yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function LoanHistoryPage() {
  return <Suspense fallback={<div className="p-8">Loading...</div>}><LoanHistoryContent /></Suspense>;
}
