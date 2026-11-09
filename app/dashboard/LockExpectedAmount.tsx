"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LockExpectedAmount({ 
  isLocked, 
  currentEMI, 
  currentInv,
  initialExtra
}: { 
  isLocked: boolean, 
  currentEMI: number, 
  currentInv: number,
  initialExtra: number
}) {
  const [loading, setLoading] = useState(false);
  const [extra, setExtra] = useState(initialExtra.toString());
  const router = useRouter();

  async function handleSaveAndLock() {
    if (isLocked) {
      if (!confirm("This target is locked. Do you want to overwrite it with the new numbers?")) return;
    }

    setLoading(true);
    const extraAmount = Number(extra) || 0;

    await fetch("/api/admin/expected-target", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        emiTarget: currentEMI,
        invTarget: currentInv,
        extraTarget: extraAmount,
        totalTarget: currentEMI + currentInv + extraAmount
      }),
    });
    
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="absolute bottom-4 left-4 right-4 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input 
          type="number"
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
          placeholder="Extra Expected ₹"
          className="w-full border border-teal-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
        />
        <button 
          onClick={handleSaveAndLock}
          disabled={loading}
          className={`px-4 py-1.5 rounded text-xs font-bold text-white transition-colors disabled:opacity-50 whitespace-nowrap ${
            isLocked ? "bg-gray-600 hover:bg-gray-700" : "bg-teal-600 hover:bg-teal-700"
          }`}
        >
          {loading ? "Saving..." : isLocked ? "Overwrite" : "Save & Lock"}
        </button>
      </div>
    </div>
  );
}
