"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

function ProfitHistoryContent() {
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

  const totalProfit = data.profitDistributions.reduce((sum: number, p: any) => sum + p.shareAmount, 0);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <button onClick={() => router.push(`/investors/${id}`)} className="text-blue-600 mb-4 hover:underline">
        &larr; Back to {data.name}'s Profile
      </button>

      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Profit History</h1>
          <p className="text-gray-500 mt-1">{data.name} • {data.phone}</p>
        </div>
        <div className="bg-purple-50 px-4 py-2 rounded-lg border border-purple-200">
          <p className="text-sm text-purple-700 font-medium">Total Profit Earned</p>
          <p className="text-xl font-bold text-purple-800">₹{totalProfit.toLocaleString("en-IN")}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-600 font-medium text-sm">
            <tr>
              <th className="px-6 py-4">Month Cycle</th>
              <th className="px-6 py-4">Balance Used</th>
              <th className="px-6 py-4 text-right">Profit Earned</th>
            </tr>
          </thead>
          <tbody>
            {data.profitDistributions.map((pd: any) => (
              <tr key={pd.id} className="border-t hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-800">
                  {new Date(pd.cycle.cycleStart).toLocaleDateString("en-IN", { month: 'long', year: 'numeric' })}
                </td>
                <td className="px-6 py-4 text-gray-500">
                  ₹{pd.balanceUsed.toLocaleString("en-IN")}
                </td>
                <td className="px-6 py-4 text-right font-bold text-green-600">
                  +₹{pd.shareAmount.toLocaleString("en-IN")}
                </td>
              </tr>
            ))}
            {data.profitDistributions.length === 0 && (
              <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-500">No profit has been distributed yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ProfitHistoryPage() {
  return <Suspense fallback={<div className="p-8">Loading...</div>}><ProfitHistoryContent /></Suspense>;
}
