"use client";

import { useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (!res || res.error) {
      setBusy(false);
      setError("Invalid email or password.");
      return;
    }

    const session = await getSession();
    const mustChange = (session?.user as any)?.mustChangePassword === true;
    setBusy(false);

    if (mustChange) {
      router.push("/account/password");
      router.refresh();
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-sm border p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Namma Trust</h1>
        <p className="text-sm text-gray-500 mb-6">Sign in to continue</p>

        {error && (
          <div className="bg-red-50 text-red-700 text-sm p-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full border rounded px-3 py-2"
              autoComplete="email"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Password</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full border rounded px-3 py-2"
              autoComplete="current-password"
            />
          </label>

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="text-xs text-gray-500 mt-6 text-center">
          Forgot password? Contact your trust admin.
        </p>
      </div>
    </div>
  );
}
