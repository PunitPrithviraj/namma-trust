"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function TotalInvestmentPage() {
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

  const totalDeposits = data.investments.reduce((sum: number, inv: any) => sum + inv.amount, 0);
  const totalProfit = data.profitDistributions.reduce((sum: number, pd: any) => sum + pd.shareAmount, 0);
  const totalCombined = totalDeposits + totalProfit;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <Link href="/investor-portal" className="text-blue-600 hover:underline mb-4 inline-block">
        &larr; Back to Dashboard
      </Link>
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Total Investment History</h1>
      <p className="text-gray-500 mb-6">Total Combined (Invested + Profit): <span className="font-bold text-blue-600">₹{totalCombined.toLocaleString("en-IN")}</span></p>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-600 text-sm border-b">
            <tr>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">Details</th>
              <th className="px-6 py-4 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {/* Combine both arrays and sort by date descending */}
            {[
              ...data.investments.map((i: any) => ({ ...i, displayType: "Investment", color: "text-green-600" })),
              ...data.profitDistributions.map((p: any) => ({ ...p, displayType: "Profit", color: "text-purple-600" }))
            ]
              .sort((a, b) => new Date(b.date || b.paidDate).getTime() - new Date(a.date || a.paidDate).getTime())
              .map((tx: any) => {
                const dateStr = tx.date || tx.paidDate;
                let displayDate = new Date(dateStr);
                if (tx.displayType === "Investment" && (tx.type === "monthly" || tx.notes?.includes("Monthly"))) {
                  displayDate.setDate(13);
                }

                return (
                  <tr key={tx.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-600">{displayDate.toLocaleDateString("en-IN")}</td>
                    <td className={`px-6 py-4 font-bold text-xs uppercase ${tx.color}`}>{tx.displayType}</td>
                    <td className="px-6 py-4 text-gray-500 text-sm">{tx.notes || (tx.cycle ? `Profit for ${new Date(tx.cycle.cycleStart).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}` : "-")}</td>
                    <td className={`px-6 py-4 text-right font-bold ${tx.color}`}>+₹{tx.amount ? tx.amount.toLocaleString("en-IN") : tx.shareAmount.toLocaleString("en-IN")}</td>
                  </tr>
                );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
