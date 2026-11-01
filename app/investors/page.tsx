"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

function InvestorsListContent() {
  const [investors, setInvestors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [addingId, setAddingId] = useState<string | null>(null);
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "admin";

  async function fetchInvestors(query: string) {
    try {
      setLoading(true);
      const res = await fetch(`/api/investors/search?q=${query}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const sortedData = data.sort((a, b) => (a.code || "").localeCompare(b.code || ""));
          setInvestors(sortedData);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => fetchInvestors(search), 300);
    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  async function handleAddMonthly(id: string) {
    setAddingId(id);
    const res = await fetch("/api/investors/monthly", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ investorId: id }),
    });
    const data = await res.json();
    setAddingId(null);
    if (res.ok) {
      fetchInvestors(search); // Refresh the table
    } else {
      alert(data.error);
    }
  }

  // Helper to check if they have a monthly investment this month
  function hasMonthlyInvestment(inv: any) {
    if (!inv.investments) return false;
    const now = new Date();
    return inv.investments.some((i: any) => {
      const d = new Date(i.date);
      return i.type === "monthly" && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-gray-800">All Investors</h1>
        <Link href="/investors/new" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-medium">
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
        <div className="bg-white p-8 text-center rounded-lg shadow border text-gray-500">No investors found.</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-600 text-sm">
              <tr>
                <th className="px-6 py-4">Investor ID</th>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Phone</th>
                {isAdmin && <th className="px-6 py-4 text-center">Monthly Investment</th>}
                <th className="px-6 py-4 text-right">Total Investment</th>
                <th className="px-6 py-4 text-right">Active Loans</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {investors.map((inv) => {
                const addedThisMonth = hasMonthlyInvestment(inv);
                return (
                  <tr key={inv.id} className="border-t hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono text-sm text-gray-500">{inv.code || "N/A"}</td>
                    <td className="px-6 py-4 font-medium text-gray-800">
                      <button onClick={() => router.push(`/investors/${inv.id}`)} className="hover:text-blue-600 hover:underline">
                        {inv.name}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{inv.phone}</td>
                    
                    {isAdmin && (
                      <td className="px-6 py-4 text-center">
                        {addedThisMonth ? (
                          <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">Already Added</span>
                        ) : (
                          <button
                            onClick={() => handleAddMonthly(inv.id)}
                            disabled={addingId === inv.id}
                            className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-xs font-bold hover:bg-blue-200 disabled:opacity-50"
                          >
                            {addingId === inv.id ? "Adding..." : "₹1,000"}
                          </button>
                        )}
                      </td>
                    )}

                    <td className="px-6 py-4 text-right text-green-600 font-medium">
                      ₹{inv.totalInvestment.toLocaleString("en-IN")}
                    </td>
                    <td className="px-6 py-4 text-right text-blue-600 font-medium">
                      ₹{inv.totalLoan.toLocaleString("en-IN")}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => router.push(`/investors/${inv.id}`)} className="text-blue-600 hover:underline text-sm font-medium">
                        View Profile
                      </button>
                    </td>
                  </tr>
                );
              })}
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
