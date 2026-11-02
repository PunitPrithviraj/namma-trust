"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function ProfitsPage() {
  const [cycles, setCycles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // MODAL STATE
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [totalInterest, setTotalInterest] = useState("");
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState("");

  const months = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];

  async function loadCycles() {
    setLoading(true);
    fetch("/api/cycles", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setCycles(data);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadCycles();
  }, []);

  async function handleCreateCycle(e: React.FormEvent) {
    e.preventDefault();
    setSubmitLoading(true);
    setError("");

    const res = await fetch("/api/cycles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        totalInterestCollected: Number(totalInterest),
        month: Number(month),
        year: Number(year)
      }),
    });

    const data = await res.json();
    setSubmitLoading(false);

    if (res.ok) {
      setIsModalOpen(false);
      setTotalInterest("");
      loadCycles(); // Refresh the table
    } else {
      setError(typeof data.error === "string" ? data.error : "Failed to create cycle.");
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto relative">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Profit Distribution</h1>
          <p className="text-gray-500 mt-1">Manage monthly cycles and distribute profits to investors.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 font-medium"
        >
          + Create New Cycle
        </button>
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
            {cycles.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-gray-500">
                  No profit cycles found. Click "Create New Cycle" to start.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* POP-DOWN MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Create New Cycle</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            
            <p className="text-sm text-gray-500 mb-6">
              Enter the total interest collected from all loans for the selected month.
            </p>

            {error && <div className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}

            <form onSubmit={handleCreateCycle} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Month</span>
                  <select
                    value={month}
                    onChange={(e) => setMonth(Number(e.target.value))}
                    className="mt-1 w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  >
                    {months.map((m, i) => (
                      <option key={m} value={i}>{m}</option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Year</span>
                  <input
                    type="number"
                    required
                    min="2020"
                    max="2100"
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="mt-1 w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-sm font-medium text-gray-700">Total Interest Collected (₹)</span>
                <input
                  type="number"
                  required
                  min="1"
                  value={totalInterest}
                  onChange={(e) => setTotalInterest(e.target.value)}
                  className="mt-1 w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. 5000"
                />
              </label>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="bg-purple-600 text-white px-6 py-2 rounded hover:bg-purple-700 disabled:opacity-50 font-medium"
                >
                  {submitLoading ? "Creating..." : "Create Cycle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
