"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function ActiveLoanPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/investor-portal")
      .then((res) => res.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center mt-20">Loading...</div>;
  if (!data) return <div className="p-8 text-center mt-20">Data not found</div>;

  const activeLoans = data.loans.filter((l: any) => l.status === "active");

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <Link href="/investor-portal" className="text-blue-600 hover:underline mb-4 inline-block">
        &larr; Back to Dashboard
      </Link>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Active Loan Details</h1>

      {activeLoans.length === 0 ? (
        <div className="bg-white p-8 text-center rounded-lg shadow border text-gray-500">
          You have no active loans at the moment.
        </div>
      ) : (
        <div className="space-y-8">
          {activeLoans.map((loan: any) => {
            const pendingSchedules = loan.schedule.filter((s: any) => s.status === "pending");
            const outstanding = pendingSchedules.length > 0 ? pendingSchedules[0].openingPrincipal : 0;
            const paidSchedules = loan.schedule.filter((s: any) => s.status === "paid");
            
            return (
              <div key={loan.id} className="bg-white rounded-lg shadow border overflow-hidden">
                
                {/* Loan Header */}
                <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">Loan ID: {loan.code || "N/A"}</h2>
                    <p className="text-sm text-gray-500 mt-1">Started on {new Date(loan.startDate).toLocaleDateString("en-IN")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Outstanding Principal</p>
                    <p className="text-2xl font-bold text-red-600">₹{outstanding.toLocaleString("en-IN")}</p>
                  </div>
                </div>

                {/* Loan Summary Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-white border-b">
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold">Total Amount</p>
                    <p className="text-lg font-bold text-gray-800">₹{loan.principalAmount.toLocaleString("en-IN")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold">Interest Rate</p>
                    <p className="text-lg font-bold text-gray-800">{loan.interestRate}% / month</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold">Total Term</p>
                    <p className="text-lg font-bold text-gray-800">{loan.loanTerm} Months</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold">EMI Amount</p>
                    <p className="text-lg font-bold text-gray-800">₹{loan.termAmount.toLocaleString("en-IN")} + Interest</p>
                  </div>
                </div>

                {/* Repayment Schedule Table */}
                <div className="p-6">
                  <h3 className="font-bold text-gray-800 mb-4">Repayment Schedule ({paidSchedules.length} / {loan.loanTerm} Paid)</h3>
                  <table className="w-full text-sm text-left border rounded">
                    <thead className="bg-gray-100 text-gray-600">
                      <tr>
                        <th className="px-4 py-2">Month</th>
                        <th className="px-4 py-2">Due Date</th>
                        <th className="px-4 py-2 text-right">Opening Balance</th>
                        <th className="px-4 py-2 text-right">Interest</th>
                        <th className="px-4 py-2 text-right">Principal</th>
                        <th className="px-4 py-2 text-right">Total EMI</th>
                        <th className="px-4 py-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loan.schedule.map((sch: any) => (
                        <tr key={sch.id} className="border-t">
                          <td className="px-4 py-2 font-medium">{sch.monthNo}</td>
                          <td className="px-4 py-2">{new Date(sch.dueDate).toLocaleDateString("en-IN")}</td>
                          <td className="px-4 py-2 text-right">₹{sch.openingPrincipal.toLocaleString("en-IN")}</td>
                          <td className="px-4 py-2 text-right text-red-500">₹{sch.interestAmount.toLocaleString("en-IN")}</td>
                          <td className="px-4 py-2 text-right text-blue-600">₹{sch.termAmount.toLocaleString("en-IN")}</td>
                          <td className="px-4 py-2 text-right font-bold">₹{(sch.termAmount + sch.interestAmount).toLocaleString("en-IN")}</td>
                          <td className="px-4 py-2 text-center">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${sch.status === "paid" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                              {sch.status.toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
