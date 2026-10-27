"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function LoansContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const initialStatus = searchParams.get("status") || "all";
  
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(initialStatus);

  useEffect(() => {
    setLoading(true);
    const statusQuery = statusFilter === "active" ? "&status=active" : "";
    fetch(`/api/loans/list?q=${search}${statusQuery}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setLoans(data);
      })
      .finally(() => setLoading(false));
  }, [search, statusFilter]);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            {statusFilter === "active" ? "Active Loans" : "All Loans"}
          </h1>
          <p className="text-gray-500 mt-1">Manage and track all loans issued by the trust.</p>
        </div>
        <Link
          href="/loans/new"
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 font-medium"
        >
          + Create New Loan
        </Link>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <input
          type="text"
          placeholder="Search by Borrower Name or Loan ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:w-96 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Loans</option>
          <option value="active">Active Loans Only</option>
        </select>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading loans...</p>
      ) : loans.length === 0 ? (
        <div className="bg-white p-8 text-center rounded-lg shadow border text-gray-500">
          No loans found.
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-600 text-sm border-b">
              <tr>
                <th className="px-4 py-4">Loan ID</th>
                <th className="px-4 py-4">Borrower</th>
                <th className="px-4 py-4">Loan Amount</th>
                <th className="px-4 py-4">Interest</th>
                <th className="px-4 py-4">Start Date</th>
                <th className="px-4 py-4">Duration</th>
                <th className="px-4 py-4">Monthly EMI</th>
                <th className="px-4 py-4 text-right">Total Repaid</th>
                <th className="px-4 py-4 text-right">Outstanding</th>
                <th className="px-4 py-4">Next Due</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loans.map((loan) => (
                <tr key={loan.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-4 font-mono text-gray-500">
                    {loan.code || "N/A"}
                  </td>
                  <td className="px-4 py-4 font-medium text-gray-800">
                    {loan.investor.name}
                  </td>
                  <td className="px-4 py-4 font-medium text-blue-600">
                    ₹{loan.principalAmount.toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-4 text-gray-500">{loan.interestRate}</td>
                  <td className="px-4 py-4 text-gray-500">
                    {new Date(loan.startDate).toLocaleDateString("en-IN")}
                  </td>
                  <td className="px-4 py-4 text-gray-500">{loan.durationMonths} Months</td>
                  <td className="px-4 py-4 text-gray-800 font-medium">
                    ₹{loan.monthlyInstallment.toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-4 text-right text-green-600 font-medium">
                    ₹{loan.totalRepaid.toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-4 text-right text-red-600 font-bold">
                    ₹{loan.outstandingPrincipal.toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-4 text-gray-500">
                    {loan.nextDueDate 
                      ? new Date(loan.nextDueDate).toLocaleDateString("en-IN") 
                      : "N/A"}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      loan.status === "active" 
                        ? "bg-green-100 text-green-700" 
                        : "bg-gray-200 text-gray-700"
                    }`}>
                      {loan.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button
                      onClick={() => router.push(`/loans/${loan.id}`)}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function LoansPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading loans...</div>}>
      <LoansContent />
    </Suspense>
  );
}
