import { Suspense } from "react";
import { connection } from "next/server"; 
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

async function DashboardContent() {
  await connection();

  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  
  if ((session.user as any).role === "investor") {
    redirect("/investor-portal");
  }

  const [investorCount, loanCount, activeLoans, latestDistributions] = await Promise.all([
    prisma.investor.count(),
    prisma.loan.count(),
    prisma.loan.count({ where: { status: "active" } }),
    prisma.profitDistribution.findMany({
      orderBy: { cycle: { cycleStart: "desc" } },
      take: 10,
      include: { investor: true, cycle: true },
    })
  ]);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            Welcome, {session.user?.name || "Admin"}
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
            {(session.user as any).role?.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* CLICKABLE INVESTOR CARD */}
        <Link href="/investors" className="block transform hover:scale-[1.02] transition-transform">
          <StatCard label="Total Investors" value={investorCount} color="border-blue-500" />
        </Link>
        
        {/* CLICKABLE TOTAL LOANS CARD */}
        <Link href="/loans" className="block transform hover:scale-[1.02] transition-transform">
          <StatCard label="Total Loans" value={loanCount} color="border-green-500" />
        </Link>
        
        {/* CLICKABLE ACTIVE LOANS CARD */}
        <Link href="/loans?status=active" className="block transform hover:scale-[1.02] transition-transform">
          <StatCard label="Active Loans" value={activeLoans} color="border-orange-500" />
        </Link>
      </div>

      {/* RECENT PROFIT TABLE */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-5 border-b bg-gray-50 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-800">Recent Profit Distributions</h2>
          <Link href="/cycles" className="text-sm text-blue-600 hover:underline font-medium">
            View All Cycles
          </Link>
        </div>
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-600 font-medium">
            <tr>
              <th className="px-6 py-4">Investor</th>
              <th className="px-6 py-4">Cycle Month</th>
              <th className="px-6 py-4 text-right">Balance Used</th>
              <th className="px-6 py-4 text-right">Profit Earned</th>
            </tr>
          </thead>
          <tbody>
            {latestDistributions.map((dist) => (
              <tr key={dist.id} className="border-t hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-800">
                  <Link href={`/investors/${dist.investorId}`} className="hover:text-blue-600">
                    {dist.investor.name}
                  </Link>
                </td>
                <td className="px-6 py-4 text-gray-500">
                  {new Date(dist.cycle.cycleStart).toLocaleDateString("en-IN", { month: 'short', year: 'numeric' })}
                </td>
                <td className="px-6 py-4 text-right text-gray-500">
                  ₹{dist.balanceUsed.toLocaleString("en-IN")}
                </td>
                <td className="px-6 py-4 text-right font-bold text-green-600">
                  +₹{dist.shareAmount.toLocaleString("en-IN")}
                </td>
              </tr>
            ))}
            {latestDistributions.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                  No profit has been distributed yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  );
}

function StatCard({ label, value, color }: { label: string; value: number, color: string }) {
  return (
    <div className={`bg-white p-6 rounded-lg shadow-sm border-t-4 ${color} cursor-pointer`}>
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="text-4xl font-bold mt-2 text-gray-800">{value}</p>
    </div>
  );
}
