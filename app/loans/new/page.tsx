"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NewLoanPage() {
  const router = useRouter();
  const [investors, setInvestors] = useState<any[]>([]);
  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    investorId: "", principalAmount: "", termAmount: "", interestRate: "1.5", loanTerm: "", startDate: today, notes: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/investors").then(r => r.json()).then(data => { if (Array.isArray(data)) setInvestors(data); });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/loans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        investorId: form.investorId,
        principalAmount: Number(form.principalAmount),
        termAmount: Number(form.termAmount),
        interestRate: Number(form.interestRate),
        loanTerm: Number(form.loanTerm),
        startDate: form.startDate,
        notes: form.notes
      }),
    });

    setLoading(false);
    if (res.ok) router.push(`/investors/${form.investorId}`);
    else { const data = await res.json(); setError(data.error || "Failed to create loan"); }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Create New Loan</h1>
      {error && <div className="bg-red-50 text-red-700 p-3 rounded mb-4">{error}</div>}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-4">
        
        <label className="block">
          <span className="text-sm font-medium">Borrower</span>
          <select required value={form.investorId} onChange={e => setForm({ ...form, investorId: e.target.value })} className="mt-1 w-full border rounded px-3 py-2">
            <option value="">-- Choose an investor --</option>
            {investors.map(inv => <option key={inv.id} value={inv.id}>{inv.name} ({inv.phone})</option>)}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-medium">Loan Date</span>
            <input type="date" required value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} className="mt-1 w-full border rounded px-3 py-2" />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Principal (₹)</span>
            <input type="number" required min="1000" value={form.principalAmount} onChange={e => setForm({ ...form, principalAmount: e.target.value })} className="mt-1 w-full border rounded px-3 py-2" />
          </label>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <label className="block">
            <span className="text-sm font-medium">Interest Rate (%)</span>
            <input type="number" required step="0.1" value={form.interestRate} onChange={e => setForm({ ...form, interestRate: e.target.value })} className="mt-1 w-full border rounded px-3 py-2" />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Monthly Principal (₹)</span>
            <input type="number" required min="100" value={form.termAmount} onChange={e => setForm({ ...form, termAmount: e.target.value })} className="mt-1 w-full border rounded px-3 py-2" />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Agreed Term (Months)</span>
            <input type="number" required min="1" value={form.loanTerm} onChange={e => setForm({ ...form, loanTerm: e.target.value })} className="mt-1 w-full border rounded px-3 py-2" />
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-medium">Purpose / Notes</span>
          <input type="text" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="mt-1 w-full border rounded px-3 py-2" />
        </label>

        <button type="submit" disabled={loading} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
          {loading ? "Generating Schedule..." : "Create Loan & Generate Schedule"}
        </button>
      </form>
    </div>
  );
}

