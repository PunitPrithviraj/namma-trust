"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LockExpectedAmount({ isLocked, currentEMI, currentInv }: { isLocked: boolean, currentEMI: number, currentInv: number }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLock() {
    if (isLocked) {
      if (!confirm("This cycle is already locked. Do you want to overwrite it with the new live calculations?")) return;
    } else {
      if (!confirm("Lock the expected amounts for this cycle? This will freeze the target amount so it doesn't drop when people pay early.")) return;
    }

    const extraStr = prompt("Enter any Extra Expected Amount for this cycle (₹):", "0");
    if (extraStr === null) return; // User cancelled
    const extra = Number(extraStr) || 0;

    setLoading(true);
    await fetch("/api/admin/expected-target", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        emiTarget: currentEMI,
        invTarget: currentInv,
        extraTarget: extra,
        totalTarget: currentEMI + currentInv + extra
      }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="absolute bottom-4 left-4 right-4 flex gap-2">
      <button 
        onClick={handleLock}
        disabled={loading}
        className={`flex-1 py-2 rounded text-xs font-bold text-white transition-colors disabled:opacity-50 ${isLocked ? "bg-gray-600 hover:bg-gray-700" : "bg-teal-600 hover:bg-teal-700"}`}
      >
        {loading ? "Saving..." : isLocked ? "Overwrite Target" : "Lock Expected Target"}
      </button>
    </div>
  );
}
