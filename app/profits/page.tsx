"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function ProfitsPage() {
  const [cycles, setCycles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch profit cycles from the database
    fetch("/api/cycles", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCycles(data);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8">Loading profit history...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Profit Distribution</h1>
          <p className="text-gray-500 mt-1">Manage monthly cycles and distribute profits to investors.</p>
        </div>
        <Link 
          href="/profits/new" 
          className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 font-medium"
        >
          + Create New Cycle
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-600 text-sm border-b">
            <tr>
              <th className="px-6 py-4">Cycle Month</th>
              <th className="px-6 py-4 text-right">Interest Collected</th>
              <th className="px-6 py-4 text-right">Total Distributed</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {cycles.map((cycle) => (
              <tr key={cycle.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-800">
                  {new Date(cycle.cycleStart).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
                </td>
                <td className="px-6 py-4 text-right text-gray-600">
                  ₹{cycle.totalInterestCollected.toLocaleString("en-IN")}
                </td>
                <td className="px-6 py-4 text-right text-green-600 font-medium">
                  ₹{cycle.totalDistributed.toLocaleString("en-IN")}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    cycle.status === "distributed" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                  }`}>
                    {cycle.status.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <Link href={`/profits/${cycle.id}`} className="text-blue-600 hover:underline text-sm font-medium">
                    View Details
                  </Link>
                </td>
              </tr>
            ))}
            {cycles.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-gray-500">
                  No profit cycles found. Click "Create New Cycle" to start.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
