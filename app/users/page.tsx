"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export default function UsersPage() {
  const { data: session, status } = useSession();
  
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [myEmail, setMyEmail] = useState("");

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  // Edit mode state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingEmail, setEditingEmail] = useState("");

  async function loadUsers() {
    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setUsers(data);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      setIsAdmin((session.user as any)?.role === "admin");
      setMyEmail(session.user.email || "");
    }
  }, [session, status]);

  useEffect(() => { 
    loadUsers(); 
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError("");

    const url = editingId ? `/api/users/${editingId}/update` : "/api/users/create";
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role }),
    });

    if (res.ok) {
      resetForm();
      loadUsers();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to save user");
    }
    setCreating(false);
  }

  async function handleDelete() {
    if (!editingId) return;
    if (!confirm("Are you sure you want to delete this user? They will lose access immediately.")) return;
    
    const res = await fetch(`/api/users/${editingId}`, { method: "DELETE" });
    if (res.ok) {
      resetForm();
      loadUsers();
    } else {
      const data = await res.json();
      alert(data.error || "Failed to delete user");
    }
  }

  function startEdit(user: any) {
    setEditingId(user.id);
    setEditingEmail(user.email);
    setName(user.name);
    setEmail(user.email);
    setRole(user.role);
    setPassword("");
    setError("");
  }

  function resetForm() {
    setEditingId(null);
    setEditingEmail("");
    setName("");
    setEmail("");
    setPassword("");
    setRole("user");
    setError("");
  }

  if (loading || status === "loading") return <div className="p-8">Loading users...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">System Users</h1>
          <p className="text-gray-500 mt-1">Manage who can log into Namma Trust.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {isAdmin && (
          <div className="md:col-span-1">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 sticky top-24">
              <h2 className="text-lg font-semibold mb-4">
                {editingId ? "Edit User" : "Add New User"}
              </h2>
              {error && <div className="bg-red-50 text-red-700 p-2 rounded mb-4 text-sm">{error}</div>}
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Full Name</span>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 w-full border rounded px-3 py-2" />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Email</span>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1 w-full border rounded px-3 py-2" />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">
                    {editingId ? "New Password (optional)" : "Password"}
                  </span>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required={!editingId} min="6" className="mt-1 w-full border rounded px-3 py-2" />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Role</span>
                  <select value={role} onChange={(e) => setRole(e.target.value)} className="mt-1 w-full border rounded px-3 py-2">
                    <option value="user">User (View Only)</option>
                    <option value="admin">Admin (Full Access)</option>
                  </select>
                </label>
                
                <div className="flex flex-col gap-3 mt-6">
                  <div className="flex gap-2">
                    <button type="submit" disabled={creating} className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50">
                      {creating ? "Saving..." : editingId ? "Save Changes" : "Create Account"}
                    </button>
                    {editingId && (
                      <button type="button" onClick={resetForm} className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300">
                        Cancel
                      </button>
                    )}
                  </div>

                  {/* NEW: DELETE BUTTON INSIDE THE FORM */}
                  {editingId && editingEmail !== myEmail && (
                    <button 
                      type="button" 
                      onClick={handleDelete} 
                      className="w-full bg-red-50 text-red-600 border border-red-200 py-2 rounded hover:bg-red-100 font-medium mt-2"
                    >
                      Delete User
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}

        <div className={isAdmin ? "md:col-span-2" : "md:col-span-3"}>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-600 font-medium text-sm">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Role & Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-800">{user.name}</td>
                    <td className="px-6 py-4 text-gray-500">{user.email}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        
                        <span className={`px-2 py-1 rounded text-xs font-bold ${user.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                          {user.role.toUpperCase()}
                        </span>

                        <div className="flex gap-3 ml-4">
                          <button onClick={() => startEdit(user)} className="text-blue-600 hover:text-blue-800 text-sm font-bold bg-blue-50 px-2 py-1 rounded">
                            Edit
                          </button>
                        </div>

                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
