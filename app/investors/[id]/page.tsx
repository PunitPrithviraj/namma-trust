"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Pencil } from "lucide-react";

function InvestorContent() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "admin";

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // EDIT PROFILE STATE
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "", phone: "", email: "", address: "", idProof: "", nominee: "", code: ""
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  // TRANSACTION STATE
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [txType, setTxType] = useState<"investment" | "withdrawal" | "profit">("investment");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [txDate, setTxDate] = useState(new Date().toISOString().split("T")[0]);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    if (!id) return;
    try {
      const res = await fetch(`/api/investors/${id}`);
      if (res.ok) {
        const resData = await res.json();
        setData(resData);
        // Pre-fill the edit form
        setEditForm({
          name: resData.name || "",
          phone: resData.phone || "",
          email: resData.email || "",
          address: resData.address || "",
          idProof: resData.idProof || "",
          nominee: resData.nominee || "",
          code: resData.code || "",
        });
      } else {
        setErrorMsg("Failed to load");
      }
    } catch (err) {
      setErrorMsg("Network error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleEditProfile(e: React.FormEvent) {
    e.preventDefault();
    setEditLoading(true);
    setEditError("");

    const res = await fetch(`/api/investors/${id}/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });

    setEditLoading(false);

    if (res.ok) {
      setIsEditOpen(false);
      load();
    } else {
      const err = await res.json();
      setEditError(err.error || "Failed to update profile");
    }
  }

  async function handleTransaction(e: React.FormEvent) {
    e.preventDefault();
    setSubmitLoading(true);
    setError("");

    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        investorId: id,
        amount: Number(amount),
        type: txType,
        notes,
        date: txDate, 
      }),
    });

    const resData = await res.json();
    setSubmitLoading(false);

    if (res.ok) {
      setIsDropdownOpen(false);
      setAmount("");
      setNotes("");
      setTxType("investment");
      load(); 
    } else {
      setError(typeof resData.error === "string" ? resData.error : "Transaction failed");
    }
  }

  async function handleCreateLogin() {
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
      alert(err.error || "Failed to create login");
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

  async function handleDeleteTransaction(tx: any) {
    if (!confirm("Delete this transaction? The balance will be recalculated.")) return;
    const res = await fetch(`/api/transactions/${tx.id}`, { method: "DELETE" });
    if (res.ok) load();
    else alert("Failed to delete transaction");
  }

  if (loading) return <div className="p-8">Loading...</div>;
  if (errorMsg) return <div className="p-8 text-red-600">Error: {errorMsg}</div>;
  if (!data) return <div className="p-8 text-red-600">Investor not found.</div>;

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

  const customBalance = totalInvestment + totalProfit - totalWithdrawn;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto relative">
      
      {/* EDIT MODAL */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Edit Investor Details</h2>
              <button onClick={() => setIsEditOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            
            {editError && <div className="bg-red-50 text-red-700 p-2 rounded mb-4 text-sm">{editError}</div>}

            <form onSubmit={handleEditProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-xs font-medium text-gray-700">Full Name</span>
                  <input type="text" required value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} className="mt-1 w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-gray-700">Phone Number</span>
                  <input type="text" required value={editForm.phone} onChange={(e) => setEditForm({...editForm, phone: e.target.value})} className="mt-1 w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-gray-700">Email (Optional)</span>
                  <input type="email" value={editForm.email} onChange={(e) => setEditForm({...editForm, email: e.target.value})} className="mt-1 w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-gray-700">Investor ID (Code)</span>
                  <input type="text" value={editForm.code} onChange={(e) => setEditForm({...editForm, code: e.target.value})} className="mt-1 w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                </label>
              </div>
              
              <label className="block">
                <span className="text-xs font-medium text-gray-700">Address</span>
                <input type="text" value={editForm.address} onChange={(e) => setEditForm({...editForm, address: e.target.value})} className="mt-1 w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-xs font-medium text-gray-700">ID Proof (Aadhaar/PAN)</span>
                  <input type="text" value={editForm.idProof} onChange={(e) => setEditForm({...editForm, idProof: e.target.value})} className="mt-1 w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-gray-700">Nominee Name</span>
                  <input type="text" value={editForm.nominee} onChange={(e) => setEditForm({...editForm, nominee: e.target.value})} className="mt-1 w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                </label>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsEditOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded font-medium">Cancel</button>
                <button type="submit" disabled={editLoading} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50 font-medium">
                  {editLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="mb-6 print:hidden">
        <Link href="/investors" className="text-blue-600 mb-4 hover:underline inline-block">
          &larr; Back to Investors
        </Link>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              {data.name}
              <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                <span className="text-sm font-mono text-gray-600">{data.code || "NO-ID"}</span>
              </div>
              {isAdmin && (
                <button onClick={() => setIsEditOpen(true)} className="text-gray-400 hover:text-blue-600 p-1" title="Edit Profile">
                  <Pencil className="w-5 h-5" />
                </button>
              )}
            </h1>
            <p className="text-gray-500 mt-1">{data.phone} • Joined {new Date(data.joinDate).toLocaleDateString("en-IN")}</p>
            {/* 👈 SHOW EXTRA DETAILS IF THEY EXIST */}
            {data.address && <p className="text-sm text-gray-500 mt-1"><span className="font-semibold">Address:</span> {data.address}</p>}
            {data.idProof && <p className="text-sm text-gray-500 mt-1"><span className="font-semibold">ID:</span> {data.idProof}</p>}
            {data.nominee && <p className="text-sm text-gray-500 mt-1"><span className="font-semibold">Nominee:</span> {data.nominee}</p>}
          </div>
          
          <div className="flex flex-wrap gap-2 relative w-full md:w-auto" ref={dropdownRef}>
            <button onClick={() => window.print()} className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-900 text-sm">🖨️ Print</button>
            
            {isAdmin && !data.user && (
              <button onClick={handleCreateLogin} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 font-medium text-sm">
                Create Login
              </button>
            )}
            
            {data.user && (
              <span className="bg-green-100 text-green-800 px-3 py-2 rounded text-sm font-medium flex items-center">
                Login: {data.user.email}
              </span>
            )}

            {isAdmin && (
              <button onClick={handleDeleteInvestor} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 text-sm">
                Delete
              </button>
            )}

            {isAdmin && (
              <div className="relative">
                <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-medium text-sm">
                  + New Transaction
                </button>
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 p-5 z-50">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-lg font-bold text-gray-800">Add Entry</h2>
                      <button onClick={() => setIsDropdownOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
                    </div>
                    {error && <div className="bg-red-50 text-red-700 p-2 rounded mb-3 text-xs">{error}</div>}
                    <form onSubmit={handleTransaction} className="space-y-4">
                      <label className="block">
                        <span className="text-xs font-medium text-gray-700">Type</span>
                        <select value={txType} onChange={(e) => setTxType(e.target.value as any)} className="mt-1 w-full border rounded px-2 py-1.5 text-sm">
                          <option value="investment">Add Investment</option>
                          <option value="withdrawal">Withdraw Funds</option>
                          <option value="profit">Direct Profit Entry</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-xs font-medium text-gray-700">Amount (₹)</span>
                        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required min="1" className="mt-1 w-full border rounded px-3 py-1.5 text-sm" />
                      </label>
                      <label className="block">
                        <span className="text-xs font-medium text-gray-700">Date</span>
                        <input type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)} required className="mt-1 w-full border rounded px-3 py-1.5 text-sm" />
                      </label>
                      <label className="block">
                        <span className="text-xs font-medium text-gray-700">Notes</span>
                        <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 w-full border rounded px-3 py-1.5 text-sm" />
                      </label>
                      <button type="submit" disabled={submitLoading} className={`w-full py-2 rounded text-white font-medium text-sm mt-2 ${txType === "investment" ? "bg-green-600" : txType === "withdrawal" ? "bg-red-600" : "bg-purple-600"}`}>
                        {submitLoading ? "Saving..." : "Save"}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8 print:hidden">
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm font-medium text-gray-500">Total Investment</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">₹{totalInvestment.toLocaleString("en-IN")}</p>
        </div>
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm font-medium text-gray-500">Total Loan (Active)</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">₹{totalLoan.toLocaleString("en-IN")}</p>
        </div>
        <div className="bg-purple-50 p-5 rounded-lg shadow-sm border border-purple-200">
          <p className="text-sm font-medium text-purple-700">Total Profit</p>
          <p className="text-2xl font-bold text-purple-800 mt-1">₹{totalProfit.toLocaleString("en-IN")}</p>
        </div>
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

      {/* TRANSACTIONS TABLE */}
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b bg-gray-50 font-semibold text-gray-700">Recent Transactions</div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2 text-sm text-gray-500">Date</th>
                  <th className="text-left px-4 py-2 text-sm text-gray-500">Type</th>
                  <th className="text-right px-4 py-2 text-sm text-gray-500">Amount</th>
                  {isAdmin && <th className="text-right px-4 py-2 text-sm text-gray-500 print:hidden">Action</th>}
                </tr>
              </thead>
              <tbody>
                {[...data.investments.map((i:any)=>({...i, color:"text-green-600"})), 
                  ...data.withdrawals.map((w:any)=>({...w, type:"Withdrawal", color:"text-red-600"}))]
                  .sort((a,b)=> new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((tx: any) => {
                  const isProfit = tx.type === "profit";
                  const isMonthly = tx.type === "monthly" || tx.notes === "Monthly ₹1,000 Admin Entry";
                  
                  let displayType = tx.type === "Withdrawal" ? "Withdrawal" : tx.type === "investment" ? "Investment" : "Profit";
                  if (isMonthly) displayType = "Monthly Investment";
                  
                  return (
                  <tr key={tx.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm">{new Date(tx.date).toLocaleDateString()}</td>
                    <td className={`px-4 py-2 text-sm font-medium ${isProfit ? "text-purple-600" : isMonthly ? "text-blue-600" : tx.color}`}>
                      {displayType}
                    </td>
                    <td className={`px-4 py-2 text-right font-medium ${isProfit ? "text-purple-600" : tx.color}`}>
                      {tx.type === "Withdrawal" ? "-" : "+"}₹{tx.amount.toLocaleString("en-IN")}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-2 text-right print:hidden">
                        <button onClick={() => handleDeleteTransaction(tx)} className="text-red-500 hover:text-red-700 text-xs font-bold">Delete</button>
                      </td>
                    )}
                  </tr>
                )})}
                {data.investments.length === 0 && data.withdrawals.length === 0 && data.profitDistributions.length === 0 && (
                  <tr><td colSpan={isAdmin ? 4 : 3} className="p-4 text-center text-gray-500">No transactions yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
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
