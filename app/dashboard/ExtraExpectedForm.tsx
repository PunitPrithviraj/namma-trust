"use client";

import { useState } from "react";

export default function ExtraExpectedForm({ initialAmount }: { initialAmount: number }) {
  const [amount, setAmount] = useState(initialAmount.toString());
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setLoading(true);
    await fetch("/api/admin/extra-income", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(amount) }),
    });
    setLoading(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="mt-3 flex gap-2">
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Extra Expected ₹"
        className="w-full border border-teal-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
      />
      <button
        onClick={handleSave}
        disabled={loading}
        className="bg-teal-600 text-white px-4 py-1 rounded text-sm font-medium hover:bg-teal-700 disabled:opacity-50 whitespace-nowrap"
      >
        {loading ? "Saving..." : saved ? "Saved!" : "Save"}
      </button>
    </div>
  );
}
