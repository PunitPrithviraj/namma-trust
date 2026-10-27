"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewInvestorPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    idProof: "",
    nominee: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/investors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      // Safely parse the response to avoid "Unexpected end of JSON input" crashes
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};

      if (res.ok) {
        router.push("/investors");
      } else {
        // Handle Zod validation errors (array) or string errors
        if (Array.isArray(data.error)) {
          setError(data.error[0].message);
        } else {
          setError(typeof data.error === "string" ? data.error : "Failed to save investor.");
        }
      }
    } catch (err) {
      setError("A network error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Add New Investor</h1>

      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded mb-4">{error}</div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-lg shadow space-y-4"
      >
        <Field
          label="Name *"
          value={form.name}
          onChange={(v) => setForm({ ...form, name: v })}
          required
        />
        <Field
          label="Phone *"
          value={form.phone}
          onChange={(v) => setForm({ ...form, phone: v })}
          required
        />
        <Field
          label="Email"
          value={form.email}
          onChange={(v) => setForm({ ...form, email: v })}
        />
        <Field
          label="Address"
          value={form.address}
          onChange={(v) => setForm({ ...form, address: v })}
        />
        <Field
          label="ID Proof"
          value={form.idProof}
          onChange={(v) => setForm({ ...form, idProof: v })}
        />
        <Field
          label="Nominee"
          value={form.nominee}
          onChange={(v) => setForm({ ...form, nominee: v })}
        />

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Investor"}
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="mt-1 w-full border rounded px-3 py-2"
      />
    </label>
  );
}
