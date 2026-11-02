"use client";

import { useEffect, useState } from "react";

export default function SharedProfitsPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/shared/data")
      .then((res) => res.json())
      .then((resData) => {
        if (resData.profits) setData(resData.profits);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center mt-20">Loading data...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Profit Distribution History</h1>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-600 text-sm border-b">
            <tr>
              <th className="px-6 py-4">Cycle Month</th>
              <th className="px-6 py-4">Distributed On</th>
              <th className="px-6 py-4 text-right">Interest Collected</th>
              <th className="px-6 py-4 text-right">Total Distributed</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {data.map((cycle) => (
              <tr key={cycle.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-800">{cycle.month}</td>
                <td className="px-6 py-4 text-gray-500">
                  {cycle.distributedAt ? new Date(cycle.distributedAt).toLocaleDateString("en-IN") : "N/A"}
                </td>
                <td className="px-6 py-4 text-right text-gray-600">₹{cycle.totalCollected.toLocaleString("en-IN")}</td>
                <td className="px-6 py-4 text-right font-bold text-green-600">₹{cycle.totalDistributed.toLocaleString("en-IN")}</td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">No profit cycles found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
