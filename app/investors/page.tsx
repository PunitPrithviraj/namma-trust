"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

function InvestorsListContent() {
  const [investors, setInvestors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const router = useRouter();

  async function fetchInvestors(query: string) {
    try {
      setLoading(true);
      // Added cache: "no-store" to force fresh data
      const res = await fetch(`/api/investors/search?q=${query}`, { cache: "no-store" });
      
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setInvestors(data);
        } else {
          console.error("Data is not an array:", data);
          setInvestors([]);
        }
      } else {
        console.error("API failed with status:", res.status);
        const errorData = await res.json();
        console.error("API Error details:", errorData);
        setInvestors([]);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setInvestors([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchInvestors(search);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-gray-800">All Investors</h1>
        <Link
          href="/investors/new"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-medium"
        >
          + Add Investor
        </Link>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by name or phone number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:w-96 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading ? (
        <p className="text-gray-500">Searching...</p>
      ) : investors.length === 0 ? (
        <div className="bg-white p-8 text-center rounded-lg shadow border text-gray-500">
          No investors found.
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-600 text-sm">
              <tr>
                <th className="px-6 py-4">Investor ID</th>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Phone</th>
                <th className="px-6 py-4 text-right">Total Investment</th>
                <th className="px-6 py-4 text-right">Active Loans</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {investors.map((inv) => (
                <tr key={inv.id} className="border-t hover:bg-gray-50">
                  <td className="px-6 py-4 font-mono text-sm text-gray-500">
                    {inv.code || "N/A"}
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-800">
                    <button
                      onClick={() => router.push(`/investors/${inv.id}`)}
                      className="hover:text-blue-600 hover:underline"
                    >
                      {inv.name}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{inv.phone}</td>
                  <td className="px-6 py-4 text-right text-green-600 font-medium">
                    ₹{inv.totalInvestment.toLocaleString("en-IN")}
                  </td>
                  <td className="px-6 py-4 text-right text-blue-600 font-medium">
                    ₹{inv.totalLoan.toLocaleString("en-IN")}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => router.push(`/investors/${inv.id}`)}
                      className="text-blue-600 hover:underline text-sm font-medium"
                    >
                      View Profile
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function InvestorsPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <InvestorsListContent />
    </Suspense>
  );
}
