"use client";

import { useEffect, useState } from "react";

export default function SharedLoansPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/shared/data")
      .then((res) => res.json())
      .then((resData) => {
        if (resData.loans) setData(resData.loans);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center mt-20">Loading data...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">All Loans</h1>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-left whitespace-nowrap">
          <thead className="bg-gray-50 text-gray-600 text-sm border-b">
            <tr>
              <th className="px-6 py-4">Loan ID</th>
              <th className="px-6 py-4">Borrower</th>
              <th className="px-6 py-4 text-right">Principal</th>
              <th className="px-6 py-4 text-right">Interest</th>
              <th className="px-6 py-4 text-center">Term</th>
              <th className="px-6 py-4 text-center">Start Date</th>
              <th className="px-6 py-4 text-right">Outstanding</th>
              <th className="px-6 py-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {data.map((loan) => (
              <tr key={loan.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-4 font-mono text-gray-500">{loan.code}</td>
                <td className="px-6 py-4 font-medium text-gray-800">{loan.investorName}</td>
                <td className="px-6 py-4 text-right font-medium text-blue-600">₹{loan.principalAmount.toLocaleString("en-IN")}</td>
                <td className="px-6 py-4 text-right text-gray-500">{loan.interestRate}%</td>
                <td className="px-6 py-4 text-center text-gray-500">{loan.loanTerm} mo</td>
                <td className="px-6 py-4 text-center text-gray-500">{new Date(loan.startDate).toLocaleDateString("en-IN")}</td>
                <td className="px-6 py-4 text-right font-bold text-red-600">₹{loan.outstanding.toLocaleString("en-IN")}</td>
                <td className="px-6 py-4 text-center">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    loan.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-700"
                  }`}>
                    {loan.status.toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr><td colSpan={8} className="px-6 py-8 text-center text-gray-500">No loans found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
