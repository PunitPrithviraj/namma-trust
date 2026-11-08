import { Suspense } from "react";
import { connection } from "next/server"; 
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import NotificationBar from "./NotificationBar";

// 👈 ADMIN ROUNDING: 0.1 to 0.91 rounds DOWN, 0.92+ rounds UP
function adminRound(amount: number) {
  const integerPart = Math.floor(amount);
  const decimalPart = amount - integerPart;
  
  if (decimalPart > 0 && decimalPart <= 0.9199) {
    return integerPart; // Round down
  }
  if (decimalPart > 0.9199) {
    return integerPart + 1; // Round up
  }
  return integerPart;
}

async function DashboardContent() {
  await connection();

  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  
  if ((session.user as any).role === "investor") {
    redirect("/investor-portal");
  }

  const [investors, loans, currentCycles] = await Promise.all([
    prisma.investor.findMany({ 
      include: { investments: true, withdrawals: true, profitDistributions: true } 
    }),
    prisma.loan.findMany({ 
      where: { status: "active" },
      include: { schedule: { orderBy: { monthNo: "asc" } } }
    }),
    prisma.profitDistribution.findMany({
      where: { cycle: { cycleStart: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } } },
      include: { investor: true, cycle: true },
      orderBy: { cycle: { cycleStart: "desc" } },
    })
  ]);

  const totalTeamRegularInvestment = investors.reduce((sum, inv) => 
    sum + inv.investments.reduce((s, i) => s + i.amount, 0), 0
  );

  const totalTeamProfit = investors.reduce((sum, inv) => 
    sum + inv.profitDistributions.reduce((s, p) => s + p.shareAmount, 0), 0
  );

  const totalWithdrawn = investors.reduce((sum, inv) => 
    sum + inv.withdrawals.reduce((s, w) => s + w.amount, 0), 0
  );

  const totalInvestment = totalTeamRegularInvestment + totalTeamProfit;

  let activeLoanPrincipal = 0;
  loans.forEach((loan) => {
    const pendingSchedules = loan.schedule.filter(s => s.status === "pending");
    if (pendingSchedules.length > 0) {
      activeLoanPrincipal += pendingSchedules[0].openingPrincipal;
    }
  });

  const activeLoanCount = loans.length;

  const rawUnspentAmount = totalInvestment - totalWithdrawn - activeLoanPrincipal;
  const unspentAmount = adminRound(rawUnspentAmount);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const thisMonthDistributions = currentCycles.filter(
    d => new Date(d.cycle.cycleStart).getMonth() === currentMonth && new Date(d.cycle.cycleStart).getFullYear() === currentYear
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* 👈 FIXED HEADER SECTION */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Welcome, {session.user?.name || "Admin"}</h1>
          <p className="text-gray-500 mt-1">Namma Trust Financial Overview</p>
        </div>
        
        <div className="flex items-center gap-4">
          <NotificationBar />
          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
            {(session.user as any).role?.toUpperCase()}
          </span>
        </div>
      </div>

	<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
        <Link href="/dashboard/total-investment" className="block bg-white p-6 rounded-lg shadow-sm border-t-4 border-green-500 hover:scale-[1.02] transition-transform cursor-pointer">
          <p className="text-sm font-medium text-gray-500">Total Investment</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">₹{totalInvestment.toLocaleString("en-IN")}</p>
          <p className="text-xs text-gray-400 mt-2">Includes Accrued Profit</p>
        </Link>

        <div className="bg-white p-6 rounded-lg shadow-sm border-t-4 border-blue-500">
          <p className="text-sm font-medium text-gray-500">Total Team Regular Investment</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">₹{totalTeamRegularInvestment.toLocaleString("en-IN")}</p>
          <p className="text-xs text-gray-400 mt-2">Actual Deposits Only</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border-t-4 border-purple-500">
          <p className="text-sm font-medium text-gray-500">Total Team Profit</p>
          <p className="text-3xl font-bold text-purple-600 mt-2">₹{totalTeamProfit.toLocaleString("en-IN")}</p>
          <p className="text-xs text-gray-400 mt-2">Credited Profit</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border-t-4 border-orange-500">
          <p className="text-sm font-medium text-gray-500 flex items-center gap-1">Unspent Cash</p>
          <p className="text-3xl font-bold text-orange-600 mt-2">₹{unspentAmount.toLocaleString("en-IN")}</p>
          <p className="text-xs text-gray-400 mt-2">Available Funds in Trust</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border-t-4 border-indigo-500">
          <p className="text-sm font-medium text-gray-500">Loan Disbursed (Active)</p>
          <p className="text-3xl font-bold text-indigo-600 mt-2">₹{activeLoanPrincipal.toLocaleString("en-IN")}</p>
          <p className="text-xs text-gray-400 mt-2">Outstanding Principal</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border-t-4 border-gray-500">
          <p className="text-sm font-medium text-gray-500">Active Loans Count</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">{activeLoanCount}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-5 border-b bg-gray-50 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-800">Recent Profit Distributions (This Month)</h2>
          <Link href="/profits" className="text-sm text-blue-600 hover:underline font-medium">
            Manage Cycles
          </Link>
        </div>
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-600 font-medium">
            <tr>
              <th className="px-6 py-4">Investor</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4 text-right">Profit Credited</th>
            </tr>
          </thead>
          <tbody>
            {thisMonthDistributions.map((dist) => (
              <tr key={dist.id} className="border-t hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-800">
                  <Link href={`/investors/${dist.investorId}`} className="hover:text-blue-600">
                    {dist.investor.name}
                  </Link>
                </td>
                <td className="px-6 py-4 text-gray-500">
                  {new Date(dist.cycle.distributedAt || dist.cycle.cycleStart).toLocaleDateString("en-IN")}
                </td>
                <td className="px-6 py-4 text-right font-bold text-green-600">
                  +₹{dist.shareAmount.toLocaleString("en-IN")}
                </td>
              </tr>
            ))}
            {thisMonthDistributions.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                  No profit distributed this month yet.
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
