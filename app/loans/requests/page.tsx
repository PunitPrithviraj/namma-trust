"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Share2 } from "lucide-react";

export default function LoanRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fmt2 = (n: number) =>
    n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  async function load() {
    fetch("/api/loans/list?q=")
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
      setActionLoading(id);
      await fetch(`/api/loans/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      setActionLoading(null);
      load();
      return;
    }

    const termAmountStr = prompt("Enter Monthly Principal (Term Amount):", "1000");
    if (!termAmountStr) return;
    const loanTermStr = prompt("Enter Loan Term (Months):", "12");
    if (!loanTermStr) return;
    const startDateStr = prompt("Enter Start Date (YYYY-MM-DD):", new Date().toISOString().split("T")[0]);
    if (!startDateStr) return;

    setActionLoading(id);
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
    setActionLoading(null);

    if (res.ok) {
      alert("Loan Approved successfully!");
      load();
    } else {
      alert(data.error);
    }
  }

  function shareToWhatsApp(req: any) {
    const message = `*Namma Trust - Loan Request*\n\n👤 *Borrower:* ${req.investor.name}\n💰 *Amount:* ₹${fmt2(req.principalAmount)}\n📝 *Purpose:* ${req.notes?.replace("REQUEST: ", "") || "N/A"}\n\n_Please contact the Admin for more details._`;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  }

  if (loading) return <div className="p-8 text-center mt-20 text-gray-500">Loading requests...</div>;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <Link href="/dashboard" className="text-blue-600 hover:underline mb-4 inline-block font-medium">
        &larr; Back to Dashboard
      </Link>

      <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">Pending Loan Requests</h1>

      {requests.length === 0 ? (
        <div className="bg-white p-8 text-center rounded-lg shadow border text-gray-500">
          No pending loan requests at the moment.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {requests.map((req) => (
            <div key={req.id} className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex-1 w-full">
                <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-2">
                  <h3 className="text-base md:text-lg font-bold text-gray-800">{req.investor.name}</h3>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {new Date(req.createdAt).toLocaleDateString("en-IN")}
                  </span>
                </div>

                <p className="text-blue-600 font-bold text-lg md:text-xl mb-1">
                  ₹{fmt2(req.principalAmount)}
                </p>

                <p className="text-sm text-gray-600">
                  <span className="font-semibold text-gray-700">Purpose:</span> {req.notes?.replace("REQUEST: ", "") || "N/A"}
                </p>
              </div>

              <div className="grid grid-cols-3 sm:flex sm:flex-row w-full md:w-auto gap-2 mt-3 md:mt-0">
                <button
                  onClick={() => shareToWhatsApp(req)}
                  className="w-full sm:w-auto bg-[#25D366] text-white px-3 sm:px-4 py-2 rounded font-bold hover:bg-[#1EBE5D] transition-colors flex justify-center items-center gap-1 sm:gap-2 text-xs sm:text-sm"
                  title="Share to WhatsApp Group"
                >
                  <Share2 className="w-4 h-4" /> Share
                </button>

                <button
                  onClick={() => handleAction(req.id, "approve")}
                  disabled={actionLoading === req.id}
                  className="w-full sm:w-auto bg-green-600 text-white px-3 sm:px-6 py-2 rounded font-bold hover:bg-green-700 disabled:opacity-50 transition-colors text-xs sm:text-sm"
                >
                  {actionLoading === req.id ? "..." : "Approve"}
                </button>

                <button
                  onClick={() => handleAction(req.id, "decline")}
                  disabled={actionLoading === req.id}
                  className="w-full sm:w-auto bg-red-50 text-red-600 border border-red-200 px-3 sm:px-6 py-2 rounded font-bold hover:bg-red-100 disabled:opacity-50 transition-colors text-xs sm:text-sm"
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
