"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";

function InvestorContent() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "admin";

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [txType, setTxType] = useState<"investment" | "withdrawal">("investment");
  const [txDate, setTxDate] = useState(new Date().toISOString().split("T")[0]); // <-- Default to today
  const [error, setError] = useState("");

  async function load() {
    if (!id) return;
    try {
      const res = await fetch(`/api/investors/${id}`);
      if (res.ok) {
        setData(await res.json());
      } else {
        const err = await res.json();
        setErrorMsg(err.error || "Failed to load");
      }
    } catch (err) {
      setErrorMsg("Network error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function handleEditJoinDate() {
    const currentDate = new Date(data.joinDate).toISOString().split('T')[0];
    const newDate = prompt("Enter new joining date (YYYY-MM-DD):", currentDate);
    if (!newDate) return;

    const res = await fetch(`/api/investors/${id}/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ joinDate: newDate }),
    });

    if (res.ok) load();
    else alert("Failed to update joining date.");
  }

  async function handleTransaction(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    
    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        investorId: id,
        amount: Number(amount),
        type: txType,
        notes,
        date: txDate, // <-- Send the selected date
      }),
    });

    if (res.ok) {
      setAmount("");
      setNotes("");
      load(); 
    } else {
      const err = await res.json();
      setError(typeof err.error === "string" ? err.error : "Transaction failed");
    }
  }

  async function handleDeleteInvestor() {
    if (!confirm("Are you sure you want to PERMANENTLY delete this investor? This cannot be undone.")) return;
    const res = await fetch(`/api/investors/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/investors");
    else {
      const err = await res.json();
      alert(err.error || "Cannot delete investor.");
    }
  }

  async function handleDeleteTransaction(txId: string) {
    if (!confirm("Delete this transaction? The balance will be recalculated.")) return;
    const res = await fetch(`/api/transactions/${txId}`, { method: "DELETE" });
    if (res.ok) load();
    else alert("Failed to delete transaction");
  }

  async function handleEditTransaction(tx: any) {
    const newAmount = prompt(`Edit Amount (Current: ₹${tx.amount}):`, tx.amount.toString());
    if (!newAmount || isNaN(Number(newAmount))) return;

    const res = await fetch(`/api/transactions/${tx.id}/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(newAmount), notes: tx.notes }),
    });

    if (res.ok) load();
    else alert("Failed to update transaction");
  }

  if (loading) return <div className="p-8">Loading...</div>;
  if (errorMsg) return <div className="p-8 text-red-600">Error: {errorMsg}</div>;
  if (!data) return <div className="p-8 text-red-600">Investor not found.</div>;

  // --- Financial Calculations ---
  const totalInvestment = data.investments?.reduce((sum: number, inv: any) => sum + inv.amount, 0) || 0;
  const totalWithdrawn = data.withdrawals?.reduce((sum: number, w: any) => sum + w.amount, 0) || 0;

  let totalLoan = 0;
  let pendingDues = 0;
  data.loans?.forEach((loan: any) => {
    if (loan.status === "active") {
      totalLoan += loan.principalAmount;
      const outstanding = loan.schedule.length > 0 ? loan.schedule[loan.schedule.length - 1].closingPrincipal : loan.principalAmount;
      pendingDues += outstanding;
    }
  });

  let totalProfit = 0;
  let thisMonthProfit = 0;
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  data.profitDistributions?.forEach((pd: any) => {
    totalProfit += pd.shareAmount;
    const cycleDate = new Date(pd.cycle.cycleStart);
    if (cycleDate.getMonth() === currentMonth && cycleDate.getFullYear() === currentYear) {
      thisMonthProfit += pd.shareAmount;
    }
  });

  // ✅ Current Balance = Investment + Profit - Withdrawals
  const customBalance = totalInvestment + totalProfit - totalWithdrawn;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      
      {/* --- CUSTOM PRINT HEADER (INLINE STYLES) --- */}
      <div className="hidden print:block mb-6">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid black', paddingBottom: '10px' }}>
          
          <div>
            <h1 style={{ fontSize: '26pt', fontWeight: 'bold', textTransform: 'uppercase', margin: 0, lineHeight: 1 }}>Namma Trust</h1>
          </div>

          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '11pt', fontWeight: 'bold', textTransform: 'uppercase', margin: 0 }}>Investor Statement</p>
            <p style={{ fontSize: '9pt', color: '#555', margin: 0 }}>Generated: {new Date().toLocaleDateString("en-IN")}</p>
          </div>
        </div>

        <div style={{ marginTop: '12px', fontSize: '13pt', fontWeight: 'bold', color: '#333' }}>
          {data.name} {data.code ? `(${data.code})` : ""} 
          <span style={{ fontSize: '10pt', fontWeight: 'normal', color: '#666', marginLeft: '10px' }}>
            {data.phone} • Joined: {new Date(data.joinDate).toLocaleDateString("en-IN")}
          </span>
        </div>

        <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '24px', fontSize: '10pt', border: '1px solid #999', padding: '8px 12px', backgroundColor: '#f9f9f9' }}>
          <div><strong>Total Investment:</strong> ₹{totalInvestment.toLocaleString("en-IN")}</div>
          <div><strong>Outstanding Loan:</strong> ₹{pendingDues.toLocaleString("en-IN")}</div>
          <div><strong>Profit Earned:</strong> ₹{totalProfit.toLocaleString("en-IN")}</div>
          <div><strong>This Month Profit:</strong> ₹{thisMonthProfit.toLocaleString("en-IN")}</div>
          <div><strong>Current Balance:</strong> ₹{customBalance.toLocaleString("en-IN")}</div>
        </div>
      </div>

      {/* --- SCREEN HEADER --- */}
      <div className="mb-6 print:hidden">
        <Link href="/investors" className="text-blue-600 mb-4 hover:underline inline-block">
          &larr; Back to Investors
        </Link>
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              {data.name}
              <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                <span className="text-sm font-mono text-gray-600">
                  {data.code || "NO-ID"}
                </span>
                {isAdmin && (
                  <button 
                    onClick={async () => {
                      const newCode = prompt("Enter new Investor ID (e.g. INV-005):", data.code || "");
                      if (newCode && newCode !== data.code) {
                        const res = await fetch(`/api/investors/${id}/update`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ code: newCode }),
                        });
                        if (res.ok) load();
                        else {
                          const err = await res.json();
                          alert(err.error || "Failed to update ID");
                        }
                      }
                    }}
                    className="text-blue-500 hover:text-blue-700 p-1"
                    title="Edit ID"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                  </button>
                )}
              </div>
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-gray-500">{data.phone} • Joined {new Date(data.joinDate).toLocaleDateString("en-IN")}</p>
              
              {isAdmin && (
                <button 
                  onClick={handleEditJoinDate}
                  className="text-blue-500 hover:text-blue-700 p-1 rounded hover:bg-blue-50 transition-colors"
                  title="Edit Joining Date"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                </button>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            
            <button 
              onClick={() => window.print()}
              className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-900"
            >
              🖨️ Print
            </button>

            {isAdmin && !data.user && (
              <button 
                onClick={async () => {
                  const email = prompt("Enter login email for investor:", data.email || "");
                  const password = prompt("Enter a password (min 6 chars):");
                  if (!email || !password) return;

                  const res = await fetch(`/api/investors/${id}/create-login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password }),
                  });
                  
                  if (res.ok) {
                    alert("Login created successfully!");
                    load();
                  } else {
                    const err = await res.json();
                    alert(err.error);
                  }
                }}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                Create Login
              </button>
            )}
            
            {data.user && (
              <span className="bg-green-100 text-green-800 px-3 py-2 rounded text-sm font-medium">
                Login: {data.user.email}
              </span>
            )}

            {isAdmin && (
              <button 
                onClick={handleDeleteInvestor}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Delete Investor
              </button>
            )}
          </div>
        </div>
      </div>

      {/* CLICKABLE SUMMARY CARDS (SCREEN ONLY) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 print:hidden">
        <Link href={`/investors/${id}/investments`} className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:scale-[1.02] transition-transform cursor-pointer block">
          <p className="text-sm font-medium text-gray-500">Total Investment</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">₹{totalInvestment.toLocaleString("en-IN")}</p>
          <p className="text-xs text-blue-500 mt-2 print:hidden">View History &rarr;</p>
        </Link>
        
        <Link href={`/investors/${id}/loans`} className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:scale-[1.02] transition-transform cursor-pointer block">
          <p className="text-sm font-medium text-gray-500">Total Loan (Active)</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">₹{totalLoan.toLocaleString("en-IN")}</p>
          <p className="text-xs text-blue-500 mt-2 print:hidden">View Loans &rarr;</p>
        </Link>
        
        <Link href={`/investors/${id}/profits`} className="bg-purple-50 p-5 rounded-lg shadow-sm border border-purple-200 hover:scale-[1.02] transition-transform cursor-pointer block">
          <p className="text-sm font-medium text-purple-700">Total Profit</p>
          <p className="text-2xl font-bold text-purple-800 mt-1">₹{totalProfit.toLocaleString("en-IN")}</p>
          <p className="text-xs text-purple-500 mt-2 print:hidden">View Profit History &rarr;</p>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 print:hidden">
        <div className="bg-green-50 p-5 rounded-lg shadow-sm border border-green-200">
          <p className="text-sm font-medium text-green-700">Current Balance</p>
          <p className="text-2xl font-bold text-green-800 mt-1">₹{customBalance.toLocaleString("en-IN")}</p>
        </div>
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm font-medium text-gray-500">Pending Dues</p>
          <p className="text-2xl font-bold text-red-600 mt-1">₹{pendingDues.toLocaleString("en-IN")}</p>
        </div>
        <div className="bg-purple-50 p-5 rounded-lg shadow-sm border border-purple-200">
          <p className="text-sm font-medium text-purple-700">This Month's Profit</p>
          <p className="text-2xl font-bold text-purple-800 mt-1">₹{thisMonthProfit.toLocaleString("en-IN")}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b bg-gray-50 font-semibold text-gray-700">Recent Transactions</div>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2 text-sm text-gray-500">Date</th>
                  <th className="text-left px-4 py-2 text-sm text-gray-500">Type</th>
                  <th className="text-right px-4 py-2 text-sm text-gray-500">Amount</th>
                  {isAdmin && <th className="text-right px-4 py-2 text-sm text-gray-500 print:hidden">Action</th>}
                </tr>
              </thead>
              <tbody>
                {[...data.investments.map((i:any)=>({...i, type:"Investment", color:"text-green-600"})), 
                  ...data.withdrawals.map((w:any)=>({...w, type:"Withdrawal", color:"text-red-600"}))]
                  .sort((a,b)=> new Date(b.date).getTime() - new Date(a.date).getTime())
                  .slice(0, 5)
                  .map((tx: any) => (
                  <tr key={tx.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm">{new Date(tx.date).toLocaleDateString()}</td>
                    <td className={`px-4 py-2 text-sm font-medium ${tx.color}`}>{tx.type}</td>
                    <td className={`px-4 py-2 text-right font-medium ${tx.color}`}>
                      {tx.type === "Withdrawal" ? "-" : "+"}₹{tx.amount.toLocaleString("en-IN")}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-2 text-right print:hidden">
                        <div className="flex justify-end gap-3">
                          <button onClick={() => handleEditTransaction(tx)} className="text-blue-600 hover:text-blue-800 text-xs font-bold">Edit</button>
                          <button onClick={() => handleDeleteTransaction(tx.id)} className="text-red-500 hover:text-red-700 text-xs font-bold">Delete</button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {data.investments.length === 0 && data.withdrawals.length === 0 && (
                  <tr><td colSpan={isAdmin ? 4 : 3} className="p-4 text-center text-gray-500">No transactions yet</td></tr>
                )}
              </tbody>
            </table>
          </div>

        </div>

        {isAdmin && (
          <div className="print:hidden">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 sticky top-24">
              <h2 className="text-lg font-semibold mb-4 text-gray-800">New Transaction</h2>
              {error && <div className="bg-red-50 text-red-700 p-2 rounded mb-4 text-sm">{error}</div>}
              
              <form onSubmit={handleTransaction} className="space-y-4">
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Type</span>
                  <select value={txType} onChange={(e) => setTxType(e.target.value as any)} className="mt-1 w-full border rounded px-3 py-2">
                    <option value="investment">Add Investment</option>
                    <option value="withdrawal">Withdraw Funds</option>
                  </select>
                </label>
                
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Amount (₹)</span>
                  <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required min="1" className="mt-1 w-full border rounded px-3 py-2" />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Transaction Date</span>
                  <input 
                    type="date" 
                    value={txDate} 
                    onChange={(e) => setTxDate(e.target.value)} 
                    required 
                    className="mt-1 w-full border rounded px-3 py-2" 
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Notes (Optional)</span>
                  <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 w-full border rounded px-3 py-2" />
                </label>
                
                <button type="submit" className={`w-full py-2 rounded text-white font-medium ${txType === "investment" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}>
                  {txType === "investment" ? "Add Funds" : "Withdraw Funds"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function InvestorDetailPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading investor data...</div>}>
      <InvestorContent />
    </Suspense>
  );
}
