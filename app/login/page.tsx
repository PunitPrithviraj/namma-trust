"use client";

import { signIn, getSession } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image"; // 👈 Added Image import
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      identifier,
      password,
      redirect: false,
    });

    if (!res || res.error) {
      setLoading(false);
      setError("Invalid credentials. Please try again.");
      return;
    }

    const session = await getSession();
    const mustChange = (session?.user as any)?.mustChangePassword === true;
    const role = (session?.user as any)?.role;
    setLoading(false);

    if (mustChange) {
      router.push("/account/password");
      router.refresh();
      return;
    }

    if (role === "investor") {
      router.push("/investor-portal"); 
    } else {
      router.push("/dashboard");
    }
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-lg shadow-md w-full max-w-md"
      >
        {/* 👈 LOGO ADDED HERE */}
        <div className="flex justify-center mb-6">
          <Image 
            src="/logo.png" 
            alt="Namma Trust Logo" 
            width={160} 
            height={160} 
            className="object-contain"
            priority
          />
        </div>

        <h1 className="text-2xl font-bold mb-1 text-center text-gray-800">Welcome Back</h1>
        <p className="text-sm text-gray-500 text-center mb-6">Sign in to continue</p>

        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm text-center">
            {error}
          </div>
        )}

        <label className="block mb-4">
          <span className="text-sm font-medium text-gray-700">Email, Phone, or Investor ID</span>
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            placeholder="Ente "use client";

import { signIn, getSession } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image"; // 👈 Added Image import
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      identifier,
      password,
      redirect: false,
    });

    if (!res || res.error) {
      setLoading(false);
      setError("Invalid credentials. Please try again.");
      return;
    }

    const session = await getSession();
    const mustChange = (session?.user as any)?.mustChangePassword === true;
    const role = (session?.user as any)?.role;
    setLoading(false);

    if (mustChange) {
      router.push("/account/password");
      router.refresh();
      return;
    }

    if (role === "investor") {
      router.push("/investor-portal"); 
    } else {
      router.push("/dashboard");
    }
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-lg shadow-md w-full max-w-md"
      >
        {/* 👈 LOGO ADDED HERE */}
        <div className="flex justify-center mb-6">
          <Image 
            src="/logo.png" 
            alt="Namma Trust Logo" 
            width={160} 
            height={160} 
            className="object-contain"
            priority
          />
        </div>

        <h1 className="text-2xl font-bold mb-1 text-center text-gray-800">Welcome Back</h1>
        <p className="text-sm text-gray-500 text-center mb-6">Sign in to continue</p>

        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm text-center">
            {error}
          </div>
        )}

        <label className="block mb-4">
          <span className="text-sm font-medium text-gray-700">Email, Phone, or Investor ID</span>
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            placeholder="Admin: email / Investor: phone or ID"
            className="mt-1 w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </label>

        <label className="block mb-6">
          <span className="text-sm font-medium text-gray-700">Password</span>
          <div className="relative mt-1">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border rounded px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
        
        <p className="text-xs text-gray-500 mt-6 text-center">
          Forgot password? Contact your trust admin.
        </p>
      </form>
    </div>
  );
}rInvestor ID or phone Number"
            className="mt-1 w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </label>

        <label className="block mb-6">
          <span className="text-sm font-medium text-gray-700">Password</span>
          <div className="relative mt-1">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border rounded px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
        
        <p className="text-xs text-gray-500 mt-6 text-center">
          Forgot password? Contact your trust admin.
        </p>
      </form>
    </div>
  );
}
