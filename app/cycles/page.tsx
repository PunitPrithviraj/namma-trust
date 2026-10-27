"use client";

import { Suspense, useEffect, useState } from "react";
import { useSession } from "next-auth/react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June", 
  "July", "August", "September", "October", "November", "December"
];

function getYearOptions() {
  const years = [];
  const currentYear = new Date().getFullYear();
  for (let y = 2026; y <= currentYear; y++) {
    years.push(y);
  }
  if (years.length === 0) years.push(2026);
  return years.reverse();
}

const YEAR_OPTIONS = getYearOptions();

// --- INNER COMPONENT ---
function CyclesContent() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "admin";

  const [cycles, setCycles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [interest, setInterest] = useState("");
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(YEAR_OPTIONS[0]);
  
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  async function loadCycles() {
    const res = await fetch("/api/cycles/list");
    if (res.ok) setCycles(await res.json());
    setLoading(false);
  }

  useEffect(() => { loadCycles(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError("");

    const res = await fetch("/api/cycles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        totalInterestCollected: Number(interest),
        month: Number(month),
        year: Number(year)
      }),
    });

    if (res.ok) {
      setInterest("");
      loadCycles();
    } else {
      const data = await res.json();
      setError(typeof data.error === "string" ? data.error : "Failed to create");
    }
    setCreating(false);
  }

  async function handleDistribute(id: string, isRecalculate = false) {
    const msg = isRecalculate 
      ? "Recalculate? This will delete the old distribution and split the profit again based on current balances."
      : "Are you sure? This will calculate and distribute profit to all investors.";
      
    if (!confirm(msg)) return;

    if (isRecalculate) {
      const delRes = await fetch(`/api/cycles/${id}`, { method: "DELETE" });
      if (!delRes.ok) {
        alert("Failed to reset the cycle");
        return;
      }
    }

    const res = await fetch(`/api/cycles/${id}/distribute`, { method: "POST" });
    
    if (res.ok) {
      alert("Profit distributed successfully!");
      loadCycles();
    } else {
      const data = await res.json();
      alert(data.error || "Failed to distribute");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to PERMANENTLY delete this cycle? The profit records will be removed.")) return;
    
    const res = await fetch(`/api/cycles/${id}`, { method: "DELETE" });
    if (res.ok) {
      loadCycles();
    } else {
      alert("Failed to delete cycle");
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Monthly Profit Distribution</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* ADMIN ONLY: Left Create Cycle Form */}
        {isAdmin && (
          <div className="md:col-span-1">
            <div className="bg-white p-6 rounded-lg shadow border">
              <h2 className="text-lg font-semibold mb-4">Close a Month</h2>
              <p className="text-sm text-gray-500 mb-4">
                Select the month and year, then enter the total interest collected from all loans.
              </p>

              {error && <div className="bg-red-50 text-red-700 p-2 rounded mb-4 text-sm">{error}</div>}

              <form onSubmit={handleCreate} className="space-y-4">
                
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="text-sm font-medium">Month</span>
                    <select
                      value={month}
                      onChange={(e) => setMonth(Number(e.target.value))}
                      className="mt-1 w-full border rounded px-3 py-2"
                    >
                      {MONTHS.map((m, i) => (
                        <option key={i} value={i}>{m}</option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium">Year</span>
                    <select
                      value={year}
                      onChange={(e) => setYear(Number(e.target.value))}
                      className="mt-1 w-full border rounded px-3 py-2"
                    >
                      {YEAR_OPTIONS.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="block">
                  <span className="text-sm font-medium">Total Interest Collected (₹)</span>
                  <input
                    type="number"
                    required
                    min="1"
                    value={interest}
                    onChange={(e) => setInterest(e.target.value)}
                    className="mt-1 w-full border rounded px-3 py-2"
                  />
                </label>

                <button
                  type="submit"
                  disabled={creating}
                  className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create Cycle"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Right: List of Cycles (Visible to All) */}
        <div className={isAdmin ? "md:col-span-2 space-y-4" : "md:col-span-3 space-y-4"}>
          <h2 className="text-xl font-bold">Cycles</h2>
          
          {loading ? (
            <p>Loading...</p>
          ) : cycles.length === 0 ? (
            <div className="bg-gray-50 p-6 text-center text-gray-500 rounded border">
              No cycles created yet.
            </div>
          ) : (
            cycles.map((cycle) => (
              <div key={cycle.id} className="bg-white p-6 rounded-lg shadow border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <p className="font-semibold text-lg">
                    {new Date(cycle.cycleStart).toLocaleDateString("en-IN", { month: 'long', year: 'numeric' })} Cycle
                  </p>
                  <p className="text-sm text-gray-500">
                    Interest Pool: <span className="font-bold text-green-600">₹{cycle.totalInterestCollected.toLocaleString("en-IN")}</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(cycle.cycleStart).toLocaleDateString()} - {new Date(cycle.cycleEnd).toLocaleDateString()}
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  {cycle.status === "distributed" ? (
                    <>
                      <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium mr-2">
                        Distributed
                      </span>
                      
                      {/* ADMIN ONLY: Recalculate & Delete Buttons */}
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => handleDistribute(cycle.id, true)}
                            className="bg-yellow-100 text-yellow-700 px-3 py-1.5 rounded hover:bg-yellow-200 text-sm font-medium"
                            title="Recalculate with latest balances"
                          >
                            Recalculate
                          </button>
                          <button
                            onClick={() => handleDelete(cycle.id)}
                            className="text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors"
                            title="Delete Cycle"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                          </button>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      {/* ADMIN ONLY: Distribute Profit Button */}
                      {isAdmin && (
                        <button
                          onClick={() => handleDistribute(cycle.id)}
                          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm font-medium"
                        >
                          Distribute Profit
                        </button>
                      )}
                      
                      {/* ADMIN ONLY: Delete Button for non-distributed cycles */}
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(cycle.id)}
                          className="text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors"
                          title="Delete Cycle"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// --- OUTER COMPONENT ---
export default function CyclesPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading profit cycles...</div>}>
      <CyclesContent />
    </Suspense>
  );
}
