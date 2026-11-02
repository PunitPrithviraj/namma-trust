"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

function InvestorsListContent() {
  const [investors, setInvestors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "admin";

  // --- NEW TRANSACTION STATE ---
  const [isTxDropdownOpen, setIsTxDropdownOpen] = useState(false);
  const txDropdownRef = useRef<HTMLDivElement>(null);
  const [txSearch, setTxSearch] = useState("");
  const [selectedInvestor, setSelectedInvestor] = useState<any>(null);
  
  const [txType, setTxType] = useState<"investment" | "withdrawal" | "profit">("investment");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [txDate, setTxDate] = useState(new Date().toISOString().split("T")[0]);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState("");

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
    return () => clearTimeout(debounceFn);
  }, [search]);

  // Close New Transaction dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (txDropdownRef.current && !txDropdownRef.current.contains(event.target as Node)) {
        setIsTxDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleAddMonthly(id: string) {
    const res = await fetch("/api/investors/monthly", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ investorId: id }),
    });
    const data = await res.json();
    if (res.ok) fetchInvestors(search);
    else alert(data.error);
  }

  function hasMonthlyInvestment(inv: any) {
    if (!inv.investments) return false;
    const now = new Date();
    return inv.investments.some((i: any) => {
      const d = new Date(i.date);
      return i.type === "monthly" && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  }

  // --- SUBMIT NEW TRANSACTION ---
  async function handleNewTransaction(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedInvestor) return setError("Please select an investor.");
    setSubmitLoading(true);
    setError("");

    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        investorId: selectedInvestor.id,
        amount: Number(amount),
        type: txType,
        notes,
        date: txDate, 
      }),
    });

    const resData = await res.json();
    setSubmitLoading(false);

    if (res.ok) {
      setIsTxDropdownOpen(false);
      setAmount("");
      setNotes("");
      setTxType("investment");
      setSelectedInvestor(null);
      setTxSearch("");
      fetchInvestors(search); 
    } else {
      setError(typeof resData.error === "string" ? resData.error : "Transaction failed");
    }
  }

  // Filter investors for the dropdown search
  const dropdownInvestors = investors.filter((inv) => 
    inv.name.toLowerCase().includes(txSearch.toLowerCase()) || 
    inv.code?.toLowerCase().includes(txSearch.toLowerCase()) ||
    inv.phone?.includes(txSearch)
  ).slice(0, 5); // Show max 5 results

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-gray-800">All Investors</h1>
        
        {/* HEADER ACTIONS */}
        <div className="flex gap-3 relative" ref={txDropdownRef}>
          {isAdmin && (
            <div>
              <button 
                onClick={() => setIsTxDropdownOpen(!isTxDropdownOpen)}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 font-medium"
              >
                + New Transaction
              </button>

              {isTxDropdownOpen && (
                <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 p-5 z-50">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-gray-800">Add Entry</h2>
                    <button onClick={() => setIsTxDropdownOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
                  </div>
                  
                  {error && <div className="bg-red-50 text-red-700 p-2 rounded mb-3 text-xs">{error}</div>}

                  <form onSubmit={handleNewTransaction} className="space-y-4">
                    
                    {/* INVESTOR SEARCH SELECT */}
                    <label className="block relative">
                      <span className="text-xs font-medium text-gray-700">Select Investor</span>
                      {selectedInvestor ? (
                        <div className="mt-1 flex justify-between items-center border rounded px-3 py-1.5 bg-blue-50">
                          <span className="text-sm font-medium text-blue-800">
                            {selectedInvestor.name} ({selectedInvestor.code})
                          </span>
                          <button type="button" onClick={() => setSelectedInvestor(null)} className="text-blue-500 hover:text-blue-700 text-xs font-bold">Change</button>
                        </div>
                      ) : (
                        <>
                          <input
                            type="text"
                            placeholder="Search by name or ID..."
                            value={txSearch}
                            onChange={(e) => setTxSearch(e.target.value)}
                            className="mt-1 w-full border rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500"
                          />
                          {txSearch && (
                            <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg max-h-40 overflow-y-auto">
                              {dropdownInvestors.map((inv) => (
                                <button 
                                  type="button" // 👈 ADDED to prevent form submission
                                  key={inv.id} 
                                  onMouseDown={(e) => {
                                    e.preventDefault(); // 👈 ADDED to prevent input blur before click
                                    setSelectedInvestor(inv);
                                    setTxSearch("");
                                  }}
                                  className="w-full text-left px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm border-b last:border-0"
                                >
                                  <span className="font-medium">{inv.name}</span> <span className="text-gray-500 text-xs ml-2">{inv.code}</span>
                                </button>
                              ))}
                              {dropdownInvestors.length === 0 && (
                                <div className="px-3 py-2 text-sm text-gray-500">No investor found</div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      <label className="block">
                        <span className="text-xs font-medium text-gray-700">Type</span>
                        <select value={txType} onChange={(e) => setTxType(e.target.value as any)} className="mt-1 w-full border rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500">
                          <option value="investment">Add Investment</option>
                          <option value="withdrawal">Withdraw Funds</option>
                          <option value="profit">Direct Profit Entry</option>
                        </select>
                      </label>
                      
                      <label className="block">
                        <span className="text-xs font-medium text-gray-700">Amount (₹)</span>
                        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required min="1" className="mt-1 w-full border rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500" />
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <label className="block">
                        <span className="text-xs font-medium text-gray-700">Date</span>
                        <input type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)} required className="mt-1 w-full border rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500" />
                      </label>

                      <label className="block">
                        <span className="text-xs font-medium text-gray-700">Notes (Optional)</span>
                        <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 w-full border rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500" />
                      </label>
                    </div>

                    <button 
                      type="submit" 
                      disabled={submitLoading || !selectedInvestor} 
                      className={`w-full py-2 rounded text-white font-medium text-sm mt-2 disabled:opacity-50 ${
                        txType === "investment" ? "bg-green-600 hover:bg-green-700" : 
                        txType === "withdrawal" ? "bg-red-600 hover:bg-red-700" : 
                        "bg-purple-600 hover:bg-purple-700"
                      }`}
                    >
                      {submitLoading ? "Saving..." : "Save Transaction"}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          <Link href="/investors/new" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-medium">
            + Add Investor
          </Link>
        </div>
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
                {isAdmin && <th className="px-6 py-4 text-center">Monthly ₹1k</th>}
                <th className="px-6 py-4 text-right">Total Investment</th>
                <th className="px-6 py-4 text-right">Active Loans</th>
                <th className="px-6 py-4 text-right">Actions</th>
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
                            className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-xs font-bold hover:bg-blue-200"
                          >
                            ₹1,000
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
                      <div className="flex justify-end gap-3">
                        <button onClick={() => router.push(`/investors/${inv.id}`)} className="text-blue-600 hover:underline text-sm font-medium">
                          View Profile
                        </button>
                      </div>
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
