"use client";

import { useEffect, useState } from "react";

export default function SharedInvestorsPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/shared/data")
      .then((res) => res.json())
      .then((resData) => {
        if (resData.investors) setData(resData.investors);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = data.filter(
    (inv) => inv.name.toLowerCase().includes(search.toLowerCase()) || inv.code.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="p-8 text-center mt-20">Loading data...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">All Investors Summary</h1>
        <input
          type="text"
          placeholder="Search by Investor ID or Name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:w-96 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-left whitespace-nowrap">
          <thead className="bg-gray-50 text-gray-600 text-sm border-b">
            <tr>
              <th className="px-6 py-4">Investor ID</th>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4 text-right">Total Invested</th>
              <th className="px-6 py-4 text-right">This Month</th>
              <th className="px-6 py-4 text-right">Loan Taken</th>
              <th className="px-6 py-4 text-right">Repaid</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {filtered.map((inv) => (
              <tr key={inv.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-4 font-mono text-gray-500">{inv.code}</td>
                <td className="px-6 py-4 font-medium text-gray-800">{inv.name}</td>
                <td className="px-6 py-4 text-right text-green-600 font-medium">₹{inv.totalInvested.toLocaleString("en-IN")}</td>
                <td className="px-6 py-4 text-right text-blue-600 font-medium">₹{inv.thisMonthInvestment.toLocaleString("en-IN")}</td>
                <td className="px-6 py-4 text-right text-gray-800 font-medium">₹{inv.loanTaken.toLocaleString("en-IN")}</td>
                <td className="px-6 py-4 text-right text-purple-600 font-medium">₹{inv.repaymentsMade.toLocaleString("en-IN")}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">No investors found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
