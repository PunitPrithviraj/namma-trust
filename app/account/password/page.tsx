"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function ChangePasswordPage() {
  const router = useRouter();
  const { update } = useSession();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (next !== confirm) {
      setMsg({ type: "err", text: "New passwords do not match." });
      return;
    }
    setBusy(true);
    const res = await fetch("/api/me/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: current, newPassword: next }),
    });
    const data = await res.json();
    setBusy(false);
    if (res.ok) {
      setMsg({ type: "ok", text: "Password changed successfully." });
      setCurrent("");
      setNext("");
      setConfirm("");
      await update({ mustChangePassword: false });
      router.push("/dashboard");
      router.refresh();
    } else {
      setMsg({
        type: "err",
        text: typeof data.error === "string" ? data.error : "Failed.",
      });
    }
  }

  return (
    <div className="max-w-md mx-auto p-8">
      <Link href="/dashboard" className="text-blue-600 text-sm hover:underline">
        &larr; Back
      </Link>
      <h1 className="text-2xl font-bold mt-4 mb-6">Change Password</h1>

      {msg && (
        <div
          className={`p-3 rounded mb-4 text-sm ${
            msg.type === "ok"
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {msg.text}
        </div>
      )}

      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-gray-700">
            Current Password
          </span>
          <input
            type="password"
            required
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className="mt-1 w-full border rounded px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">New Password</span>
          <input
            type="password"
            required
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className="mt-1 w-full border rounded px-3 py-2"
          />
          <span className="text-xs text-gray-500">
            Min 6 chars, at least 1 letter &amp; 1 number.
          </span>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">
            Confirm New Password
          </span>
          <input
            type="password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="mt-1 w-full border rounded px-3 py-2"
          />
        </label>
        <button
          disabled={busy}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {busy ? "Saving..." : "Change Password"}
        </button>
      </form>
    </div>
  );
}
