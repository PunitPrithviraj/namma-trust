"use client";

import { Suspense, useEffect, useState } from "react";

function AuditContent() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/audit")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setLogs(data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8">Loading logs...</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Audit Log</h1>
      <p className="text-gray-500 mb-6">Track all recent admin actions in the system.</p>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-100 font-medium text-gray-700">
            <tr>
              <th className="px-4 py-3">Date & Time</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500">
                  {new Date(log.createdAt).toLocaleString("en-IN")}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    log.action === "CREATE" ? "bg-green-100 text-green-700" :
                    log.action === "DELETE" ? "bg-red-100 text-red-700" :
                    "bg-blue-100 text-blue-700"
                  }`}>
                    {log.action}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium">{log.entity}</td>
                <td className="px-4 py-3">{log.details}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr><td colSpan={4} className="p-6 text-center text-gray-500">No logs recorded yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AuditPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <AuditContent />
    </Suspense>
  );
}
