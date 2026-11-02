"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewCyclePage() {
  const router = useRouter();
  const [totalInterest, setTotalInterest] = useState("");
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const months = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
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
    setLoading(false);

    if (res.ok) {
      alert("Cycle created successfully! You can now distribute the profit.");
      router.push("/profits");
    } else {
      setError(typeof data.error === "string" ? data.error : "Failed to create cycle.");
    }
  }

  return (
    <div className="p-8 max-w-lg mx-auto mt-10">
      <Link href="/profits" className="text-blue-600 hover:underline mb-6 inline-block">
        &larr; Back to Profits
      </Link>
      
      <div className="bg-white p-8 rounded-lg shadow border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Create New Profit Cycle</h1>
        <p className="text-sm text-gray-500 mb-6">
          Enter the total interest collected from all loans for the selected month. The system will automatically divide this amount proportionally among all investors based on their current balances.
        </p>

        {error && <div className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50 font-medium mt-4"
          >
            {loading ? "Creating..." : "Create Cycle"}
          </button>
        </form>
      </div>
    </div>
  );
}
