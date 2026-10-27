"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function ManageAccountsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [investors, setInvestors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Fetch all users with role "investor"
  async function loadAccounts() {
    fetch("/api/admin/users-list")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setInvestors(data);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadAccounts(); }, []);

  async function handleAction(action: string, userId: string) {
    if (action === "RESET_PASSWORD") {
      const newPassword = prompt("Enter new emergency password (min 6 chars):");
      if (!newPassword) return;
      
      if (!confirm("Are you sure? This will immediately change their password and force them to reset it on next login.")) return;

      const res = await fetch("/api/admin/manage-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, userId, newPassword }),
      });

      if (res.ok) { alert("Password reset successfully."); loadAccounts(); }
      else { alert("Failed to reset password."); }
    } 
    else {
      if (!confirm(`Are you sure you want to ${action === "LOCK" ? "lock" : "unlock"} this account?`)) return;
      
      const res = await fetch("/api/admin/manage-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, userId }),
      });

      if (res.ok) { loadAccounts(); }
      else { alert("Action failed."); }
    }
  }

  const filteredInvestors = investors.filter(inv => 
    inv.name.toLowerCase().includes(search.toLowerCase()) || 
    inv.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="p-8">Loading accounts...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Investor Account Management</h1>
          <p className="text-gray-500 mt-1">Manage login credentials and access status for investors.</p>
        </div>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:w-96 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-600 font-medium text-sm">
            <tr>
              <th className="px-6 py-4">Investor Name</th>
              <th className="px-6 py-4">Login Email</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Last Password Change</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvestors.map((inv) => (
              <tr key={inv.id} className="border-t hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-800">{inv.name}</td>
                <td className="px-6 py-4 text-gray-500">{inv.email}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${inv.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {inv.status.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-500 text-sm">
                  {new Date(inv.lastPasswordChange).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button 
                    onClick={() => handleAction("RESET_PASSWORD", inv.id)}
                    className="text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded text-sm font-medium"
                  >
                    Reset Password
                  </button>
                  
                  {inv.status === "active" ? (
                    <button 
                      onClick={() => handleAction("LOCK", inv.id)}
                      className="text-red-600 hover:bg-red-50 px-3 py-1.5 rounded text-sm font-medium"
                    >
                      Lock Account
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleAction("UNLOCK", inv.id)}
                      className="text-green-600 hover:bg-green-50 px-3 py-1.5 rounded text-sm font-medium"
                    >
                      Unlock Account
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filteredInvestors.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  No investor accounts found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
