"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function InvestedAmountPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/investor-portal")
      .then((res) => res.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center mt-20">Loading...</div>;
  if (!data) return <div className="p-8 text-center mt-20">Data not found</div>;

  // Calculate regular deposits (excluding profit)
  const totalInvested = data.investments.reduce((sum: number, inv: any) => sum + inv.amount, 0);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <Link href="/investor-portal" className="text-blue-600 hover:underline mb-4 inline-block">
        &larr; Back to Dashboard
      </Link>
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Invested Amount History</h1>
      <p className="text-gray-500 mb-6">Total Cash Invested: <span className="font-bold text-green-600">₹{totalInvested.toLocaleString("en-IN")}</span></p>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-600 text-sm border-b">
            <tr>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">Notes</th>
              <th className="px-6 py-4 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.investments.map((tx: any) => {
              // Logic: If it's a monthly investment, force the date to the 13th
              let displayDate = new Date(tx.date);
              if (tx.type === "monthly" || tx.notes?.includes("Monthly")) {
                displayDate.setDate(13);
              }

              return (
                <tr key={tx.id} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-600">{displayDate.toLocaleDateString("en-IN")}</td>
                  <td className="px-6 py-4 font-medium text-gray-800 uppercase text-xs">{tx.type}</td>
                  <td className="px-6 py-4 text-gray-500 text-sm">{tx.notes || "-"}</td>
                  <td className="px-6 py-4 text-right text-green-600 font-bold">+₹{tx.amount.toLocaleString("en-IN")}</td>
                </tr>
              );
            })}
            {data.investments.length === 0 && (
              <tr><td colSpan={4} className="p-6 text-center text-gray-500">No investments found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
