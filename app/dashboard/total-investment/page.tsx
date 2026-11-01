"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function TotalInvestmentPage() {
  const [investors, setInvestors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Fetch all investors with their related data
    fetch("/api/investors/search?q=", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          // Sort by Investor ID ascending
          const sorted = data.sort((a: any, b: any) => (a.code || "").localeCompare(b.code || ""));
          setInvestors(sorted);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8">Loading data...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <Link href="/dashboard" className="text-blue-600 hover:underline mb-4 inline-block">
          &larr; Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-gray-800">Total Investment Breakdown</h1>
        <p className="text-gray-500 mt-1">Investor-wise regular investments and total profit up to date.</p>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-600 text-sm border-b">
            <tr>
              <th className="px-6 py-4">Investor ID</th>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4 text-right">Regular Investment</th>
              <th className="px-6 py-4 text-right">Profit Up to Date</th>
              <th className="px-6 py-4 text-right">Total Investment (Reg + Profit)</th>
            </tr>
          </thead>
          <tbody>
            {investors.map((inv) => {
              const regularInvestment = inv.totalInvestment || 0;
              const profitUpToDate = inv.totalProfit || 0; 
              const total = regularInvestment + profitUpToDate;

              return (
                <tr 
                  key={inv.id} 
                  className="border-b hover:bg-gray-50 cursor-pointer"
                  onClick={() => router.push(`/investors/${inv.id}`)}
                >
                  <td className="px-6 py-4 font-mono text-sm text-gray-500">
                    {inv.code || "N/A"}
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-800">
                    {inv.name}
                  </td>
                  <td className="px-6 py-4 text-right text-green-600 font-medium">
                    ₹{regularInvestment.toLocaleString("en-IN")}
                  </td>
                  <td className="px-6 py-4 text-right text-purple-600 font-medium">
                    ₹{profitUpToDate.toLocaleString("en-IN")}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-800 font-bold">
                    ₹{total.toLocaleString("en-IN")}
                  </td>
                </tr>
              );
            })}
            {investors.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-gray-500">
                  No investors found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
