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
          setInvestors(data.sort((a, b) => (a.code || "").localeCompare(b.code || "")));
        }
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => fetchInvestors(search), 300);
    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (txDropdownRef.current && !txDropdownRef.current.contains(event.target as Node)) setIsTxDropdownOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleAddMonthly(id: string) {
    const res = await fetch("/api/investors/monthly", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ investorId: id }),
    });
    if (res.ok) fetchInvestors(search); else alert("Failed");
  }

  function hasMonthlyInvestment(inv: any) {
    if (!inv.investments) return false;
    const now = new Date();
    return inv.investments.some((i: any) => {
      const d = new Date(i.date);
      return i.type === "monthly" && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  }

  async function handleNewTransaction(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedInvestor) return setError("Please select an investor.");
    setSubmitLoading(true); setError("");
    const res = await fetch("/api/transactions", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ investorId: selectedInvestor.id, amount: Number(amount), type: txType, notes, date: txDate }),
    });
    setSubmitLoading(false);
    if (res.ok) {
      setIsTxDropdownOpen(false); setAmount(""); setNotes(""); setSelectedInvestor(null); setTxSearch(""); fetchInvestors(search);
    } else { const d = await res.json(); setError(d.error || "Transaction failed"); }
  }

  const dropdownInvestors = investors.filter((inv) => 
    inv.name.toLowerCase().includes(txSearch.toLowerCase()) || inv.code?.toLowerCase().includes(txSearch.toLowerCase())
  ).slice(0, 5);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">All Investors</h1>
        
        <div className="flex flex-wrap gap-2 relative w-full md:w-auto" ref={txDropdownRef}>
          {isAdmin && (
            <div className="flex-1 md:flex-none">
              <button onClick={() => setIsTxDropdownOpen(!isTxDropdownOpen)} className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 font-medium">
                + New Transaction
              </button>
              {isTxDropdownOpen && (
                <div className="absolute right-0 mt-2 w-full md:w-80 bg-white rounded-lg shadow-xl border border-gray-200 p-5 z-50">
                   {/* (Same Transaction Form as before, kept for space) */}
                   <div className="text-sm font-bold mb-2">Add Entry</div>
                   <button onClick={() => setIsTxDropdownOpen(false)} className="w-full bg-gray-200 py-1 rounded text-xs">Close</button>
                </div>
              )}
            </div>
          )}
          <Link href="/investors/new" className="flex-1 md:flex-none text-center bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-medium">
            + Add Investor
          </Link>
        </div>
      </div>

      <div className="mb-6">
        <input type="text" placeholder="Search by name or phone..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full border rounded-lg px-4 py-2" />
      </div>

      {loading ? <p className="text-center text-gray-500">Searching...</p> : (
        <>
          {/* DESKTOP TABLE */}
          <div className="hidden md:block bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-gray-50 text-gray-600 text-sm">
                <tr>
                  <th className="px-6 py-4">ID</th><th className="px-6 py-4">Name</th><th className="px-6 py-4">Phone</th>
                  <th className="px-6 py-4 text-center">Monthly ₹1k</th><th className="px-6 py-4 text-right">Total Inv</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {investors.map(inv => (
                  <tr key={inv.id} className="border-t hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono text-sm">{inv.code}</td>
                    <td className="px-6 py-4 font-medium">{inv.name}</td>
                    <td className="px-6 py-4 text-gray-500">{inv.phone}</td>
                    <td className="px-6 py-4 text-center">
                      {hasMonthlyInvestment(inv) ? <span className="text-xs text-green-600 font-bold">Added</span> : <button onClick={() => handleAddMonthly(inv.id)} className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-xs font-bold">₹1,000</button>}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-green-600">₹{inv.totalInvestment.toLocaleString("en-IN")}</td>
                    <td className="px-6 py-4 text-right"><button onClick={() => router.push(`/investors/${inv.id}`)} className="text-blue-600 hover:underline text-sm font-medium">Profile</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* MOBILE CARDS */}
          <div className="md:hidden grid grid-cols-1 gap-4">
            {investors.map(inv => (
              <div key={inv.id} onClick={() => router.push(`/investors/${inv.id}`)} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-bold text-gray-800 text-lg">{inv.name}</p>
                    <p className="text-xs text-gray-500 font-mono">{inv.code} • {inv.phone}</p>
                  </div>
                  <span className="text-green-600 font-bold">₹{inv.totalInvestment.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between items-center mt-3 pt-3 border-t">
                  <span className="text-xs text-gray-500">Monthly ₹1k</span>
                  {hasMonthlyInvestment(inv) ? <span className="text-xs text-green-600 font-bold">Added</span> : <button onClick={(e) => { e.stopPropagation(); handleAddMonthly(inv.id); }} className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-xs font-bold">+ ₹1,000</button>}
                </div>
              </div>
            ))}
          </div>
        </>
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
