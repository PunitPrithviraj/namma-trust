"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoanRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  async function load() {
    fetch("/api/loans/list?q=") // fetch all loans
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setRequests(data.filter((l) => l.status === "requested"));
        }
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleAction(id: string, action: "approve" | "decline") {
    if (action === "decline") {
      if (!confirm("Are you sure you want to decline this loan request?")) return;
      await fetch(`/api/loans/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      load();
      return;
    }

    // Approve flow: prompt for details
    const termAmountStr = prompt("Enter Monthly Principal (Term Amount):", "1000");
    if (!termAmountStr) return;
    const loanTermStr = prompt("Enter Loan Term (Months):", "12");
    if (!loanTermStr) return;
    
    const startDateStr = prompt("Enter Start Date (YYYY-MM-DD):", new Date().toISOString().split("T")[0]);
    if (!startDateStr) return;

    const res = await fetch(`/api/loans/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        action,
        termAmount: Number(termAmountStr),
        loanTerm: Number(loanTermStr),
        interestRate: 1.5,
        startDate: startDateStr,
      }),
    });

    const data = await res.json();
    if (res.ok) {
      alert("Loan Approved successfully!");
      load();
    } else {
      alert(data.error);
    }
  }

  if (loading) return <div className="p-8 text-center mt-20">Loading requests...</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <Link href="/dashboard" className="text-blue-600 hover:underline mb-4 inline-block">&larr; Back to Dashboard</Link>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Pending Loan Requests</h1>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-600 text-sm border-b">
            <tr>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Borrower</th>
              <th className="px-6 py-4">Requested Amount</th>
              <th className="px-6 py-4">Purpose</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((req) => (
              <tr key={req.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-4 text-gray-600">{new Date(req.createdAt).toLocaleDateString("en-IN")}</td>
                <td className="px-6 py-4 font-medium text-gray-800">{req.investor.name}</td>
                <td className="px-6 py-4 text-blue-600 font-bold">₹{req.principalAmount.toLocaleString("en-IN")}</td>
                <td className="px-6 py-4 text-gray-500 text-sm">{req.notes?.replace("REQUEST: ", "")}</td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => handleAction(req.id, "approve")} className="bg-green-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-green-700 mr-2">Approve</button>
                  <button onClick={() => handleAction(req.id, "decline")} className="bg-red-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-red-700">Decline</button>
                </td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-gray-500">No pending loan requests.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
