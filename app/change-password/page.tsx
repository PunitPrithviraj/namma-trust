"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function ChangePasswordPage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return setError("Passwords do not match");
    }
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword }),
    });

    if (res.ok) {
      // Update the session so Next.js knows the password was changed
      await update({ forcePasswordReset: false });
      
      if ((session?.user as any)?.role === "investor") {
        router.push("/investor-portal");
      } else {
        router.push("/dashboard");
      }
    } else {
      const data = await res.json();
      setError(data.error || "Failed to update password");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md w-full max-w-md border-t-4 border-red-500">
        <h1 className="text-2xl font-bold mb-2 text-center text-gray-800">Action Required</h1>
        <p className="text-sm text-gray-500 text-center mb-6">
          An administrator has reset your password. You must set a new personal password to continue.
        </p>

        {error && <div className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}

        <label className="block mb-4">
          <span className="text-sm font-medium text-gray-700">New Password</span>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            min="6"
            className="mt-1 w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </label>

        <label className="block mb-6">
          <span className="text-sm font-medium text-gray-700">Confirm New Password</span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            min="6"
            className="mt-1 w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50 font-medium"
        >
          {loading ? "Updating..." : "Set New Password"}
        </button>
        
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full mt-3 text-gray-500 hover:text-gray-700 text-sm"
        >
          Cancel and Logout
        </button>
      </form>
    </div>
  );
}
