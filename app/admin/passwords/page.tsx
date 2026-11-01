"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type U = {
  id: string; email: string; role: string; mustChangePassword: boolean;
  investor: { id: string; name: string; code: string | null } | null;
};

export default function AdminPasswordsPage() {
  const [users, setUsers] = useState<U[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/users");
    setUsers(res.ok ? await res.json() : []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function reset(u: U) {
    const pw = prompt(`New password for ${u.email}:`);
    if (!pw) return;
    const force = confirm("Force user to change password on next login?");
    setBusyId(u.id);
    const res = await fetch(`/api/admin/users/${u.id}/change-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword: pw, forceChange: force }),
    });
    setBusyId(null);
    if (res.ok) { alert("Password reset."); load(); }
    else { const e = await res.json(); alert(e.error || "Failed."); }
  }

  if (loading) return <div className="p-8">Loading…</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <Link href="/dashboard" className="text-blue-600 text-sm hover:underline">&larr; Back</Link>
      <h1 className="text-2xl font-bold mt-4 mb-6">Manage Passwords</h1>
      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2">Linked Investor</th>
              <th className="px-4 py-2">Force change?</th>
              <th className="px-4 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-t">
                <td className="px-4 py-2">{u.email}</td>
                <td className="px-4 py-2 capitalize">{u.role}</td>
                <td className="px-4 py-2">{u.investor ? `${u.investor.name} (${u.investor.code ?? "—"})` : "—"}</td>
                <td className="px-4 py-2">{u.mustChangePassword ? "Yes" : "No"}</td>
                <td className="px-4 py-2 text-right">
                  <button disabled={busyId === u.id} onClick={() => reset(u)}
                          className="text-blue-600 hover:underline text-xs font-bold disabled:opacity-50">
                    {busyId === u.id ? "…" : "Reset Password"}
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={5} className="p-4 text-center text-gray-500">No users found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
