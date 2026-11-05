"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function TotalProfitPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/investor-portal")
      .then((res) => res.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center mt-20">Loading...</div>;
  if (!data) return <div className="p-8 text-center mt-20">Data not found</div>;

  const totalProfit = data.profitDistributions.reduce((sum: number, pd: any) => sum + pd.shareAmount, 0);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <Link href="/investor-portal" className="text-blue-600 hover:underline mb-4 inline-block">
        &larr; Back to Dashboard
      </Link>
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Total Profit History</h1>
      <p className="text-gray-500 mb-6">Total Profit Earned: <span className="font-bold text-purple-600">₹{totalProfit.toLocaleString("en-IN")}</span></p>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-600 text-sm border-b">
            <tr>
              <th className="px-6 py-4">Distribution Date</th>
              <th className="px-6 py-4">Cycle Month</th>
              <th className="px-6 py-4 text-right">Profit Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.profitDistributions.map((pd: any) => (
              <tr key={pd.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-4 text-gray-600">
                  {pd.paidDate ? new Date(pd.paidDate).toLocaleDateString("en-IN") : new Date(pd.cycle.cycleStart).toLocaleDateString("en-IN")}
                </td>
                <td className="px-6 py-4 font-medium text-gray-800">
                  {new Date(pd.cycle.cycleStart).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
                </td>
                <td className="px-6 py-4 text-right text-purple-600 font-bold">
                  +₹{pd.shareAmount.toLocaleString("en-IN")}
                </td>
              </tr>
            ))}
            {data.profitDistributions.length === 0 && (
              <tr><td colSpan={3} className="p-6 text-center text-gray-500">No profit history found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
