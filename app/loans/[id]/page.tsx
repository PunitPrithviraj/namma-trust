"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

function LoanContent() {
  const { id } = useParams();
  const router = useRouter();

  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "admin";

  const [loan, setLoan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);

  const [extraAmount, setExtraAmount] = useState("");
  const [extraLoading, setExtraLoading] = useState(false);

  const [currentPrincipal, setCurrentPrincipal] = useState(0);

  async function loadLoan() {
    const res = await fetch(`/api/loans/${id}`);
    if (res.ok) {
      const data = await res.json();
      setLoan(data);
      
      // Calculate the live principal (Original - all repayments)
      let livePrincipal = data.principalAmount;
      if (data.repayments && data.repayments.length > 0) {
        const totalPrincipalPaid = data.repayments.reduce((sum: number, r: any) => sum + r.principalPart, 0);
        livePrincipal -= totalPrincipalPaid;
      }
      setCurrentPrincipal(Math.max(0, livePrincipal));
    }
    setLoading(false);
  }

  useEffect(() => { loadLoan(); }, [id]);

  async function handlePay(scheduleId: string) {
    if (!confirm("Mark this month as paid? This will add ₹1000 to the investor's balance.")) return;
    setPayingId(scheduleId);
    const res = await fetch("/api/repayments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduleId }),
    });
    if (res.ok) {
      await loadLoan();
    } else {
      alert("Failed to record payment");
    }
    setPayingId(null);
  }

  async function handleDeletePayment(repaymentId: string, isExtra: boolean) {
    const msg = isExtra 
      ? "Delete this extra payment? The principal will be increased back." 
      : "Undo this regular payment? The month will be marked as pending and the ₹1000 investment will be removed.";
      
    if (!confirm(msg)) return;
    
    const res = await fetch(`/api/repayments/${repaymentId}`, { method: "DELETE" });
    if (res.ok) await loadLoan();
    else alert("Failed to delete payment");
  }

  async function handleExtraRepay(e: React.FormEvent) {
    e.preventDefault();
    setExtraLoading(true);
    const res = await fetch(`/api/loans/${id}/repay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(extraAmount) }),
    });
    if (res.ok) {
      setExtraAmount("");
      await loadLoan();
    } else {
      alert("Failed to process extra payment");
    }
    setExtraLoading(false);
  }

  async function handleDeleteLoan() {
    if (!confirm("Are you sure you want to delete this loan completely?")) return;
    const res = await fetch(`/api/loans/${id}`, { method: "DELETE" });
    if (res.ok) router.push(`/investors/${loan.investorId}`);
    else alert("Failed to delete loan");
  }

  if (loading) return <div className="p-8">Loading...</div>;
  if (!loan) return <div className="p-8">Loan not found</div>;

  const investor = loan.investor;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <button onClick={() => router.push(`/investors/${investor.id}`)} className="text-blue-600 mb-4 hover:underline">
        &larr; Back to {investor.name}
      </button>
      
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            Loan {loan.code || "Details"}
            <span className={`text-sm px-2 py-1 rounded ${loan.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
              {loan.status.toUpperCase()}
            </span>
          </h1>
          <p className="text-gray-500 mt-1">
            Borrower: {investor.name} • 
            <span className="font-bold text-red-600 ml-1">
              Current Principal: ₹{currentPrincipal.toLocaleString("en-IN")}
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          
          {/* WHATSAPP REMINDER BUTTON */}
          <a 
            href={`https://wa.me/91${investor.phone.replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(
              `Hello ${investor.name}, this is a reminder from Namma Trust. Your loan (${loan.code || 'N/A'}) has a current outstanding principal of ₹${currentPrincipal.toLocaleString("en-IN")}. Please ensure your monthly installment is paid on time. Thank you!`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#25D366] text-white px-4 py-2 rounded hover:bg-[#1EBE5D] font-medium flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            WhatsApp
          </a>

          {isAdmin && (
            <button onClick={handleDeleteLoan} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
              Delete Loan
            </button>
          )}
        </div>
      </div>

      {loan.status === "active" && isAdmin && (
        <div className="bg-white p-4 rounded-lg shadow mb-6 border">
          <form onSubmit={handleExtraRepay} className="flex items-end gap-4">
            <label className="block flex-1">
              <span className="text-sm font-medium">Extra Principal Repayment (₹)</span>
              <input
                type="number"
                value={extraAmount}
                onChange={(e) => setExtraAmount(e.target.value)}
                required
                min="1"
                className="mt-1 w-full border rounded px-3 py-2"
                placeholder="Enter amount to reduce principal immediately"
              />
            </label>
            <button
              type="submit"
              disabled={extraLoading}
              className="bg-purple-600 text-white px-6 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
            >
              {extraLoading ? "Processing..." : "Pay Extra"}
            </button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 font-medium text-gray-700">
            <tr>
              <th className="px-4 py-3 text-left">Month</th>
              <th className="px-4 py-3 text-left">Due Date</th>
              <th className="px-4 py-3 text-right">Opening Principal</th>
              <th className="px-4 py-3 text-right">Interest (1.5%)</th>
              <th className="px-4 py-3 text-right">Term Amount</th>
              <th className="px-4 py-3 text-right">+ ₹1000 Inv</th>
              <th className="px-4 py-3 text-right">Total Due</th>
              <th className="px-4 py-3 text-right">Closing Principal</th>
              <th className="px-4 py-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {loan.schedule.map((sch: any) => {
              const totalDue = sch.interestAmount + sch.termAmount + sch.extra1000;
              const repayment = loan.repayments?.find((r: any) => r.scheduleId === sch.id);
              
              return (
                <tr key={sch.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">Month {sch.monthNo}</td>
                  
                  <td className="px-4 py-3 text-gray-600">
                    {sch.dueDate ? new Date(sch.dueDate).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' }) : "N/A"}
                  </td>
                  
                  <td className="px-4 py-3 text-right">₹{sch.openingPrincipal.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-right text-red-600">₹{sch.interestAmount.toLocaleString("en-IN", {maximumFractionDigits:0})}</td>
                  <td className="px-4 py-3 text-right">₹{sch.termAmount.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-right text-blue-600">₹{sch.extra1000.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-right font-bold">₹{totalDue.toLocaleString("en-IN", {maximumFractionDigits:0})}</td>
                  <td className="px-4 py-3 text-right">₹{sch.closingPrincipal.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-center">
                    {isAdmin ? (
                      sch.status === "paid" && repayment ? (
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-green-600 font-medium">Paid</span>
                          <button 
                            onClick={() => handleDeletePayment(repayment.id, false)}
                            className="text-xs text-red-500 hover:underline"
                          >
                            Undo
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handlePay(sch.id)}
                          disabled={payingId === sch.id}
                          className="bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 disabled:opacity-50"
                        >
                          {payingId === sch.id ? "..." : "Mark Paid"}
                        </button>
                      )
                    ) : (
                      <span className={sch.status === "paid" ? "text-green-600 font-medium" : "text-gray-500"}>
                        {sch.status === "paid" ? "Paid" : "Pending"}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b bg-gray-50 font-semibold text-purple-700">Transaction Timeline</div>
        <div className="p-6">
          {loan.repayments && loan.repayments.length > 0 ? (
            <div className="relative border-l border-gray-200 ml-3 space-y-6">
              {loan.repayments.map((rep: any) => {
                const isExtra = rep.notes?.includes("Extra Principal");
                return (
                  <div key={rep.id} className="ml-6 relative">
                    <span className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-4 border-white shadow ${isExtra ? 'bg-blue-600' : 'bg-purple-600'}`}></span>
                    
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <p className={`font-semibold ${isExtra ? 'text-blue-700' : 'text-gray-800'}`}>
                          {rep.notes ? rep.notes : `Monthly Repayment`}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(rep.paidDate).toLocaleString("en-IN", { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">
                          ₹{rep.amountPaid.toLocaleString("en-IN")}
                        </p>
                        
                        {isAdmin && (
                          <button 
                            onClick={() => handleDeletePayment(rep.id, isExtra)}
                            className="text-xs text-red-500 hover:text-red-700 hover:underline mt-1 block w-full text-right"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-4 text-xs text-gray-500 mt-2 bg-gray-50 p-2 rounded">
                      <span>Principal: ₹{rep.principalPart.toLocaleString("en-IN")}</span>
                      <span>Interest: ₹{rep.interestPart.toLocaleString("en-IN")}</span>
                      <span>Inv: ₹{rep.extra1000Part.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No payments have been made yet.</p>
          )}
        </div>
      </div>

    </div>
  );
}

export default function LoanDetailPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <LoanContent />
    </Suspense>
  );
}
