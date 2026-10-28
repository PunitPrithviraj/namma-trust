"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

function InvestorInvestmentsContent() {
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

  const totalInvestment = data.investments.reduce((sum: number, inv: any) => sum + inv.amount, 0);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <button onClick={() => router.push("/investor-portal")} className="text-blue-600 mb-4 hover:underline">
        &larr; Back to Dashboard
      </button>
      <div className="flex justify-between items-end mb-6">
        <h1 className="text-3xl font-bold text-gray-800">My Investments</h1>
        <div className="bg-green-50 px-4 py-2 rounded-lg border border-green-200">
          <p className="text-sm text-green-700 font-medium">Total Invested</p>
          <p className="text-xl font-bold text-green-800">₹{totalInvestment.toLocaleString("en-IN")}</p>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-600 font-medium text-sm">
            <tr>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">Notes</th>
              <th className="px-6 py-4 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.investments.map((inv: any) => (
              <tr key={inv.id} className="border-t hover:bg-gray-50">
                <td className="px-6 py-4 text-gray-600">{new Date(inv.date).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                <td className="px-6 py-4"><span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold uppercase">{inv.type}</span></td>
                <td className="px-6 py-4 text-gray-500">{inv.notes || "-"}</td>
                <td className="px-6 py-4 text-right font-bold text-green-600">+₹{inv.amount.toLocaleString("en-IN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function InvestorInvestmentsPage() {
  return <Suspense fallback={<div className="p-8">Loading...</div>}><InvestorInvestmentsContent /></Suspense>;
}
